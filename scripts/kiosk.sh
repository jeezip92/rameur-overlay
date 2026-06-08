#!/usr/bin/env bash
# Lance Chromium en mode kiosque sur la page écran.
# - --ignore-certificate-errors : accepte le certif local (auto-signé) côté écran.
# - --autoplay-policy : autorise l'autoplay avec son de la vidéo.
# uBlock Origin : voir README (installer l'extension dans le profil chromium).
set -uo pipefail

PORT="${PORT:-8443}"
URL="https://localhost:${PORT}/display/"

# Empêche la mise en veille de l'écran (X11 ; ignoré sous Wayland).
xset s off -dpms 2>/dev/null || true

# Attendre que le serveur réponde (il démarre en parallèle au boot).
echo "Attente du serveur sur $URL ..."
for _ in $(seq 1 60); do
  curl -k -s -o /dev/null "$URL" && break
  sleep 1
done

# Nom du binaire selon la distro.
BIN="$(command -v chromium-browser || command -v chromium || echo chromium)"

# Plateforme d'affichage : Wayland (labwc/wayfire) si disponible, sinon X11.
PLATFORM=()
if [ -n "${WAYLAND_DISPLAY:-}" ]; then
  PLATFORM=(--ozone-platform=wayland --enable-features=UseOzonePlatform)
fi

exec "$BIN" \
  --kiosk "$URL" \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --ignore-certificate-errors \
  --autoplay-policy=no-user-gesture-required \
  --check-for-update-interval=31536000 \
  "${PLATFORM[@]}" \
  --user-data-dir="$HOME/.config/rameur-kiosk"
