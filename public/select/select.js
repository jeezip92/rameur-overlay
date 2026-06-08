// PWA téléphone : envoie au Pi le lien partagé (Web Share Target) ou collé.

const home = document.getElementById('home');
const result = document.getElementById('result');
const resultMsg = document.getElementById('result-msg');

// Enregistre le service worker (requis pour l'installation PWA + share target).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/select/sw.js').catch(() => {});
}

// --- 1) Partage natif Android (Chrome/Samsung) : arrive en query (?url=/?text=) ---
const params = new URLSearchParams(location.search);
const sharedUrl = params.get('url') || params.get('text') || '';
if (sharedUrl) {
  // Nettoie l'URL de la barre d'adresse pour éviter un renvoi au rechargement.
  history.replaceState(null, '', '/select/');
  play(sharedUrl);
}

// --- 2) Bouton "Coller et lancer" : lit le presse-papier en un tap ---
const clipBtn = document.getElementById('clip-btn');
const clipHint = document.getElementById('clip-hint');
clipBtn.addEventListener('click', async () => {
  // navigator.clipboard exige un contexte sécurisé (cadenas). Sinon -> fallback champ.
  if (navigator.clipboard && navigator.clipboard.readText) {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) return play(text);
      return hint('Presse-papier vide — copie d\'abord le lien de la vidéo.');
    } catch {
      // permission refusée ou contexte non sécurisé
    }
  }
  // Fallback : on met le focus sur le champ manuel.
  document.getElementById('paste-input').focus();
  hint('Colle le lien dans le champ ci-dessous, puis « Lancer ».');
});

function hint(msg) {
  clipHint.textContent = msg;
  clipHint.hidden = false;
}

// --- 3) Champ "coller à la main" ---
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
