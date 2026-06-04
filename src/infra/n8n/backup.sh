#!/bin/bash
# ============================================================
# Ali Sales AI — n8n Backup Script
# Çalıştır: crontab -e → 0 3 * * * /opt/n8n/backup.sh
# ============================================================

set -euo pipefail

BACKUP_DIR="/opt/n8n/backups"
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE_DIR="/opt/n8n"
KEEP_DAYS=7

# .env'den postgres bilgilerini al
source "$COMPOSE_DIR/.env"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Backup başlıyor..."

# PostgreSQL dump
docker exec n8n_postgres pg_dump \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --no-password \
    | gzip > "$BACKUP_DIR/postgres_${DATE}.sql.gz"

echo "[$(date)] PostgreSQL backup tamamlandı: postgres_${DATE}.sql.gz"

# n8n data volume (credentials, settings)
docker run --rm \
    -v n8n_n8n_data:/source:ro \
    -v "$BACKUP_DIR":/backup \
    alpine tar czf "/backup/n8n_data_${DATE}.tar.gz" -C /source .

echo "[$(date)] n8n data backup tamamlandı: n8n_data_${DATE}.tar.gz"

# Eski backupları temizle
find "$BACKUP_DIR" -name "*.gz" -mtime +${KEEP_DAYS} -delete
echo "[$(date)] ${KEEP_DAYS} günden eski backuplar silindi."

# Backup boyutunu listele
echo "[$(date)] Mevcut backuplar:"
ls -lh "$BACKUP_DIR"

echo "[$(date)] Backup tamamlandı."
