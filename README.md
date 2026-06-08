# 🚣 rameur-overlay

Regarde **YouTube** ou **ARTE** pendant ta séance de rameur, **sans masquer tes
performances**. La vidéo s'affiche au centre de l'écran, entourée d'une **équerre**
de deux barres qui affichent en direct les métriques d'[OpenRowingMonitor](https://github.com/JaapvanEkris/openrowingmonitor)
(allure, cadence, puissance, fréquence cardiaque…).

Le choix de la vidéo se fait **depuis ton téléphone** : à l'allumage du rameur, un
**QR code** s'affiche ; tu le scannes, tu navigues sur YouTube/ARTE, et tu envoies
la vidéo à l'écran d'un simple **Partager → Rameur**.

```
┌────────┬─────────────────────────────┐
│ /500m  │                             │
│  SPM   │                             │
│        │        VIDÉO (centre)       │
│ dist.  │                             │
│ temps  ├─────────────────────────────┤
│        │  puissance · FC · coups · …  │
└────────┴─────────────────────────────┘
   barre gauche          barre basse
   (toute la hauteur)    (sous la vidéo)
```

---

## 🧭 Comment ça marche

1. **Au démarrage du Pi**, l'écran (Chromium en plein écran) ouvre la page `/display`
   qui affiche un **QR code**.
2. Le QR encode l'adresse `https://<ip-du-pi>:8443/select/`. Ton téléphone (Android,
   **sur le même WiFi**) l'ouvre.
3. Tu **installes la page comme application** (« Ajouter à l'écran d'accueil ») — une
   seule fois. C'est ce qui fait apparaître « Rameur » dans le menu *Partager*.
4. Tu ouvres l'appli YouTube ou ARTE, tu trouves ta vidéo, puis **Partager → Rameur**.
   *(Pas envie d'installer ? Un champ « coller un lien » fait le même travail.)*
5. Le lien part vers le Pi → l'écran bascule : la vidéo se lance, entourée des
   **métriques en direct** d'OpenRowingMonitor.

---

## 🧱 Prérequis

| Élément | Détail |
|---|---|
| **Raspberry Pi 4** | Avec un écran branché et l'environnement graphique (le bureau Raspberry Pi OS). |
| **OpenRowingMonitor** | Déjà installé et fonctionnel sur le Pi (tu l'as). |
| **Node.js ≥ 18** | `node -v` pour vérifier. Sinon : `sudo apt install nodejs npm`. |
| **Téléphone Android** | Sur le **même réseau WiFi** que le Pi. *(iPhone : voir « Limites ».)* |
| Outils d'install | `git`, `imagemagick` (icônes), et `mkcert` **ou** `openssl` (HTTPS). |

> ℹ️ **Pourquoi du HTTPS ?** Pour que ton téléphone puisse « partager » vers la page,
> celle-ci doit être une *PWA*, ce qui impose une connexion sécurisée (HTTPS). Le
> script `make-cert.sh` s'en occupe — tu n'as rien à acheter.

---

## 🚀 Installation sur le Pi (pas à pas)

```bash
# 1) Récupérer le projet
git clone https://github.com/jeezip92/rameur-overlay.git
cd rameur-overlay

# 2) Installer les dépendances Node
npm install

# 3) Générer les icônes de l'app + le certificat HTTPS
sudo apt install -y imagemagick           # si besoin
bash scripts/make-icons.sh
bash scripts/make-cert.sh                  # crée certs/ (mkcert recommandé)

# 4) Lancer le serveur
npm start
#   Écran    → https://localhost:8443/display/
#   Téléphone → https://<ip-du-pi>:8443/select/   (l'IP est dans le QR code)
```

À ce stade, ouvre `https://localhost:8443/display/` sur le Pi : tu dois voir le QR code.

### 5) Démarrage automatique du serveur (au boot)

```bash
sudo cp systemd/rameur-overlay.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rameur-overlay
sudo systemctl status rameur-overlay        # vérifier que c'est actif
```

> Adapte `User=` et `WorkingDirectory=` dans le fichier `.service` si ton utilisateur
> n'est pas `pi` ou si le projet n'est pas dans `/home/pi/rameur-overlay`.

### 6) Écran en plein écran au démarrage (kiosque)

Teste d'abord à la main :

```bash
bash scripts/kiosk.sh
```

Puis, pour le lancer automatiquement à l'ouverture de session, ajoute la ligne
suivante à `~/.config/lxsession/LXDE-pi/autostart` (ou crée un raccourci dans
`~/.config/autostart/`) :

```
@bash /home/pi/rameur-overlay/scripts/kiosk.sh
```

### 7) Bloquer les pubs YouTube (uBlock Origin)

`kiosk.sh` utilise un profil Chromium dédié (`~/.config/rameur-kiosk`). Pour y
installer uBlock Origin :

1. Lance Chromium avec ce profil **sans** kiosque :
   `chromium-browser --user-data-dir="$HOME/.config/rameur-kiosk"`
2. Installe **uBlock Origin** depuis le Chrome Web Store.
3. Ferme, puis relance `scripts/kiosk.sh`.

---

## ⚙️ Étape importante : brancher les vraies métriques ORM

Le fichier **`config.js`** contient l'adresse du flux de métriques d'OpenRowingMonitor
et la correspondance entre ses champs et l'affichage. Les valeurs par défaut sont une
**hypothèse** — il faut les vérifier sur ton install :

1. Sur le Pi, ouvre l'écran ORM dans un navigateur.
2. Ouvre les outils développeur (**F12**) → onglet **Réseau** → filtre **WS**.
3. Clique sur la connexion WebSocket → onglet **Messages** → copie un message JSON.
4. Reporte dans `config.js` :
   - `ormWsUrl` : l'URL exacte du WebSocket (souvent `ws://localhost:8080/`),
   - `metricsMap` : fais correspondre chaque ligne (`split`, `spm`, …) au **vrai nom
     de champ** vu dans le JSON.

Redémarre ensuite le service : `sudo systemctl restart rameur-overlay`.

---

## 🗂️ Structure du projet

| Élément | Fichier |
|---|---|
| Configuration (port, WS ORM, mapping métriques) | `config.js` |
| Serveur HTTPS + WebSocket de contrôle + API | `server/server.js` |
| Reconnaissance des liens YouTube / ARTE | `server/media.js` |
| Page écran (QR code + équerre) | `public/display/` |
| Appli téléphone (boutons + partage natif) | `public/select/` |
| Scripts de déploiement (certif, icônes, kiosque) | `scripts/` |
| Service systemd | `systemd/rameur-overlay.service` |

---

## 🩹 Dépannage

| Symptôme | Piste |
|---|---|
| Le téléphone n'ouvre pas la page | Vérifie qu'il est sur le **même WiFi** ; accepte l'avertissement de certificat. |
| « Rameur » n'apparaît pas dans *Partager* | L'appli doit être **installée** (Ajouter à l'écran d'accueil) sur **Android**. |
| Les barres restent à `--` | Mapping/URL ORM à corriger dans `config.js` (voir section dédiée). |
| La vidéo ne démarre pas en son | Le flag `--autoplay-policy` de `kiosk.sh` doit être actif ; relance via le script. |
| Pub YouTube | Installe uBlock Origin dans le profil kiosque (étape 7). |

---

## ⚠️ Limites connues

- **Partage natif = Android uniquement.** Sur iPhone, utilise le champ « coller un lien ».
- **ARTE** est géo-restreint (France/Allemagne) et tous les programmes ne sont pas
  intégrables (certains refusent l'affichage embarqué).
- **Performances** : la lecture 1080p sur Pi4 dans Chromium fonctionne mais reste
  exigeante ; baisse la qualité de la vidéo si elle saccade.

---

## 📄 Licence

MIT.
