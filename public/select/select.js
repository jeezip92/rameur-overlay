// PWA téléphone : envoie au Pi le lien partagé (Web Share Target) ou collé.

const home = document.getElementById('home');
const result = document.getElementById('result');
const resultMsg = document.getElementById('result-msg');

// Enregistre le service worker (requis pour l'installation PWA + share target).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/select/sw.js').catch(() => {});
}

// Conseil d'installation tant que l'app n'est pas en mode "standalone".
const installed = window.matchMedia('(display-mode: standalone)').matches;
if (!installed) document.getElementById('install-tip').hidden = false;

// --- 1) Partage natif Android : la cible arrive en query (?url=… ou ?text=…) ---
const params = new URLSearchParams(location.search);
const sharedUrl = params.get('url') || params.get('text') || '';
if (sharedUrl) {
  // Nettoie l'URL de la barre d'adresse pour éviter un renvoi au rechargement.
  history.replaceState(null, '', '/select/');
  play(sharedUrl);
}

// --- 2) Fallback : formulaire "coller un lien" ---
document.getElementById('paste-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = document.getElementById('paste-input').value.trim();
  if (v) play(v);
});

document.getElementById('back-btn').addEventListener('click', () => {
  result.hidden = true;
  home.hidden = false;
});

// --- Envoi au serveur ---
async function play(url) {
  try {
    const r = await fetch('/api/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await r.json();
    if (data.ok) {
      showResult(`✅ Lecture lancée sur le rameur (${data.media.source}).`);
    } else {
      showResult(`⚠️ ${data.error || 'Lien non reconnu.'}`);
    }
  } catch {
    showResult('❌ Impossible de joindre le rameur. Même WiFi ?');
  }
}

function showResult(msg) {
  resultMsg.textContent = msg;
  home.hidden = true;
  result.hidden = false;
}
