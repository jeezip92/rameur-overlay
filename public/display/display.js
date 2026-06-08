// Page écran : reçoit les ordres de lecture (WS de contrôle) et affiche les
// métriques d'OpenRowingMonitor en direct (WS de métriques).

const idle = document.getElementById('idle');
const active = document.getElementById('active');
const player = document.getElementById('player');

// La config est injectée côté serveur ? Non : on la récupère via /api/config
// pour connaître l'URL du WS ORM et le mapping. Plus simple : valeurs ci-dessous
// alignées sur config.js (à garder synchronisées) ou exposées par une route.
let CONFIG = null;

async function loadConfig() {
  try {
    const r = await fetch('/api/config');
    CONFIG = await r.json();
  } catch {
    CONFIG = { ormWsUrl: 'ws://localhost:8080/', metricsMap: {} };
  }
}

// ---------- WebSocket de contrôle (ordres play/stop) ----------
function connectControl() {
  const ws = new WebSocket(`wss://${location.host}/control`);
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.type === 'play' && msg.embedUrl) showVideo(msg.embedUrl);
    else if (msg.type === 'stop') showIdle();
  };
  ws.onclose = () => setTimeout(connectControl, 2000); // reconnexion auto
}

function showVideo(embedUrl) {
  player.src = embedUrl;
  idle.classList.add('hidden');
  active.classList.remove('hidden');
}
function showIdle() {
  player.src = 'about:blank';
  active.classList.add('hidden');
  idle.classList.remove('hidden');
}

// ---------- Métriques ORM (via le relais sécurisé /orm du serveur) ----------
function connectMetrics() {
  const ws = new WebSocket(`wss://${location.host}/orm`);
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    // ORM envoie {type:"metrics",data:{…}} (et d'autres types qu'on ignore).
    if (msg.type === 'metrics' && msg.data) updateMetrics(msg.data);
  };
  ws.onclose = () => setTimeout(connectMetrics, 3000);
  ws.onerror = () => ws.close();
}

function updateMetrics(m) {
  const map = CONFIG.metricsMap || {};
  for (const [slot, key] of Object.entries(map)) {
    const el = document.querySelector(`[data-metric="${slot}"]`);
    if (!el || m[key] === undefined || m[key] === null) continue;
    el.textContent = format(slot, m[key]);
  }
}

// Mise en forme par type de métrique.
function format(slot, v) {
  if (slot === 'split' || slot === 'time') {
    // valeur en secondes -> m:ss
    const s = Number(v);
    if (!Number.isFinite(s)) return v;
    const mm = Math.floor(s / 60);
    const ss = Math.round(s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }
  if (slot === 'distance') return `${Math.round(Number(v))} m`;
  if (typeof v === 'number') return Number.isInteger(v) ? v : v.toFixed(1);
  return v;
}

// ---------- Démarrage ----------
(async function init() {
  await loadConfig();
  connectControl();
  connectMetrics();
})();
