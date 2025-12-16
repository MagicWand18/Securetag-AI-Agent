#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# PostgreSQL Database Initialization Script
# ============================================================================
# Este script inicializa configuraciones post-despliegue (API Keys, Tenants).
# Las migraciones de esquema son manejadas por el contenedor 'securetag-migrate'.
# ============================================================================

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# Configuración
DB_CONTAINER="${DB_CONTAINER:-securetag-db}"
DB_USER="${POSTGRES_USER:-securetag}"
DB_NAME="${POSTGRES_DB:-securetag}"

# Cargar variables desde .env si existe (para obtener WORKER_API_KEY)
if [ -f .env ]; then
    info "Cargando variables desde .env..."
    # Leer línea por línea para manejar comentarios y espacios
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Ignorar comentarios y líneas vacías
        [[ $key =~ ^# ]] && continue
        [[ -z $key ]] && continue
        
        # Limpiar valor (quitar comillas y espacios extra)
        value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'\'']//' -e 's/["'\'']$//')
        
        # Exportar si no existe
        if [ -z "${!key:-}" ]; then
            export "$key=$value"
        fi
    done < .env
fi

info "Verificando estado de PostgreSQL..."

# Verificar que el contenedor está corriendo
if ! docker ps | grep -q "$DB_CONTAINER"; then
    error "Contenedor $DB_CONTAINER no está corriendo. Ejecuta: docker compose up -d securetag-db"
fi

# Esperar a que PostgreSQL esté listo
info "Esperando a que PostgreSQL esté listo..."
for i in {1..30}; do
    if docker compose exec -T "$DB_CONTAINER" pg_isready -U "$DB_USER" > /dev/null 2>&1; then
        info "PostgreSQL está listo"
        break
    fi
    if [ $i -eq 30 ]; then
        error "PostgreSQL no respondió después de 30 segundos"
    fi
    sleep 1
done

info "Nota: Las migraciones de esquema (tablas) son aplicadas automáticamente por el servicio 'securetag-migrate' al iniciar."

# Auto-insertar/actualizar WORKER_API_KEY si existe en el entorno
if [ -n "${WORKER_API_KEY:-}" ]; then
    info "Detectada WORKER_API_KEY en entorno. Configurando..."
    
    # Obtener UUID del tenant production de forma dinámica
    # Nota: El tenant 'production' se crea en la migración 003
    TENANT_ID=$(docker compose exec -T "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM securetag.tenant WHERE name = 'production' LIMIT 1;" | tr -d '[:space:]')
    
    # Si no existe, intentar con 'default' o el primer tenant disponible
    if [ -z "$TENANT_ID" ]; then
        TENANT_ID=$(docker compose exec -T "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM securetag.tenant LIMIT 1;" | tr -d '[:space:]')
    fi
    
    if [ -n "$TENANT_ID" ]; then
        info "Asociando Worker API Key al tenant: $TENANT_ID"
        
        # Insertar o actualizar la API Key del worker
        # Usamos ON CONFLICT para hacer upsert basado en el hash (si es unique) o nombre
        # Como key_hash es UNIQUE en la tabla api_key:
        
        KEY_HASH=$(echo -n "$WORKER_API_KEY" | sha256sum | awk '{print $1}')
        
        docker compose exec -T "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
            INSERT INTO securetag.api_key (tenant_id, key_hash, name, scopes, is_active)
            VALUES ('$TENANT_ID', '$KEY_HASH', 'Worker Key (Auto)', '[\"worker:read\", \"worker:write\"]', true)
            ON CONFLICT (key_hash) DO UPDATE 
            SET last_used_at = now(), is_active = true;
        "
        info "✅ Worker API Key configurada exitosamente"
    else
        warn "No se encontraron tenants en la base de datos. Asegúrate de que las migraciones (securetag-migrate) hayan corrido."
    fi
else
    info "WORKER_API_KEY no definida. Saltando configuración automática."
fi

info "✅ Inicialización de configuración completada"
