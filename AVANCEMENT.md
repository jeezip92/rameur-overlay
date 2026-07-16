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

**Phase : déployé et fonctionnel sur le Pi. Reste à finir la CALIBRATION ORM
(calories + nombre d'aimants).**

Décisions d'architecture arrêtées :
- App **séparée** à côté d'ORM (on ne modifie pas ORM ; on lit juste son WebSocket).
- Rendu **Chromium kiosque** (labwc/Wayland) ; lien vidéo via iframe YouTube/ARTE.
- Partage : **Web Share Target** marche **seulement via Chrome** (qui crée un WebAPK) ;
  **Vivaldi ne peut pas** → on utilise le bouton **« Coller et lancer »** (presse-papier).

Ce qui est **fait et fonctionnel sur le Pi** (user `emat`, IP `192.168.1.108`) :
- [x] Serveur HTTPS + WebSocket de contrôle + reconnaissance liens YouTube/ARTE.
- [x] Page écran (QR ↔ équerre vidéo) + PWA téléphone (boutons + « Coller et lancer »).
- [x] **Démarrage auto** : service systemd `rameur-overlay` + kiosque Chromium plein écran
      via `~/.config/labwc/autostart` (ligne `bash ~/rameur-overlay/scripts/kiosk.sh &`).
      `kiosk.sh` gère Wayland + `--password-store=basic` (pas d'invite trousseau).
- [x] **Certif** mkcert + CA installée sur le tel Android (route `/ca.crt`).
- [x] **Métriques ORM branchées** via relais sécurisé `/orm` (wss) → l'allure, la cadence,
      la puissance, la distance, le temps, les coups s'affichent et sont **réalistes**.
- [x] Dépôt GitHub `jeezip92/rameur-overlay` (le repasser en **privé** quand fini).

---

## ⏳ Prochaine étape (POINT DE REPRISE) — finir la calibration ORM

Le rameur est un **Sportstech WRX700**. Config ORM : `/opt/openrowingmonitor/config/config.js`
(sauvegarde `.bak` existante). Profil officiel : `rowerProfiles.js → Sportstech_WRX700`
(`numOfImpulsesPerRevolution: 2`, `flywheelInertia: 0.72`, `dragFactor: 32000`).

Acquis : les **surcharges aberrantes** d'origine (inertie/drag ÷2, timings desserrés) ont
été retirées → puissance ~95 W, allure ~2:35/500m, drag ~29000, SPM ~19 = **réalistes**.

Restent **2 problèmes** :

1. **Nombre d'aimants (probablement 2, pas 1).** Distance et nombre de coups ~2× trop
   élevés ; l'utilisateur observe « ORM voit 2 coups sur 3 » → symptôme du mauvais compte
   d'impulsions. → Tester le **profil complet** (`numOfImpulsesPerRevolution: 2`), puis
   **test précis** : ramer **exactement 10 coups** et comparer au compte détecté par ORM.
   *(Config « 2 aimants » déjà fournie à l'utilisateur ; à appliquer/valider.)*

2. **Calories désormais calculées côté client.** `totalCalories`/`interval.calories.*` d'ORM sont aberrants (×10⁵, car `totalWork` est faux sur le WRX700). → `display.js` utilise la **formule Concept2 PM5** à partir de `cyclePower` (la puissance instantanée, qui elle est réaliste ~95W) : `Cal/h = (P + 0.35 × P³/300²) × 4.0`. Résultat : ~3 Cal pour 6 coups (vs 178 125 avec ORM).

**Pour capturer le flux ORM** (depuis un PC du réseau, sans déranger l'utilisateur) :
connexion `new WebSocket('ws://192.168.1.108/websocket')`, messages `{type:"metrics",data}`.
Redémarrer ORM après modif config : `sudo systemctl restart openrowingmonitor`.

---

## 🔜 Améliorations optionnelles (après la calibration)

1. **Régler l'épaisseur des barres** de l'équerre (variables `--left-width` /
   `--bottom-height` dans `public/display/display.css`).
2. **uBlock Origin** dans le profil kiosque (`~/.config/rameur-kiosk`) — anti-pub YouTube.
3. Vérifier le cas **ARTE** (géo-restriction FR/DE, programmes parfois non intégrables).
4. Bouton **« stop / revenir au QR »** depuis le téléphone (`POST /api/stop` existe déjà
   côté serveur, reste à l'exposer dans la PWA).
5. Envisager de **masquer le DRAG** de l'affichage (chiffre ~29000 peu parlant pour l'user).

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
