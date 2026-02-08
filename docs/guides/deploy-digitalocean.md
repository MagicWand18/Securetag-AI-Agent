# Guia de Despliegue en DigitalOcean

**Objetivo**: Desplegar SecureTag en DigitalOcean paso a paso.
**Tiempo estimado**: 30-45 minutos.

---

## Checklist Previo

- [ ] Cuenta de DigitalOcean activa y ligada a GitHub
- [ ] Repositorio en GitHub
- [ ] Tarjeta de credito en DigitalOcean

---

## Fase 1: Crear Droplet

### 1.1 Configuracion del Droplet

| Campo | Valor |
|-------|-------|
| **Imagen** | Ubuntu 22.04 LTS |
| **Plan** | Basic, Regular CPU (SSD) |
| **Staging** | $24/mo (2 vCPUs, 4 GB RAM, 80 GB SSD) |
| **Produccion** | $48/mo (4 vCPUs, 8 GB RAM) |
| **Region** | New York 1 o San Francisco 3 |
| **Auth** | SSH Keys |
| **Hostname** | `securetag-production` |

### 1.2 Generar SSH Key

```bash
ssh-keygen -t ed25519
cat ~/.ssh/id_ed25519.pub
```

Copiar la clave publica y agregarla al Droplet en DigitalOcean.

### 1.3 Obtener IP

Una vez creado el Droplet, copiar la IP asignada.

---

## Fase 2: Configurar Secretos en GitHub

En **Settings > Secrets and variables > Actions**, agregar:

| Secreto | Valor |
|---------|-------|
| `DIGITALOCEAN_TOKEN` | Token API de DO (generar en API > Generate New Token) |
| `DIGITALOCEAN_HOST` | IP del Droplet |
| `DIGITALOCEAN_USER` | `root` |
| `DIGITALOCEAN_SSH_KEY` | Clave privada SSH completa (incluyendo BEGIN/END) |
| `POSTGRES_PASSWORD` | Generar con `openssl rand -base64 32` |

---

## Fase 3: Preparar Droplet

### 3.1 Conectarse

```bash
ssh -i ~/.ssh/id_ed25519 root@<IP_DEL_DROPLET>
```

### 3.2 Instalar dependencias

```bash
# Actualizar sistema
apt update && apt upgrade -y
apt install -y jq

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
apt install docker-compose-plugin -y

# Verificar
docker --version
docker compose version
```

### 3.3 Configurar Firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw --force enable
ufw status
```

### 3.4 Clonar Repositorio

```bash
mkdir -p /opt/securetag
cd /opt/securetag
git clone https://<GITHUB_TOKEN>@github.com/<USUARIO>/securetag-ai.git .
```

---

## Fase 4: Variables de Entorno

### 4.1 Crear archivo `.env`

```bash
cp .env.production.example .env.production
nano .env.production
```

### 4.2 Variables requeridas

```ini
# CORE
NODE_ENV=production
PORT=8080

# DATABASE
DATABASE_URL=postgres://securetag:<PASSWORD>@securetag-db:5432/securetag
POSTGRES_DB=securetag
POSTGRES_USER=securetag
POSTGRES_PASSWORD=<GENERAR_CON_OPENSSL>

# TENANT
TENANT_ID=<TU_TENANT_ID>
WORKER_API_KEY=<GENERAR_CON_OPENSSL_RAND_HEX_32>

# STORAGE
DB_DIR=/var/securetag/production/db
UPLOADS_DIR=/var/securetag/production/uploads
WORK_DIR=/var/securetag/production/work
RESULTS_DIR=/var/securetag/production/results

# LLM (RunPod) - Ver docs/guides/deploy-runpod.md
RUNPOD_ENDPOINT_ID=<TU_ENDPOINT_ID>
RUNPOD_API_KEY=<TU_RUNPOD_API_KEY>
OLLAMA_HOST=https://api.runpod.ai/v2/<TU_ENDPOINT_ID>
MODEL=securetag-v1

# SEMGREP
SEMGREP_HAS_SHOWN_METRICS_NOTIFICATION=true

# LOGGING
LOG_LEVEL=info
LOOP_MODE=true

# VIRUSTOTAL (opcional)
VIRUSTOTAL_API_KEY=<TU_VT_API_KEY>
VIRUSTOTAL_MALICIOUS_THRESHOLD=0

# RATE LIMITING
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_UPLOAD_MAX=5

# SECURITY BANNING
SECURITY_BAN_DURATION_HOURS=24
SECURITY_BAN_PERMANENT_ENABLED=0
SECURITY_BAN_APIKEY_ENABLED=1
SECURITY_BAN_TENANT_ENABLED=0
```

### 4.3 Crear directorios de datos

```bash
mkdir -p data/production/{db,uploads,work,results}
mkdir -p data/postgres
```

---

## Fase 5: Primer Despliegue

```bash
# Copiar config de produccion
cp .env.production .env

# Construir y levantar
docker compose up -d --build
```

Esperar 5-10 minutos para la construccion.

---

## Fase 6: Inicializar Base de Datos

```bash
bash scripts/init-db.sh
```

Verificar tablas:
```bash
docker compose exec securetag-db psql -U securetag -d securetag -c "\dt securetag.*"
```

---

## Fase 7: Verificacion

```bash
# Logs del Worker (debe estar idle sin errores 401/503)
docker compose logs -f securetag-worker

# Health check
bash scripts/health-check.sh

# Probar API
curl http://<IP_DEL_DROPLET>/healthz
```

---

## Fase 8: Gestion de Tenants y API Keys

### Acceder a la DB

```bash
docker compose exec securetag-db psql -U securetag -d securetag
```

### Generar API Key hashes

```bash
node -e "console.log(require('crypto').createHash('sha256').update('<TU_TOKEN_SECRETO>').digest('hex'))"
```

### Crear Tenants (SQL)

```sql
INSERT INTO securetag.tenant (id, name, plan, credits_balance) VALUES
('<tenant-id>', '<Nombre>', 'enterprise', 1000)
ON CONFLICT (id) DO UPDATE SET plan=EXCLUDED.plan, credits_balance=EXCLUDED.credits_balance;
```

### Insertar API Keys (SQL)

```sql
INSERT INTO securetag.api_key (id, tenant_id, key_hash, is_active, created_at) VALUES
(gen_random_uuid(), '<tenant-id>', '<HASH_GENERADO>', true, now());
```

---

## Actualizaciones y Redespliegues

```bash
# Conectarse
ssh -i ~/.ssh/id_ed25519 root@<IP_DEL_DROPLET>

# Ir al directorio y actualizar
cd /opt/securetag
git pull origin main

# Ajustar permisos (CRITICO para evitar errores EACCES)
chown -R 1001:1001 /opt/securetag/data

# Reconstruir y levantar
docker compose down && docker system prune -a -f && docker compose build --no-cache && docker compose up -d

# Verificar
docker compose ps
docker compose logs --tail=20 securetag-worker
```

---

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| No puedo conectarme por SSH | Verificar IP y clave SSH: `ssh -v root@<IP>` |
| Docker no descarga imagenes | `docker login ghcr.io` y pull manual |
| Servicios no inician | `docker compose logs` para ver errores |
| Health check falla | Verificar `DATABASE_URL` en `.env` y reiniciar |
