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

### ✅ Tareas Completadas
*   **Tarea 3.1: Formalización de Infraestructura** (Completado)
*   **Tarea 3.2: E2E Testing en Docker** (Completado)
*   **Tarea 3.3: Infraestructura LLM** (Completado)
*   **Tarea 3.4: Preparación para Despliegue** (Completado)
*   **Tarea 3.5: Integración de Entornos (DO + RunPod)** (Completado)
    *   Scripts actualizados para RunPod.
    *   Guía de integración creada.
    *   Verificación exitosa.

### 🔴 Track 5: Beta 2 - SAST Engine & Optimization
*   **Tarea 8.3: Automatización Total (CI/CD)** [ ]
    *   **Contexto**: Automatizar despliegues a producción.
    *   **Acción**: Habilitar workflows de GitHub Actions para CD.

*   **Soporte a Tareas 8.1 y 8.2**:
    *   Agregar servicio Redis a `docker-compose.yml`.
    *   Gestionar volúmenes para reglas de Semgrep.

### 🚀 Tarea Actual: Tarea 8.3 - Automatización Total (CI/CD)
**Objetivo**: Habilitar el despliegue continuo en DigitalOcean.

**Pasos**:
1.  **Revisión**: Verificar secretos en GitHub (`DIGITALOCEAN_HOST`, `DIGITALOCEAN_SSH_KEY`, etc.).
2.  **Activación**: Habilitar/Crear workflow `.github/workflows/deploy.yml`.
3.  **Prueba**: Realizar un push y verificar el despliegue automático.

**Estado**: 🔄 **En Progreso**


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
