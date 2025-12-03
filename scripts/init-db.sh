#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# PostgreSQL Database Initialization Script
# ============================================================================
# Este script inicializa la base de datos PostgreSQL con el schema necesario
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
MIGRATIONS_DIR="./migrations"

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

info "Inicializando base de datos PostgreSQL..."

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

# Verificar si la base de datos ya está inicializada
info "Verificando estado de la base de datos..."
TABLES_COUNT=$(docker compose exec -T "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'securetag';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$TABLES_COUNT" -gt 0 ]; then
    info "Base de datos ya está inicializada ($TABLES_COUNT tablas encontradas). Continuando con migraciones incrementales..."
    # No salimos, simplemente no reinicializamos de cero.
    # Las migraciones deben ser idempotentes (IF NOT EXISTS).
else
    info "Base de datos vacía. Se procederá a inicializar desde cero si hay scripts base."
fi

# Ejecutar migraciones
if [ -d "$MIGRATIONS_DIR" ]; then
    info "Ejecutando migraciones desde $MIGRATIONS_DIR..."
    
    for migration in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration" ]; then
            info "Aplicando: $(basename "$migration")"
            docker compose exec -T "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$migration"
        fi
    done
else
    warn "Directorio de migraciones no encontrado: $MIGRATIONS_DIR"
fi

# Auto-insertar/actualizar WORKER_API_KEY si existe en el entorno
if [ -n "${WORKER_API_KEY:-}" ]; then
    info "Detectada WORKER_API_KEY en entorno. Configurando..."
    
    # UPSERT: Actualizar si existe, insertar si no existe
    # NOTA: La aplicación usa SHA256 para validar las llaves (ver src/middleware/auth.ts)
    docker compose exec -T "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO securetag.api_key (key_hash, tenant_id, name, scopes) 
        VALUES (encode(digest('$WORKER_API_KEY', 'sha256'), 'hex'), 'production', 'Worker Key', '[\"worker\"]')
        ON CONFLICT (key_hash) 
        DO UPDATE SET key_hash = encode(digest('$WORKER_API_KEY', 'sha256'), 'hex');
    " 2>/dev/null || {
        # Si falla el UPSERT (por ejemplo, si el constraint es diferente), forzar UPDATE
        docker compose exec -T "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
            DELETE FROM securetag.api_key WHERE name = 'Worker Key';
            INSERT INTO securetag.api_key (key_hash, tenant_id, name, scopes) 
            VALUES (encode(digest('$WORKER_API_KEY', 'sha256'), 'hex'), 'production', 'Worker Key', '[\"worker\"]');
        "
    }
    info "✅ Worker API Key configurada exitosamente"
else
    warn "WORKER_API_KEY no definida en el entorno. El worker podría fallar al conectar."
fi

# Verificar tablas creadas
info "Verificando tablas creadas..."
TABLES=$(docker compose exec -T "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'securetag' ORDER BY table_name;")

if [ -n "$TABLES" ]; then
    info "Tablas creadas:"
    echo "$TABLES" | while read -r table; do
        [ -n "$table" ] && echo "  - $table"
    done
else
    warn "No se encontraron tablas en el schema 'securetag'"
fi

# Crear usuario de solo lectura (opcional, para reporting)
info "Creando usuario de solo lectura (opcional)..."
docker compose exec -T "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<-EOSQL 2>/dev/null || true
    -- Crear usuario de solo lectura
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'securetag_readonly') THEN
            CREATE USER securetag_readonly WITH PASSWORD 'readonly_password_change_me';
        END IF;
    END
    \$\$;
    
    -- Otorgar permisos de lectura
    GRANT CONNECT ON DATABASE securetag TO securetag_readonly;
    GRANT USAGE ON SCHEMA securetag TO securetag_readonly;
    GRANT SELECT ON ALL TABLES IN SCHEMA securetag TO securetag_readonly;
    ALTER DEFAULT PRIVILEGES IN SCHEMA securetag GRANT SELECT ON TABLES TO securetag_readonly;
EOSQL

info "✅ Inicialización de base de datos completada"
info ""
info "Conexión a la base de datos:"
info "  Host: localhost (o securetag-db desde contenedores)"
info "  Port: 5432"
info "  Database: $DB_NAME"
info "  User: $DB_USER"
info ""
info "Para conectarte manualmente:"
info "  docker compose exec securetag-db psql -U $DB_USER -d $DB_NAME"
