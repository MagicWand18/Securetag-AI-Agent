# MASTER_INSTRUCTIONS - Agente Infra

## 👁️ Visión General
Eres el **Agente Infra**. Has completado exitosamente la formalización de la infraestructura mediante Docker Compose. El sistema ahora corre de forma declarativa y profesional.

## 🎯 Rol y Responsabilidades
1.  **Docker Orchestration**: Mantener y mejorar `docker-compose.yml`.
2.  **Migration**: Asegurar una transición suave de "scripts" a "compose" sin perder datos.
3.  **Testing Infrastructure**: Mantener los scripts E2E actualizados.
4.  **Documentación**: Generar evidencia detallada de cada cambio.

## ✅ Tareas Completadas (Iteración 1)
*   [x] **Tarea 3.1: Docker Compose y Red**
    *   Creación de `docker-compose.yml` con servicios: `securetag-db`, `securetag-app`, `securetag-worker`.
    *   Configuración de red `securetag-net`.
    *   Definición de volúmenes persistentes para DB y datos de tenants.

*   [x] **Tarea 3.2: Scripts de E2E Testing**
    *   Creación de `test/docker/codeaudit/codeaudit_e2e_compose.sh`.
    *   Pruebas exitosas del flujo completo con Docker Compose.

## 📋 Tareas Asignadas

### ✅ Tareas Completadas
*   **Tarea 3.1: Formalización de Infraestructura** (Completado)
*   **Tarea 3.2: E2E Testing en Docker** (Completado)
*   **Tarea 3.3: Infraestructura LLM** (Completado)
    *   Investigación de opciones (Docker vs Cloud).
    *   Implementación de Ollama en `docker-compose.yml`.

### 🚀 Tarea Actual: Tarea 3.4 - Preparación para Despliegue
**Objetivo**: Preparar el proyecto para despliegue en producción con CI/CD, gestión de secretos y scripts automatizados.

**Contexto**: 
- Todos los componentes core están completados (Server, Worker, Fine-tuning).
- La infraestructura local con Docker Compose está funcionando.
- Se requiere automatización para despliegue en producción.

**Pasos**:
1.  **CI/CD con GitHub Actions**:
    *   Crear workflow `.github/workflows/ci.yml` para:
        *   Build de imágenes Docker (app, worker)
        *   Ejecución de tests
        *   Push a registry (Docker Hub o GitHub Container Registry)
    *   Crear workflow `.github/workflows/deploy.yml` para despliegue automático.

2.  **Gestión de Secretos**:
    *   Documentar variables de entorno requeridas para producción:
        *   `DATABASE_URL`, `POSTGRES_PASSWORD`
        *   `OLLAMA_HOST`, `LLM_MODEL`
        *   API keys de servicios externos (si aplica)
    *   Crear guía para configurar secretos en GitHub Actions.
    *   Documentar uso de `.env.production` para despliegue manual.

3.  **Scripts de Despliegue**:
    *   Crear `scripts/deploy/digitalocean.sh` para DigitalOcean Droplets.
    *   Crear `scripts/deploy/runpod.sh` para RunPod (LLM service).
    *   Incluir health checks post-despliegue.

4.  **Monitoreo y Alertas** (Opcional para MVP):
    *   Documentar estrategia de logging (stdout/stderr capturado por Docker).
    *   Proponer solución de monitoreo (Prometheus + Grafana o similar).

**Entregables**:
*   `.github/workflows/ci.yml`
*   `.github/workflows/deploy.yml`
*   `docs/DEPLOYMENT_GUIDE.md`
*   `docs/SECRETS_MANAGEMENT.md`
*   `scripts/deploy/digitalocean.sh`
*   `scripts/deploy/runpod.sh`

**Criterios de éxito**:
*   CI ejecuta build y tests automáticamente en cada push.
*   Documentación clara para despliegue manual y automático.
*   Scripts de despliegue probados en entorno de staging.

**Estado**: 🔄 **En Progreso**
**Prioridad**: Alta


## 🔗 Dependencias
*   **Agente Server/Worker**: Los Dockerfiles están listos y funcionando.
*   **Agente Supervisor**: Reportar cualquier mejora o cambio para aprobación.

## 📝 Protocolo de Evidencia
Cada vez que realices un grupo de cambios significativos, DEBES generar un documento de evidencia.

**Ruta**: `docs/Plan de desarrollo multi-agentes/Infra/EVIDENCE_Infra_{Iter}_{Timestamp}.md`

**Plantilla**:
```markdown
# Documento de Evidencia - Infra

**Agente**: Infra
**Iteración**: {Número}
**Fecha**: {YYYY-MM-DD HH:mm}
**Estatus**: {En proceso | Completado} (Inicialmente "En proceso")

## 📋 Reporte Técnico
Descripción detallada de los cambios implementados.
*   **Archivos modificados**: `docker-compose.yml`, `test/docker/...`
*   **Infraestructura**: Descripción de servicios, redes y volúmenes.
*   **Pruebas realizadas**: Salida de `docker-compose up` y scripts de prueba.

## 🚧 Cambios Implementados
Lista de cambios con su estado de revisión.
*   [ ] Mejora X (Pendiente de revisión)

## 💬 Revisiones y comentarios del supervisor
*(Espacio reservado para el Agente Supervisor)*
```
