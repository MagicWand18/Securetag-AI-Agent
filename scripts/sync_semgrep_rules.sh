#!/bin/bash
set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

RULES_DIR="./data/rules"
REPO_URL="https://github.com/semgrep/semgrep-rules.git"

echo -e "${BLUE}[INFO] Iniciando sincronización de reglas Semgrep...${NC}"

# Crear directorio data si no existe
mkdir -p ./data

if [ -d "$RULES_DIR/.git" ]; then
    echo -e "${BLUE}[INFO] Directorio de reglas existente. Actualizando...${NC}"
    cd "$RULES_DIR"
    git pull origin main
else
    echo -e "${BLUE}[INFO] Directorio de reglas no encontrado o incompleto. Clonando...${NC}"
    rm -rf "$RULES_DIR"
    git clone "$REPO_URL" "$RULES_DIR"
fi

echo -e "${GREEN}[SUCCESS] Reglas sincronizadas exitosamente en $RULES_DIR${NC}"
