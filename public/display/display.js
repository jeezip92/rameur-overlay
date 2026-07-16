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
    CONFIG = { ormWsUrl: 'ws://localhost/websocket', metricsMap: {} };
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

// Résout une clé éventuellement imbriquée, ex: "interval.calories.sinceStart".
function getField(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function updateMetrics(m) {
  const map = CONFIG.metricsMap || {};
  for (const [slot, key] of Object.entries(map)) {
    // Calories : on les calcule nous-mêmes à partir de la puissance (ORM les donne faux)
    if (slot === 'calories') continue;
    const el = document.querySelector(`[data-metric="${slot}"]`);
    if (!el) continue;
    const val = getField(m, key);
    if (val === undefined || val === null) continue;
    el.textContent = format(slot, val);
  }
  // Calcul des calories depuis la puissance (formule Concept2)
  // ORM donne des calories aberrantes sur le WRX700 (profil incomplet)
  updateCalories(m);
}

// --- Calcul des calories à partir de la puissance (contourne le bug ORM) ---
// Les calories ORM sont aberrantes sur le WRX700 (totalWork ×10⁵).
// Formule Concept2 PM5 : Cal/h = (P + 0.35 × P³/300²) × 4.0
// (P = puissance en Watts, résultat en kcal/h — inclut le métabolisme de repos)
let lastCalUpdate = 0;
let computedCalories = 0;

function updateCalories(m) {
  const power = m.cyclePower || m.instantPower || 0;
  const movingTime = m.totalMovingTime || 0;
  if (power <= 0 || movingTime <= 0) return;

  const dt = movingTime - lastCalUpdate;
  lastCalUpdate = movingTime;

  // dt doit être petit (< 5s) et positif pour éviter les sauts
  if (dt <= 0 || dt > 5) return;

  // Cal/h = (P + 0.35 × P³ / 300²) × 4.0
  const calPerHour = (power + 0.35 * Math.pow(power, 3) / 90000) * 4.0;
  computedCalories += calPerHour * dt / 3600;

  const el = document.querySelector('[data-metric="calories"]');
  if (el) el.textContent = Math.round(computedCalories);
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
