#!/bin/bash
set -e

# Configuración
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="securetag_backup_${TIMESTAMP}.sql.gz.enc"
RETENTION_DAYS=7

# Colores
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}[INFO] Iniciando backup cifrado de Securetag DB...${NC}"

# 1. Dump & Compress & Encrypt
# Usamos pipe para no escribir en disco el SQL plano
# PGPASSWORD se toma de la variable de entorno
export PGPASSWORD="$POSTGRES_PASSWORD"

pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" | \
gzip | \
openssl enc -aes-256-cbc -salt -pbkdf2 -pass "pass:$BACKUP_ENCRYPTION_KEY" -out "$BACKUP_DIR/$FILENAME"

echo -e "${GREEN}[INFO] Backup completado: $FILENAME${NC}"

# 2. Limpieza de backups antiguos
find "$BACKUP_DIR" -name "securetag_backup_*.sql.gz.enc" -mtime +$RETENTION_DAYS -delete

echo -e "${GREEN}[INFO] Limpieza completada (retención: $RETENTION_DAYS días)${NC}"
