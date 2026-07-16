// Configuration centrale du projet rameur-overlay.
// Toutes les valeurs sont surchargeables par variable d'environnement.

export const config = {
  // Port HTTPS du serveur compagnon. La PWA exige du HTTPS (contexte sécurisé).
  port: Number(process.env.PORT) || 8443,

  // Chemins des certificats TLS (voir scripts/make-cert.sh).
  tls: {
    key: process.env.TLS_KEY || './certs/key.pem',
    cert: process.env.TLS_CERT || './certs/cert.pem',
  },

  // ----------------------------------------------------------------------
  // WebSocket de métriques d'OpenRowingMonitor (confirmé : ORM sert son flux
  // sur le port 80, chemin /websocket). Le serveur s'y connecte en local et
  // relaie vers l'écran en wss:// (voir /orm dans server.js).
  // ----------------------------------------------------------------------
  ormWsUrl: process.env.ORM_WS_URL || 'ws://localhost/websocket',

  // Correspondance entre les champs du JSON ORM (message {type:"metrics",data})
  // et nos libellés d'affichage. Noms confirmés depuis le flux réel.
  metricsMap: {
    split:     'cyclePace',          // allure /500m (secondes -> m:ss)
    spm:       'cycleStrokeRate',    // cadence (coups/min)
    distance:  'totalLinearDistance',// distance (m)
    time:      'totalMovingTime',    // temps d'effort (s)
    power:     'cyclePower',         // puissance (W)
    heartRate: 'heartRate',          // fréquence cardiaque (bpm)
    strokes:   'totalNumberOfStrokes',// nb de coups
    calories:  'interval.calories.sinceStart', // calories — NB: sur WRX700 ce champ est aberrant (×10⁵) ; display.js les recalcule depuis la puissance (formule Concept2)
    drag:      'dragFactor',         // facteur de résistance
  },
};
