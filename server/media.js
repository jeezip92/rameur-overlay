// Reconnaissance des liens YouTube / ARTE et calcul de l'URL d'embed (iframe).

// Extrait l'identifiant d'une vidéo YouTube depuis ses différentes formes d'URL.
function youtubeId(u) {
  // youtu.be/<id>
  let m = u.pathname.match(/^\/([\w-]{11})$/);
  if (m && /youtu\.be$/.test(u.hostname)) return m[1];
  // youtube.com/watch?v=<id>
  if (u.searchParams.get('v')) return u.searchParams.get('v');
  // /shorts/<id>, /live/<id>, /embed/<id>
  m = u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})/);
  if (m) return m[1];
  return null;
}

// Extrait l'identifiant de programme ARTE (ex: 123456-000-A) et la langue.
function arteInfo(u) {
  // .../fr/videos/123456-000-A/titre/  ou  .../de/videos/...
  const lang = (u.pathname.match(/^\/(fr|de|en|es|pl|it)\//) || [, 'fr'])[1];
  const m = u.pathname.match(/\/videos\/([0-9]{6}-[0-9]{3}-[A-Z])/);
  return m ? { id: m[1], lang } : null;
}

// Renvoie { source, id, title, embedUrl } ou null si non reconnu.
export function parseMedia(raw) {
  let u;
  try {
    // Tolère un lien noyé dans un texte de partage.
    const found = String(raw).match(/https?:\/\/\S+/);
    u = new URL(found ? found[0] : raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');

  if (/(^|\.)youtube\.com$/.test(host) || host === 'youtu.be' || host === 'm.youtube.com') {
    const id = youtubeId(u);
    if (!id) return null;
    const embedUrl =
      `https://www.youtube-nocookie.com/embed/${id}` +
      `?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    return { source: 'youtube', id, embedUrl };
  }

  if (/(^|\.)arte\.tv$/.test(host)) {
    const info = arteInfo(u);
    if (!info) return null;
    const embedUrl =
      `https://www.arte.tv/embeds/${info.lang}/${info.id}` +
      `?autoplay=1&mute=0`;
    return { source: 'arte', id: info.id, embedUrl };
  }

  return null;
}
