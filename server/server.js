// Serveur compagnon : sert les pages /display (écran) et /select (PWA téléphone),
// reçoit le choix de vidéo et le pousse vers l'écran via WebSocket de contrôle.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { parseMedia } from './media.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Fichiers statiques -----------------------------------------------------
app.use('/select', express.static(path.join(PUBLIC, 'select')));
app.use('/display', express.static(path.join(PUBLIC, 'display')));
app.use('/shared', express.static(path.join(PUBLIC, 'shared')));

app.get('/', (_req, res) => res.redirect('/display/'));

// Première IPv4 non interne de la machine (l'IP locale du Pi sur le WiFi/LAN).
function lanIp() {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) return a.address;
    }
  }
  return null;
}

// URL de la page de sélection à encoder dans le QR.
// Le QR doit toujours pointer vers l'IP du Pi : si la page écran est ouverte via
// localhost (cas du kiosque), le téléphone ne pourrait pas joindre "localhost".
// On force donc l'IP locale détectée (surchargeable par PUBLIC_HOST).
function selectUrl(req) {
  const port = config.port;
  let host = process.env.PUBLIC_HOST || lanIp();
  if (!host) {
    // Dernier recours : l'hôte de la requête (sauf si c'est localhost).
    const reqHost = (req.headers.host || '').split(':')[0];
    host = /^(localhost|127\.|::1)/.test(reqHost) ? 'localhost' : reqHost;
  }
  return `https://${host}:${port}/select/`;
}

// --- Télécharger l'autorité de certification mkcert depuis le téléphone ------
// Permet d'installer la CA sur Android pour que le site soit "de confiance"
// (requis pour installer la PWA et utiliser "Partager → Rameur").
app.get('/ca.crt', (_req, res) => {
  let caPath;
  try {
    const root = execSync('mkcert -CAROOT', { encoding: 'utf8' }).trim();
    caPath = path.join(root, 'rootCA.pem');
  } catch {
    caPath = null;
  }
  if (!caPath || !fs.existsSync(caPath)) {
    return res
      .status(404)
      .type('text')
      .send("CA mkcert introuvable. Sur le Pi : installe mkcert puis relance scripts/make-cert.sh.");
  }
  res.setHeader('Content-Type', 'application/x-x509-ca-cert');
  res.setHeader('Content-Disposition', 'attachment; filename="rameur-ca.crt"');
  fs.createReadStream(caPath).pipe(res);
});

// --- Config exposée à l'écran (URL du WS ORM + mapping métriques) ------------
app.get('/api/config', (_req, res) => {
  res.json({ ormWsUrl: config.ormWsUrl, metricsMap: config.metricsMap });
});

// --- QR code ----------------------------------------------------------------
// Renvoie un PNG encodant l'URL de la page /select (à scanner depuis le tel).
app.get('/api/qr', async (req, res) => {
  try {
    const png = await QRCode.toBuffer(selectUrl(req), { width: 600, margin: 2 });
    res.type('png').send(png);
  } catch (err) {
    res.status(500).send(String(err));
  }
});

// --- Lancer une vidéo -------------------------------------------------------
// La PWA appelle ça avec l'URL partagée/collée. On valide, on calcule l'embed,
// puis on diffuse l'ordre à l'écran (clients WebSocket de contrôle).
app.post('/api/play', (req, res) => {
  const raw = (req.body && req.body.url) || '';
  const media = parseMedia(raw);
  if (!media) {
    return res.status(400).json({ ok: false, error: 'URL non reconnue (YouTube ou ARTE attendu).' });
  }
  broadcast({ type: 'play', ...media });
  res.json({ ok: true, media });
});

// Revenir à l'écran QR.
app.post('/api/stop', (_req, res) => {
  broadcast({ type: 'stop' });
  res.json({ ok: true });
});

// --- HTTPS + WebSocket ------------------------------------------------------
let server;
try {
  const credentials = {
    key: fs.readFileSync(config.tls.key),
    cert: fs.readFileSync(config.tls.cert),
  };
  server = https.createServer(credentials, app);
} catch (err) {
  console.error('\n❌ Certificat TLS introuvable. Lance d\'abord scripts/make-cert.sh');
  console.error(`   (clé: ${config.tls.key}, cert: ${config.tls.cert})\n`);
  process.exit(1);
}

// Deux canaux WebSocket sur le même serveur, routés par chemin :
//  - /control : l'écran reçoit les ordres play/stop.
//  - /orm     : relais sécurisé (wss) des métriques d'OpenRowingMonitor.
const controlWss = new WebSocketServer({ noServer: true });
const ormWss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, 'https://localhost');
  if (pathname === '/control') {
    controlWss.handleUpgrade(req, socket, head, (ws) => controlWss.emit('connection', ws, req));
  } else if (pathname === '/orm') {
    ormWss.handleUpgrade(req, socket, head, (ws) => ormWss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

controlWss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'hello' }));
});

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of controlWss.clients) {
    if (client.readyState === 1) client.send(data);
  }
}

// Relais ORM : chaque écran connecté ouvre une connexion vers ORM (ws:// local)
// et reçoit les messages re-servis en wss:// (même origine, pas de contenu mixte).
// Tentatives de reconnexion automatique si ORM redémarre.
ormWss.on('connection', (client) => {
  let upstream = null;
  let reconnectTimer = null;
  let closed = false;

  function connectOrm() {
    if (closed) return;
    try {
      upstream = new WebSocket(config.ormWsUrl);
    } catch (err) {
      console.error(`ORM WS connection failed (${config.ormWsUrl}): ${err.message}`);
      reconnectTimer = setTimeout(connectOrm, 3000);
      return;
    }
    upstream.on('open', () => {
      console.log(`ORM connected via ${config.ormWsUrl}`);
    });
    upstream.on('message', (data) => {
      if (client.readyState === 1) client.send(data.toString());
    });
    upstream.on('error', (err) => {
      console.error(`ORM WS error: ${err.message || err}`);
    });
    upstream.on('close', () => {
      console.log('ORM disconnected — reconnecting in 3s…');
      upstream = null;
      if (!closed) reconnectTimer = setTimeout(connectOrm, 3000);
    });
  }

  connectOrm();

  client.on('close', () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (upstream) try { upstream.close(); } catch {}
  });
});

server.listen(config.port, () => {
  console.log(`✅ rameur-overlay sur https://localhost:${config.port}`);
  console.log(`   Écran  : https://localhost:${config.port}/display/`);
  console.log(`   Tel    : https://<ip-du-pi>:${config.port}/select/`);
});
