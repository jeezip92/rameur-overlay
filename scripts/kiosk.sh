#!/usr/bin/env bash
# Lance Chromium en mode kiosque sur la page écran.
# - --ignore-certificate-errors : accepte le certif local (auto-signé) côté écran.
# - --autoplay-policy : autorise l'autoplay avec son de la vidéo.
# uBlock Origin : voir README (installer l'extension dans le profil chromium).
set -euo pipefail

PORT="${PORT:-8443}"
URL="https://localhost:${PORT}/display/"

# Empêche la mise en veille de l'écran.
xset s off -dpms 2>/dev/null || true

# Nom du binaire selon la distro.
BIN="$(command -v chromium-browser || command -v chromium || echo chromium)"

exec "$BIN" \
  --kiosk "$URL" \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --ignore-certificate-errors \
  --autoplay-policy=no-user-gesture-required \
  --check-for-update-interval=31536000 \
  --user-data-dir="$HOME/.config/rameur-kiosk"
