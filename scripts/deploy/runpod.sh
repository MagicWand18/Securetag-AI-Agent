#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Securetag RunPod Deployment Script (Updated 2025-12-01)
# ============================================================================
# Automatiza los pasos del Walkthrough-RunPod-Serverless.md
# 1. Construye la imagen (AMD64 + Fixes)
# 2. Sube a Docker Hub
# 3. (Opcional) Crea/Actualiza endpoint via API
# ============================================================================

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# Directorio base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../runpod-deploy" && pwd)"
if [ ! -d "$BASE_DIR" ]; then
    error "No se encuentra el directorio runpod-deploy en: $BASE_DIR"
fi

# Configuración
DOCKER_HUB_USER="${DOCKER_HUB_USER:-magicwand1818}"
IMAGE_NAME="securetag-llm"
VERSION="${VERSION:-v2}"
FULL_IMAGE_NAME="$DOCKER_HUB_USER/$IMAGE_NAME:$VERSION"

info "🚀 Iniciando despliegue automatizado de Securetag LLM"
info "  Directorio: $BASE_DIR"
info "  Imagen: $FULL_IMAGE_NAME"
info "  Plataforma: linux/amd64 (Critical Fix)"

# 1. Build
info "🔨 Construyendo imagen Docker..."
cd "$BASE_DIR"

# Verificar Dockerfile
if ! grep -q "ENV OLLAMA_FLASH_ATTENTION=0" Dockerfile; then
    warn "El Dockerfile no parece tener OLLAMA_FLASH_ATTENTION=0. Esto podría causar crashes con LoRA."
    read -p "¿Continuar de todos modos? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

docker build --platform linux/amd64 -t "$FULL_IMAGE_NAME" .

# 2. Push
info "⬆️  Subiendo imagen a Docker Hub..."
docker push "$FULL_IMAGE_NAME"

info "✅ Imagen subida exitosamente: $FULL_IMAGE_NAME"

# 3. Instrucciones Finales
echo ""
info "🎉 Build y Push completados."
echo ""
echo "Para actualizar tu endpoint en RunPod:"
echo "1. Ve a https://www.runpod.io/console/serverless"
echo "2. Edita tu endpoint 'securetag-llm'"
echo "3. Cambia la imagen a: $FULL_IMAGE_NAME"
echo "4. Haz click en Update"
echo ""
echo "Nota: Este script automatiza la Fase 1 del Walkthrough."
