// Service worker minimal : présence requise pour l'installabilité de la PWA
// (et donc pour que "Partager → Rameur" apparaisse sur Android).
// Pas de cache offline volontairement : on dépend du réseau local de toute façon.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* passthrough réseau */ });
