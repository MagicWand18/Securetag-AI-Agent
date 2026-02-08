#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Securetag Health Check Script
# ============================================================================
# Verifica que todos los servicios estén funcionando correctamente
# ============================================================================

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[✓]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }

FAILED=0
APP_HOST="${APP_HOST:-localhost}"
APP_PORT="${APP_PORT:-8080}"

echo "================================================"
echo "  Securetag Health Check"
echo "================================================"
echo ""

# 1. Verificar Docker Compose
echo "1. Verificando servicios Docker..."
if docker compose ps | grep -q "Up"; then
    RUNNING=$(docker compose ps --services --filter "status=running" | wc -l)
    TOTAL=$(docker compose ps --services | wc -l)
    info "Servicios corriendo: $RUNNING/$TOTAL"
else
    error "No hay servicios corriendo"
    FAILED=1
fi
echo ""

# 2. Verificar Base de Datos
echo "2. Verificando PostgreSQL..."
if docker compose exec -T core-db pg_isready -U securetag > /dev/null 2>&1; then
    info "PostgreSQL está listo"
else
    error "PostgreSQL no responde"
    FAILED=1
fi
echo ""

# 3. Verificar App (API)
echo "3. Verificando Securetag App..."
HEALTH_URL="http://${APP_HOST}:${APP_PORT}/healthz"

if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s "$HEALTH_URL")
    # Solo verificar que .ok sea true (la app no devuelve .status)
    if echo "$HEALTH_RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
        info "App health check: OK"
    else
        error "App health check falló"
        echo "   Response: $HEALTH_RESPONSE"
        FAILED=1
    fi
else
    error "App no responde en $HEALTH_URL"
    FAILED=1
fi
echo ""

# 4. Verificar Worker (logs recientes)
echo "4. Verificando Worker..."
WORKER_LOGS=$(docker compose logs --tail=10 core-worker 2>&1)
if echo "$WORKER_LOGS" | grep -q "error\|Error\|ERROR"; then
    warn "Worker tiene errores en logs recientes"
    echo "$WORKER_LOGS" | grep -i error | head -3
else
    info "Worker sin errores aparentes"
fi
echo ""

# 5. Verificar LLM (Ollama o RunPod)
echo "5. Verificando LLM..."
OLLAMA_HOST="${OLLAMA_HOST:-}"

if [[ -z "$OLLAMA_HOST" ]]; then
    info "LLM no configurado (opcional para despliegue inicial)"
elif [[ "$OLLAMA_HOST" == *"runpod"* ]]; then
    info "LLM configurado en RunPod (externo)"
else
    # Intentar verificar Ollama local si existe
    if docker compose ps 2>/dev/null | grep -q "ollama"; then
        if curl -sf "$OLLAMA_HOST/api/version" > /dev/null 2>&1; then
            VERSION=$(curl -s "$OLLAMA_HOST/api/version" | jq -r '.version' 2>/dev/null || echo "unknown")
            info "Ollama local está corriendo (version: $VERSION)"
        else
            warn "Ollama local no responde en $OLLAMA_HOST"
        fi
    else
        info "LLM configurado en: $OLLAMA_HOST (no verificable)"
    fi
fi
echo ""

# 6. Verificar uso de recursos
echo "6. Verificando uso de recursos..."
MEMORY_USAGE=$(docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}" | grep securetag)
info "Uso de memoria:"
echo "$MEMORY_USAGE"
echo ""

# 7. Verificar conectividad de red
echo "7. Verificando red Docker..."
NETWORK_NAME="securetag-net"
if docker network inspect "$NETWORK_NAME" > /dev/null 2>&1; then
    CONTAINERS=$(docker network inspect "$NETWORK_NAME" | jq -r '.[0].Containers | length')
    info "Red $NETWORK_NAME activa con $CONTAINERS contenedores"
else
    error "Red $NETWORK_NAME no encontrada"
    FAILED=1
fi
echo ""

# Resumen
echo "================================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Todos los health checks pasaron${NC}"
    exit 0
else
    echo -e "${RED}❌ Algunos health checks fallaron${NC}"
    echo ""
    echo "Para debugging:"
    echo "  - Ver logs: docker compose logs -f"
    echo "  - Ver estado: docker compose ps"
    echo "  - Reiniciar: docker compose restart"
    exit 1
fi
