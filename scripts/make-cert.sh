#!/usr/bin/env bash
# Génère un certificat TLS pour le serveur (HTTPS requis par la PWA).
# Méthode recommandée : mkcert (pas d'avertissement si la CA est installée sur le tel).
# Fallback : OpenSSL auto-signé (un avertissement à accepter une fois sur le tel).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certs

# IP locale du Pi (à inclure dans le certificat).
IP="$(hostname -I | awk '{print $1}')"
echo "IP locale détectée : $IP"

if command -v mkcert >/dev/null 2>&1; then
  echo "→ mkcert détecté."
  mkcert -install
  mkcert -key-file certs/key.pem -cert-file certs/cert.pem "$IP" localhost 127.0.0.1
  echo "✅ Certificat mkcert généré. Installe aussi la CA mkcert sur le téléphone"
  echo "   (copie le fichier rootCA.pem depuis: $(mkcert -CAROOT))"
else
  echo "→ mkcert absent, fallback OpenSSL auto-signé."
  openssl req -x509 -newkey rsa:2048 -nodes -days 825 \
    -keyout certs/key.pem -out certs/cert.pem \
    -subj "/CN=$IP" \
    -addext "subjectAltName=IP:$IP,IP:127.0.0.1,DNS:localhost"
  echo "✅ Certificat auto-signé généré (avertissement à accepter sur le tel)."
fi
