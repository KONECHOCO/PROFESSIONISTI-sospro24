#!/usr/bin/env bash
# Pubblica SOSPro24 su https://sospro24.com (VPS Hetzner). Non serve sudo.
#   bash deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

HOST=choco@23.88.32.156
KEY="$HOME/.ssh/id_ed25519"
SSH="ssh -i $KEY -o IdentitiesOnly=yes"

npm run build

# Carica in una cartella di appoggio, poi sincronizza (i file vecchi vengono tolti)
$SSH "$HOST" 'rm -rf ~/apps/sospro24/upload && mkdir -p ~/apps/sospro24/upload'
tar -C dist -czf - . | $SSH "$HOST" 'tar -xzf - -C ~/apps/sospro24/upload'
$SSH "$HOST" 'if [ -w /var/www/sospro24 ]; then rsync -a --delete ~/apps/sospro24/upload/ /var/www/sospro24/ && echo "Pubblicato: https://sospro24.com"; else echo "Prima configurazione: sul server lancia  sudo bash ~/apps/sospro24/setup-vps.sh"; fi'
