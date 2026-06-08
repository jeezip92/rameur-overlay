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
  // WebSocket de métriques d'OpenRowingMonitor.
  // ⚠️ À CONFIRMER sur ton install : ouvre l'écran ORM > DevTools > Réseau >
  //    filtre "WS" et regarde l'URL réelle + le format des messages JSON.
  //    ORM tourne en général sur le même Pi (localhost) sur le port 80 ou 8080.
  // ----------------------------------------------------------------------
  ormWsUrl: process.env.ORM_WS_URL || 'ws://localhost:8080/',

  // Correspondance entre les champs du JSON ORM et nos libellés d'affichage.
  // ⚠️ Ajuste les CLÉS (à droite) selon le vrai message capturé.
  // Le format ci-dessous reprend des noms fréquents d'ORM — à vérifier.
  metricsMap: {
    split:     'cyclePace',          // allure /500m (secondes ou "m:ss")
    spm:       'cycleStrokeRate',    // cadence (coups/min)
    distance:  'totalLinearDistance',// distance (m)
    time:      'totalMovingTime',    // temps d'effort (s)
    power:     'cyclePower',         // puissance (W)
    heartRate: 'heartrate',          // fréquence cardiaque (bpm)
    strokes:   'totalNumberOfStrokes',// nb de coups
    calories:  'totalCalories',      // calories
    drag:      'dragFactor',         // facteur de résistance
  },
};
