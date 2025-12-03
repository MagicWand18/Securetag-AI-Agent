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
*   **Tarea 3.4: Preparación para Despliegue** (Completado)
    *   CI/CD con GitHub Actions.
    *   Scripts de despliegue (DO/RunPod).
    *   Gestión de secretos.

### 🚀 Tarea Actual: Tarea 3.5 - Integración de Entornos (DO + RunPod)
**Objetivo**: Conectar la infraestructura desplegada en DigitalOcean (App/Worker) con el servicio LLM en RunPod.

**Contexto**: 
- El Worker necesita consultar al LLM para analizar hallazgos.
- El LLM corre en RunPod (Serverless Endpoint).
- El Worker corre en DigitalOcean.
- Se requiere configurar `OLLAMA_HOST` de forma segura y dinámica.

**Pasos**:
1.  **Actualizar Script de Despliegue DO**:
    *   Modificar `scripts/deploy/digitalocean.sh` para leer `runpod-config.json` (si existe) o aceptar argumento `--llm-url`.
    *   Inyectar `OLLAMA_HOST` y `RUNPOD_API_KEY` en el contenedor del Worker.

2.  **Documentar Flujo de Conexión**:
    *   Crear guía paso a paso en `docs/INTEGRATION_GUIDE.md`:
        1. Deploy RunPod -> Obtener URL.
        2. Configurar Secretos/Env.
        3. Deploy DigitalOcean.

3.  **Verificación**:
    *   Crear script de prueba `scripts/verify-integration.sh` que haga una petición desde el contenedor Worker hacia RunPod.

**Entregables**:
*   `scripts/deploy/digitalocean.sh` (actualizado)
*   `docs/INTEGRATION_GUIDE.md`
*   `scripts/verify-integration.sh`

**Criterios de éxito**:
*   El Worker en DO puede analizar código usando el modelo en RunPod.
*   Proceso documentado y reproducible.

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
