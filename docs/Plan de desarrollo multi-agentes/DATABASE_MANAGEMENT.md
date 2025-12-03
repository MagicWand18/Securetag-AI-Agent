# Gestión de Base de Datos PostgreSQL

## 📋 Configuración Actual

La base de datos PostgreSQL está configurada en `docker-compose.yml`:

```yaml
services:
  securetag-db:
    image: postgres:18.1          # Imagen oficial de PostgreSQL
    container_name: securetag-db
    environment:
      POSTGRES_DB: securetag
      POSTGRES_USER: securetag
      POSTGRES_PASSWORD: securetagpwd  # Cambiar en producción
    volumes:
      - ./data/postgres:/var/lib/postgresql  # Persistencia de datos
    networks:
      - securetag-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U securetag"]
      interval: 5s
      timeout: 5s
      retries: 5
```

## 🎯 ¿Por qué no hay Dockerfile para PostgreSQL?

**Usamos la imagen oficial de PostgreSQL** por las siguientes razones:

1. ✅ **Mantenimiento**: PostgreSQL mantiene la imagen oficial con parches de seguridad
2. ✅ **Optimización**: La imagen está optimizada para producción
3. ✅ **Compatibilidad**: Garantiza compatibilidad con herramientas estándar
4. ✅ **Simplicidad**: No necesitamos customización del motor de DB

**Solo se construyen imágenes custom para**:
- `securetag-app`: Código TypeScript de la API
- `securetag-worker`: Código TypeScript del worker + herramientas de seguridad

## 🚀 Inicialización de Base de Datos

### Opción 1: Automática (Recomendado)

```bash
# Iniciar PostgreSQL
docker compose up -d securetag-db

# Ejecutar script de inicialización
bash scripts/init-db.sh
```

El script:
- ✅ Espera a que PostgreSQL esté listo
- ✅ Ejecuta migraciones desde `migrations/`
- ✅ Crea schema `securetag`
- ✅ Crea usuario de solo lectura (opcional)
- ✅ Verifica tablas creadas

### Opción 2: Manual

```bash
# Iniciar PostgreSQL
docker compose up -d securetag-db

# Conectarse a la DB
docker compose exec securetag-db psql -U securetag -d securetag

# Ejecutar migraciones manualmente
docker compose exec -T securetag-db psql -U securetag -d securetag < migrations/003_auth_multitenancy.sql
```

## 📦 Migraciones

Las migraciones SQL están en `migrations/`:

```
migrations/
└── 003_auth_multitenancy.sql  # Schema de autenticación y multi-tenancy
```

### Crear Nueva Migración

```bash
# Crear archivo de migración
cat > migrations/004_nueva_feature.sql <<'EOF'
-- Migración: Nueva feature
-- Fecha: 2025-11-28

BEGIN;

-- Tus cambios aquí
CREATE TABLE IF NOT EXISTS securetag.nueva_tabla (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;
EOF

# Aplicar migración
docker compose exec -T securetag-db psql -U securetag -d securetag < migrations/004_nueva_feature.sql
```

## 🔐 Seguridad en Producción

### Cambiar Password de PostgreSQL

**En desarrollo** (`.env`):
```bash
POSTGRES_PASSWORD=securetagpwd
```

**En producción** (`.env.production`):
```bash
# Generar password seguro
openssl rand -base64 32

# Configurar en .env.production
POSTGRES_PASSWORD=tu_password_super_seguro_aqui
DATABASE_URL=postgres://securetag:tu_password_super_seguro_aqui@securetag-db:5432/securetag
```

### Configurar en GitHub Secrets

```bash
# Agregar a GitHub Secrets
POSTGRES_PASSWORD=tu_password_super_seguro_aqui
```

## 💾 Backup y Restore

### Backup Manual

```bash
# Backup completo
docker compose exec securetag-db pg_dump -U securetag securetag > backup_$(date +%Y%m%d).sql

# Backup comprimido
docker compose exec securetag-db pg_dump -U securetag securetag | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Backup Automático (Cron)

```bash
# Agregar a crontab en el Droplet
crontab -e

# Backup diario a las 2 AM
0 2 * * * cd /opt/securetag && docker compose exec -T securetag-db pg_dump -U securetag securetag | gzip > backups/backup_$(date +\%Y\%m\%d).sql.gz
```

### Restore

```bash
# Desde backup sin comprimir
docker compose exec -T securetag-db psql -U securetag -d securetag < backup_20251128.sql

# Desde backup comprimido
gunzip -c backup_20251128.sql.gz | docker compose exec -T securetag-db psql -U securetag -d securetag
```

## 🔍 Monitoreo y Mantenimiento

### Verificar Estado

```bash
# Health check
docker compose exec securetag-db pg_isready -U securetag

# Ver conexiones activas
docker compose exec securetag-db psql -U securetag -d securetag -c "SELECT count(*) FROM pg_stat_activity;"

# Ver tamaño de la DB
docker compose exec securetag-db psql -U securetag -d securetag -c "SELECT pg_size_pretty(pg_database_size('securetag'));"
```

### Logs

```bash
# Ver logs de PostgreSQL
docker compose logs -f securetag-db

# Últimas 100 líneas
docker compose logs --tail=100 securetag-db
```

### Limpieza

```bash
# Vacuum (optimización)
docker compose exec securetag-db psql -U securetag -d securetag -c "VACUUM ANALYZE;"

# Ver tablas más grandes
docker compose exec securetag-db psql -U securetag -d securetag -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'securetag'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"
```

## 🔧 Troubleshooting

### Problema: PostgreSQL no inicia

```bash
# Ver logs
docker compose logs securetag-db

# Verificar permisos del volumen
ls -la data/postgres/

# Recrear contenedor
docker compose down securetag-db
docker compose up -d securetag-db
```

### Problema: "role does not exist"

```bash
# Recrear usuario
docker compose exec securetag-db psql -U postgres -c "CREATE USER securetag WITH PASSWORD 'securetagpwd';"
docker compose exec securetag-db psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE securetag TO securetag;"
```

### Problema: Conexión rechazada

```bash
# Verificar que el contenedor está corriendo
docker compose ps securetag-db

# Verificar red
docker network inspect securetag-net

# Verificar que App/Worker usan el host correcto
# Debe ser: securetag-db (no localhost)
grep DATABASE_URL .env
```

## 📊 Schema Actual

El schema `securetag` incluye las siguientes tablas (según migraciones):

```sql
-- Tenants (multi-tenancy)
securetag.tenant

-- Autenticación
securetag.api_key

-- Tareas y resultados
securetag.task
securetag.scan_result
securetag.finding
securetag.tool_execution
```

Para ver el schema completo:

```bash
docker compose exec securetag-db psql -U securetag -d securetag -c "\dt securetag.*"
```

## 🚀 Despliegue en Producción

### DigitalOcean Managed Database (Alternativa)

Para producción enterprise, considera usar **DigitalOcean Managed PostgreSQL**:

**Ventajas**:
- ✅ Backups automáticos
- ✅ Alta disponibilidad
- ✅ Escalabilidad vertical
- ✅ Monitoreo integrado
- ✅ Parches automáticos

**Configuración**:

```bash
# En .env.production
DATABASE_URL=postgres://user:password@managed-db-host:25060/securetag?sslmode=require

# Actualizar docker-compose.yml (comentar securetag-db)
# services:
#   securetag-db:  # Comentar todo este servicio si usas Managed DB
```

### Persistencia de Datos

El volumen `./data/postgres` persiste los datos entre reinicios:

```bash
# Verificar datos
ls -lh data/postgres/

# Backup del volumen completo
tar -czf postgres_volume_backup.tar.gz data/postgres/
```

## 📚 Referencias

- [PostgreSQL Official Docker Image](https://hub.docker.com/_/postgres)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/18/)
- [DigitalOcean Managed Databases](https://www.digitalocean.com/products/managed-databases-postgresql)
