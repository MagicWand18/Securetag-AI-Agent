#!/bin/bash

# Configuración
API_URL="http://localhost"
HOST_HEADER="api.securetag.com.mx"
SYSTEM_SECRET="s3cur3t4g-syst3m-s3cr3t-2025"
# ID del usuario Admin actual (obtenido de tus logs anteriores)
ADMIN_USER_ID="25199e1e-8bd2-4275-8f55-5843a80e3dd0" 

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "==================================================="
echo "   Validación de Endpoints Multi-Tenant (Backend)"
echo "==================================================="

# Función helper para curl
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    echo -e "\n${GREEN}Testing $method $endpoint${NC}"
    
    if [ "$method" == "POST" ] || [ "$method" == "PUT" ]; then
        curl -s -X $method "$API_URL$endpoint" \
            -H "Host: $HOST_HEADER" \
            -H "Content-Type: application/json" \
            -H "X-SecureTag-System-Secret: $SYSTEM_SECRET" \
            -H "X-SecureTag-User-Id: $ADMIN_USER_ID" \
            -d "$data" | json_pp
    else
        curl -s -X $method "$API_URL$endpoint" \
            -H "Host: $HOST_HEADER" \
            -H "Content-Type: application/json" \
            -H "X-SecureTag-System-Secret: $SYSTEM_SECRET" \
            -H "X-SecureTag-User-Id: $ADMIN_USER_ID" | json_pp
    fi
}

# 1. Obtener Info del Tenant
echo -e "\n--- 1. Información del Tenant ---"
call_api "GET" "/api/v1/tenant/me"

# 2. Listar Usuarios
echo -e "\n--- 2. Listar Usuarios ---"
call_api "GET" "/api/v1/tenant/users"

# 3. Invitar Usuario Nuevo
echo -e "\n--- 3. Invitar Usuario Nuevo ---"
NEW_EMAIL="test_user_$(date +%s)@example.com"
call_api "POST" "/api/v1/tenant/invite" "{\"email\": \"$NEW_EMAIL\", \"role\": \"member\"}"

# 4. Intentar invitar usuario duplicado (debe fallar o manejarse)
echo -e "\n--- 4. Validar Duplicado ---"
call_api "POST" "/api/v1/tenant/invite" "{\"email\": \"$NEW_EMAIL\", \"role\": \"member\"}"

echo -e "\n==================================================="
echo "   Pruebas Finalizadas"
echo "==================================================="
