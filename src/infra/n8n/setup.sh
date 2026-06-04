#!/bin/bash
# ============================================================
# Ali Sales AI — Hetzner n8n Server Setup
# Server: 46.62.152.234
# ============================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── 1. Root şifre değiştir ──────────────────────────────────
log "Root şifresi güncelleniyor..."
echo "root:k1lKShZcuJLQqhD6DyJerrPb8A" | chpasswd
log "Yeni root şifresi: k1lKShZcuJLQqhD6DyJerrPb8A"

# ── 2. Sistem güncelle ──────────────────────────────────────
log "Sistem güncelleniyor..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget git htop ufw fail2ban \
    ca-certificates gnupg lsb-release

# ── 3. Docker kur ───────────────────────────────────────────
log "Docker kuruluyor..."
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    log "Docker kuruldu: $(docker --version)"
else
    log "Docker zaten kurulu: $(docker --version)"
fi

# ── 4. Firewall kur ─────────────────────────────────────────
log "UFW firewall yapılandırılıyor..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment "SSH"
ufw allow 80/tcp    comment "HTTP"
ufw allow 443/tcp   comment "HTTPS"
ufw --force enable
log "UFW aktif. Açık portlar: 22, 80, 443"

# ── 5. Fail2ban kur ─────────────────────────────────────────
log "Fail2ban yapılandırılıyor..."
systemctl enable fail2ban
systemctl start fail2ban

# ── 6. Uygulama dizini oluştur ──────────────────────────────
log "Uygulama dizini oluşturuluyor: /opt/n8n"
mkdir -p /opt/n8n/backups
mkdir -p /var/log/caddy

# ── 7. Dosyaları kopyala ────────────────────────────────────
log "Config dosyaları kopyalanıyor..."
cp /tmp/n8n_deploy/.env                /opt/n8n/.env
cp /tmp/n8n_deploy/docker-compose.yml  /opt/n8n/docker-compose.yml
cp /tmp/n8n_deploy/Caddyfile           /opt/n8n/Caddyfile
cp /tmp/n8n_deploy/backup.sh           /opt/n8n/backup.sh
chmod +x /opt/n8n/backup.sh

# ── 8. Servisler başlat ─────────────────────────────────────
log "Docker servisleri başlatılıyor..."
cd /opt/n8n
docker compose up -d

# ── 9. Başlamasını bekle ────────────────────────────────────
log "Servisler ayağa kalkıyor (30s bekleniyor)..."
sleep 30

# ── 10. Health check ────────────────────────────────────────
log "Health check yapılıyor..."
for c in n8n_postgres n8n_redis n8n_app n8n_caddy; do
    STATUS=$(docker inspect --format='{{.State.Status}}' "$c" 2>/dev/null || echo "yok")
    if [ "$STATUS" = "running" ]; then
        log "  $c → running ✓"
    else
        err "  $c → $STATUS ✗ (docker logs $c ile kontrol et)"
    fi
done

# ── 11. Cron backup ─────────────────────────────────────────
log "Günlük backup cron'u ekleniyor (her gece 03:00)..."
(crontab -l 2>/dev/null | grep -v "backup.sh"; echo "0 3 * * * /opt/n8n/backup.sh >> /var/log/n8n_backup.log 2>&1") | crontab -

# ── 12. Swap ekle (4GB RAM için) ────────────────────────────
if [ ! -f /swapfile ]; then
    log "2GB swap oluşturuluyor..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log "Swap aktif: $(free -h | grep Swap)"
fi

# ── Sonuç ────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════"
echo " Ali Sales AI — n8n Setup Tamamlandı!"
echo "════════════════════════════════════════════════════"
echo ""
echo "  URL:      https://n8n.alisales.ai"
echo "  User:     admin"
echo "  Password: JmTMEZFXYce2fIGtb9XV7g"
echo ""
echo "  Yeni Root SSH Sifresi: k1lKShZcuJLQqhD6DyJerrPb8A"
echo ""
echo "  Servis durumu: docker compose -f /opt/n8n/docker-compose.yml ps"
echo "  n8n loglari:   docker logs n8n_app -f"
echo "  Manuel backup: /opt/n8n/backup.sh"
echo "════════════════════════════════════════════════════"
echo ""
echo "[!] DNS kaydi: n8n.alisales.ai → 46.62.152.234"
echo "[!] SSL icin DNS propagation beklenmeli (~5dk)"
