#!/usr/bin/env bash
# Génère des icônes PWA placeholder (requises pour l'installation/partage Android).
# Nécessite ImageMagick (sudo apt install imagemagick).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/select/icons

for size in 192 512; do
  convert -size ${size}x${size} xc:'#0b0f14' \
    -fill '#36c2ff' -gravity center \
    -pointsize $((size/4)) -annotate 0 'R' \
    public/select/icons/icon-${size}.png
done
echo "✅ Icônes générées dans public/select/icons/"
