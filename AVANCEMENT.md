# 📌 Avancement & reprise

> Fichier de passation : permet de reprendre le projet exactement là où on s'est
> arrêté, même dans une nouvelle session. **À mettre à jour à chaque étape franchie.**

---

## 🎯 Objectif du projet

Sur un rameur équipé d'un **Raspberry Pi 4 + écran** faisant tourner
**OpenRowingMonitor (ORM)** : au démarrage, afficher un **QR code** ; l'utilisateur
le scanne avec son téléphone, choisit une vidéo **YouTube** ou **ARTE**, et celle-ci
se lance sur l'écran au **centre**, entourée d'une **équerre** de deux barres (gauche
+ bas) qui affichent en direct les **métriques ORM**.

---

## ✅ État actuel — `2026-06-08`

**Phase : code échafaudé et poussé. En attente de test sur le matériel.**

Décisions d'architecture arrêtées :
- App **séparée** à côté d'ORM (on ne modifie pas ORM ; on lit juste son WebSocket).
- Rendu **Chromium kiosque + uBlock Origin** (tout dans le navigateur, iframe vidéo).
- Renvoi du choix via **Partage natif PWA** (Web Share Target) → impose **HTTPS**.
  - Téléphone cible : **Android** (le partage natif n'existe pas sur iOS → fallback
    « coller un lien » prévu malgré tout).

Ce qui est **fait et fonctionnel** (testé en local hors Pi) :
- [x] Serveur HTTPS + WebSocket de contrôle (`server/server.js`).
- [x] Reconnaissance des liens YouTube/ARTE → URL d'embed (`server/media.js`) — **testé** ✓.
- [x] Page écran : QR au repos + bascule équerre en lecture (`public/display/`).
- [x] PWA téléphone : boutons YouTube/ARTE, partage natif, fallback coller (`public/select/`).
- [x] Scripts Pi : `make-cert.sh` (HTTPS), `make-icons.sh`, `kiosk.sh`.
- [x] Service systemd, README de déploiement détaillé, licence MIT.
- [x] Dépôt GitHub **privé** : `jeezip92/rameur-overlay`.

---

## ⏳ Prochaine étape (POINT DE REPRISE)

**👉 Brancher les vraies métriques d'OpenRowingMonitor.** C'est le seul élément qui
empêche la solution d'être pleinement opérationnelle.

Ce qu'il faut récupérer sur le Pi, une fois rentré :
1. Ouvrir l'écran ORM dans un navigateur → **F12** → onglet **Réseau** → filtre **WS**.
2. Cliquer la connexion WebSocket → onglet **Messages** → copier **un message JSON**.
3. Noter aussi l'**URL exacte** du WebSocket (souvent `ws://localhost:8080/`).

Puis reporter dans **`config.js`** :
- `ormWsUrl` → l'URL réelle,
- `metricsMap` → faire correspondre chaque entrée (`split`, `spm`, `distance`,
  `time`, `power`, `heartRate`, `strokes`, `calories`, `drag`) au **vrai nom de champ**
  trouvé dans le JSON. *(Les valeurs actuelles sont une hypothèse à corriger.)*

Si la mise en forme diffère (ex. l'allure est déjà une chaîne `m:ss`, ou la distance
en cm), ajuster la fonction `format()` dans `public/display/display.js`.

---

## 🔜 Après ça (ordre suggéré)

1. **Tester le flux complet** sur le Pi : QR → install PWA Android → Partager →
   vidéo + métriques en direct.
2. **Régler l'épaisseur des barres** de l'équerre selon l'écran réel
   (variables `--left-width` / `--bottom-height` dans `public/display/display.css`).
3. **Installer uBlock Origin** dans le profil kiosque (anti-pub YouTube — voir README §7).
4. **Activer les démarrages auto** : service systemd + `kiosk.sh` dans l'autostart.
5. Vérifier le cas **ARTE** (géo-restriction FR/DE, programmes parfois non intégrables).
6. (Optionnel) Bouton « stop / revenir au QR » accessible depuis le téléphone
   (`POST /api/stop` existe déjà côté serveur, reste à exposer dans la PWA).

---

## 🧠 Pièges déjà identifiés (pour ne pas y retomber)

- **HTTPS obligatoire** : sans contexte sécurisé, pas de service worker → pas
  d'installation PWA → pas de « Partager → Rameur ». D'où `make-cert.sh`.
- Sur `http://IP-locale`, les API presse-papiers/PWA sont **bloquées** par le
  navigateur → c'est pour ça qu'on est passé en HTTPS plutôt qu'en collage auto.
- **Web Share Target = Android seulement.** iOS → champ « coller un lien ».
- Scripts `.sh` : fins de ligne **LF** forcées via `.gitattributes` (sinon ils
  cassent sur le Pi).
- Le QR encode l'URL calculée depuis l'hôte de la requête → le Pi doit être joint
  par son **IP locale**, et le téléphone sur le **même WiFi**.

---

## 📂 Repères de code

| Besoin | Fichier |
|---|---|
| Changer port / WS ORM / mapping métriques | `config.js` |
| Logique serveur (QR, play/stop, diffusion WS) | `server/server.js` |
| Ajouter une plateforme ou corriger un parsing d'URL | `server/media.js` |
| Mise en forme/affichage des métriques | `public/display/display.js` |
| Apparence de l'équerre | `public/display/display.css` |
| Comportement de l'appli téléphone | `public/select/select.js` |
