# Gestión de Secretos - Securetag

## 📋 Variables de Entorno Requeridas

### Desarrollo Local

```bash
# .env (desarrollo)
NODE_ENV=development
PORT=8080

# Database
DATABASE_URL=postgres://securetag:securetagpwd@localhost:5432/securetag
POSTGRES_DB=securetag
POSTGRES_USER=securetag
POSTGRES_PASSWORD=securetagpwd

# Tenant
TENANT_ID=tenantA

# Directorios
DB_DIR=/var/securetag/tenantA/db
UPLOADS_DIR=/var/securetag/tenantA/uploads
WORK_DIR=/var/securetag/tenantA/work
RESULTS_DIR=/var/securetag/tenantA/results

# LLM (Ollama local)
OLLAMA_HOST=http://localhost:11434
MODEL=securetag-ai-agent:latest

# Semgrep (opcional)
SEMGREP_APP_TOKEN=
SEMGREP_ANONYMOUS_USER_ID=
SEMGREP_HAS_SHOWN_METRICS_NOTIFICATION=true
```

---

### Producción

```bash
# .env.production
NODE_ENV=production
PORT=8080

# Database (usar secretos reales)
DATABASE_URL=postgres://securetag:STRONG_PASSWORD_HERE@securetag-db:5432/securetag
POSTGRES_DB=securetag
POSTGRES_USER=securetag
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE

# Tenant
TENANT_ID=production

# Directorios
DB_DIR=/var/securetag/production/db
UPLOADS_DIR=/var/securetag/production/uploads
WORK_DIR=/var/securetag/production/work
RESULTS_DIR=/var/securetag/production/results

# LLM (RunPod Serverless)
OLLAMA_HOST=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID
RUNPOD_API_KEY=YOUR_RUNPOD_API_KEY
MODEL=securetag-ai-agent:finetuned

# Semgrep
SEMGREP_APP_TOKEN=YOUR_SEMGREP_TOKEN
SEMGREP_ANONYMOUS_USER_ID=YOUR_USER_ID
SEMGREP_HAS_SHOWN_METRICS_NOTIFICATION=true

# Monitoreo (opcional)
SENTRY_DSN=
LOG_LEVEL=info
```

---

## 🔐 Configuración de Secretos en GitHub Actions

### Paso 1: Crear Personal Access Token (PAT)

1. Ir a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generar nuevo token con permisos:
   - `write:packages` (para push a GitHub Container Registry)
   - `read:packages`
3. Copiar el token (solo se muestra una vez)

### Paso 2: Configurar Secretos en el Repositorio

1. Ir a tu repositorio → Settings → Secrets and variables → Actions
2. Click en "New repository secret"
3. Agregar los siguientes secretos:

#### Secretos Requeridos para CI

| Nombre | Descripción | Ejemplo |
|--------|-------------|---------|
| `GITHUB_TOKEN` | Token automático de GitHub | (auto-generado) |

#### Secretos Requeridos para Deploy

| Nombre | Descripción | Ejemplo |
|--------|-------------|---------|
| `DIGITALOCEAN_TOKEN` | API token de DigitalOcean | `dop_v1_abc123...` |
| `DIGITALOCEAN_HOST` | IP o hostname del Droplet | `123.45.67.89` |
| `DIGITALOCEAN_USER` | Usuario SSH (default: root) | `root` |
| `DIGITALOCEAN_SSH_KEY` | Private SSH key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `POSTGRES_PASSWORD` | Password de PostgreSQL | `strong_password_123` |
| `RUNPOD_API_KEY` | API key de RunPod | `RUNPOD-ABC123...` |
| `RUNPOD_ENDPOINT` | Endpoint ID de RunPod | `abc123xyz` |

#### Secretos Opcionales

| Nombre | Descripción |
|--------|-------------|
| `SLACK_WEBHOOK` | Webhook para notificaciones |
| `SENTRY_DSN` | DSN de Sentry para error tracking |
| `DOCKER_HUB_USER` | Usuario de Docker Hub (si usas Docker Hub) |
| `DOCKER_HUB_TOKEN` | Token de Docker Hub |

---

## 🔑 Generar Secretos Seguros

### Password de PostgreSQL

```bash
# Generar password seguro
openssl rand -base64 32
```

### SSH Key para DigitalOcean

```bash
# Generar nuevo par de llaves
ssh-keygen -t rsa -b 4096 -C "github-actions@securetag" -f ~/.ssh/securetag_deploy

# Copiar clave pública al Droplet
ssh-copy-id -i ~/.ssh/securetag_deploy.pub root@YOUR_DROPLET_IP

# Copiar clave privada a GitHub Secrets
cat ~/.ssh/securetag_deploy
# Copiar TODO el contenido (incluyendo BEGIN/END) a DIGITALOCEAN_SSH_KEY
```

---

## 📦 Configuración de DigitalOcean

### Crear Droplet

1. **Tamaño recomendado**: 
   - Desarrollo/Staging: 2 vCPUs, 4 GB RAM ($24/mes)
   - Producción: 4 vCPUs, 8 GB RAM ($48/mes)

2. **Imagen**: Ubuntu 22.04 LTS

3. **Configuración inicial**:

```bash
# SSH al Droplet
ssh root@YOUR_DROPLET_IP

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
apt install docker-compose-plugin -y

# Verificar instalación
docker --version
docker compose version

# Crear directorio de despliegue
mkdir -p /opt/securetag
chown -R $USER:$USER /opt/securetag

# Configurar firewall
ufw allow 22/tcp   # SSH
ufw allow 8080/tcp # App
ufw enable
```

---

## 🚀 Configuración de RunPod

### Obtener API Key

1. Ir a [RunPod.io](https://www.runpod.io/)
2. Settings → API Keys
3. Crear nueva API key
4. Copiar y guardar en GitHub Secrets como `RUNPOD_API_KEY`

### Configurar Docker Hub (para RunPod)

RunPod requiere imágenes en registry público:

```bash
# Login a Docker Hub
docker login

# Configurar secretos en GitHub
# DOCKER_HUB_USER: tu usuario
# DOCKER_HUB_TOKEN: token de acceso (Settings → Security → New Access Token)
```

---

## 🔒 Mejores Prácticas

### 1. Rotación de Secretos

- Rotar passwords cada 90 días
- Rotar API keys cada 6 meses
- Usar diferentes credenciales para staging y producción

### 2. Nunca Commitear Secretos

```bash
# Agregar a .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
echo "*.pem" >> .gitignore
echo "*.key" >> .gitignore
```

### 3. Usar Gestores de Secretos (Opcional)

Para producción enterprise, considerar:
- **HashiCorp Vault**
- **AWS Secrets Manager**
- **DigitalOcean App Platform Secrets**

### 4. Auditoría

- Revisar logs de acceso a secretos
- Monitorear uso de API keys
- Alertas para accesos no autorizados

---

## 🧪 Verificar Configuración

### Test Local

```bash
# Cargar .env
set -a
source .env
set +a

# Verificar variables
echo $DATABASE_URL
echo $OLLAMA_HOST

# Test de conexión a DB
docker compose exec securetag-db pg_isready -U securetag
```

### Test en CI

```bash
# Verificar que secretos están configurados
gh secret list

# Trigger workflow manualmente
gh workflow run ci.yml
```

---

## 📚 Referencias

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [DigitalOcean API Tokens](https://docs.digitalocean.com/reference/api/create-personal-access-token/)
- [RunPod API Documentation](https://docs.runpod.io/reference/api-reference)
- [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/)

---

## ⚠️ Troubleshooting

### Error: "GITHUB_TOKEN permissions insufficient"

**Solución**: Ir a Settings → Actions → General → Workflow permissions → Seleccionar "Read and write permissions"

### Error: "Cannot connect to DigitalOcean Droplet"

**Solución**: 
1. Verificar que SSH key está correctamente configurado
2. Verificar que firewall permite conexiones SSH (puerto 22)
3. Verificar IP del Droplet en secretos

### Error: "RunPod API authentication failed"

**Solución**:
1. Verificar que `RUNPOD_API_KEY` está correctamente configurado
2. Regenerar API key en RunPod dashboard
3. Verificar que key no tiene espacios o caracteres extra
