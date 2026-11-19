#!/usr/bin/env bash
# Configurazione iniziale di SOSPro24 sul VPS. Si lancia UNA volta sola, sul server:
#   sudo bash ~/apps/sospro24/setup-vps.sh
# Non tocca gli altri siti: aggiunge solo sospro24.com.
set -euo pipefail

APP_DIR=/home/choco/apps/sospro24
WEB_DIR=/var/www/sospro24
CONF=/etc/nginx/sites-available/sospro24.com

# 1. Cartella del sito, di proprietà di choco: i prossimi aggiornamenti non richiedono sudo
mkdir -p "$WEB_DIR"
rsync -a --delete "$APP_DIR/upload/" "$WEB_DIR/"
chown -R choco:choco "$WEB_DIR"
chmod 755 "$WEB_DIR"

# 2. nginx
cp "$APP_DIR/nginx-sospro24.conf" "$CONF"
ln -sf "$CONF" /etc/nginx/sites-enabled/sospro24.com
nginx -t
systemctl reload nginx

# 3. Certificato HTTPS gratuito (Let's Encrypt) + redirect da http a https
certbot --nginx -d sospro24.com -d www.sospro24.com --redirect --non-interactive --agree-tos --keep-until-expiring

echo
echo "SOSPro24 online: https://sospro24.com"
