#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Securetag Deployment Script - DigitalOcean
# ============================================================================
# Este script despliega Securetag en un Droplet de DigitalOcean
# Uso: ./digitalocean.sh [environment]
# ============================================================================

ENVIRONMENT="${1:-production}"
DEPLOY_DIR="/opt/securetag"
REGISTRY="ghcr.io"
REPO_NAME="${GITHUB_REPOSITORY:-securetag/securetag-ai}"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funciones de utilidad
info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# Verificar que estamos en el directorio correcto
info "Iniciando despliegue en ambiente: $ENVIRONMENT"

# Crear directorio de despliegue si no existe
if [ ! -d "$DEPLOY_DIR" ]; then
    info "Creando directorio de despliegue: $DEPLOY_DIR"
    sudo mkdir -p "$DEPLOY_DIR"
    sudo chown -R $USER:$USER "$DEPLOY_DIR"
fi

cd "$DEPLOY_DIR"

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
    error "Docker no está instalado. Por favor instala Docker primero."
fi

if ! command -v docker compose &> /dev/null; then
    error "Docker Compose no está instalado. Por favor instala Docker Compose primero."
fi

# Login a GitHub Container Registry
info "Autenticando con GitHub Container Registry..."
if [ -n "${GITHUB_TOKEN:-}" ]; then
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
else
    warn "GITHUB_TOKEN no está configurado. Asumiendo que ya estás autenticado."
fi

# Backup de la configuración actual (si existe)
if [ -f "docker-compose.yml" ]; then
    info "Creando backup de configuración actual..."
    cp docker-compose.yml "docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Descargar docker-compose.yml actualizado (si viene del repo)
if [ -n "${GITHUB_WORKSPACE:-}" ]; then
    info "Copiando docker-compose.yml desde repositorio..."
    cp "$GITHUB_WORKSPACE/docker-compose.yml" .
fi

# Verificar que existe .env
if [ ! -f ".env" ]; then
    error "Archivo .env no encontrado. Por favor crea .env con las variables necesarias."
fi

# Source .env para obtener variables
set -a
source .env
set +a

# Pull de imágenes más recientes
info "Descargando imágenes Docker más recientes..."
docker compose pull

# Detener servicios actuales
if docker compose ps | grep -q "Up"; then
    info "Deteniendo servicios actuales..."
    docker compose down --remove-orphans
fi

# Limpiar contenedores e imágenes antiguas
info "Limpiando recursos antiguos..."
docker system prune -f --volumes

# Iniciar servicios
info "Iniciando servicios..."
docker compose up -d

# Esperar a que los servicios estén listos
info "Esperando a que los servicios estén listos..."
sleep 10

# Verificar que los servicios están corriendo
info "Verificando estado de servicios..."
docker compose ps

# Ejecutar health checks
info "Ejecutando health checks..."
if [ -f "scripts/health-check.sh" ]; then
    bash scripts/health-check.sh
else
    warn "Script de health check no encontrado. Saltando verificación."
fi

# Mostrar logs recientes
info "Logs recientes de los servicios:"
docker compose logs --tail=50

info "✅ Despliegue completado exitosamente!"
info "Servicios disponibles:"
info "  - App: http://localhost:8080"
info "  - Health: http://localhost:8080/healthz"

# Cleanup
info "Limpiando archivos temporales..."
rm -f /tmp/digitalocean.sh

info "Para ver logs en tiempo real: docker compose logs -f"
info "Para detener servicios: docker compose down"
