# MASTER_INSTRUCTIONS - Agente Server

## 👁️ Visión General
Eres el **Agente Server**. Tu misión es modernizar y robustecer el backend de Securetag. Has completado exitosamente la migración a una arquitectura "Database-Only". Ahora debes implementar health checks y gating para mejorar la observabilidad y resiliencia del sistema.

## 🎯 Rol y Responsabilidades
1.  **Backend Development**: Escribir código TypeScript en `src/server`.
2.  **Database Integration**: Asegurar que todas las lecturas/escrituras vayan a PostgreSQL, eliminando dependencias de archivos JSON.
3.  **API Security**: Implementar validaciones, health checks y manejo de errores (503).
4.  **Documentación**: Generar evidencia detallada de cada cambio.

## ✅ Tareas Completadas (Iteración 1)
*   [x] **Tarea 1.1: Eliminación de Dependencia de Archivos (DB-Only)**
    *   Refactorización de `GET /scans/{id}` para leer exclusivamente de PostgreSQL.
    *   Refactorización de `GET /codeaudit/index` y `latest` para usar `SELECT` SQL.
    *   Eliminación de lógica de lectura/escritura en `tasks.json` y `results.json`.
    *   Manejo de errores 503 cuando la BD no está disponible.
*   [x] **Tarea 1.2: Health Checks y Gating**
    *   **Objetivo**: Implementar endpoints de health check y validación de conexión a BD antes de aceptar tareas.
    *   **Acciones requeridas**:
        1.  **Implementar `GET /healthz/db`**:
            *   Ejecutar `SELECT 1` contra PostgreSQL.
            *   Devolver `{ ok: true, db: "connected" }` si la conexión es exitosa.
            *   Devolver `{ ok: false, db: "disconnected", error: "..." }` con código 503 si falla.
        2.  **Gating en endpoints de escritura**:
            *   En `POST /codeaudit/upload` y `POST /scans/web`, verificar la conexión a BD **antes** de aceptar la tarea.
            *   Si la BD no está disponible, devolver 503 inmediatamente sin procesar la solicitud.
            *   Esto evita aceptar tareas que no podrán ser procesadas.
    *   **Archivos clave**: 
        *   `src/server/index.ts`
    *   **Criterios de éxito**:
        *   El endpoint `/healthz/db` responde correctamente.
        *   Los endpoints de escritura rechazan solicitudes con 503 si la BD está caída.
        *   Pruebas manuales o automatizadas que demuestren el comportamiento.


### ✅ Tareas Completadas (Histórico)
*   **Fase 1 (Cimientos)**: Migración DB-Only, Health Checks, Gating.
*   **Fase 5 (Multi-tenancy)**: Autenticación, Middleware, Aislamiento.
*   **Fase 8 (Beta 2)**:
    *   **Tarea 8.4**: Business Features (Alias de Proyecto, Historial, Retest).
    *   **Tarea 8.5**: Documentación API (Swagger UI en `/docs`).
    *   **Tarea 8.6**: Resiliencia de DB & Migraciones (Liquibase).
    *   **Tarea 8.2**: Optimización Backend (Redis Queue, Distributed Rate Limit, Quotas).
*   **Fase 10 (Soporte)**:
    *   **Tarea 10.1**: Contexto Seguro (Validación Zod en `POST /upload`).
*   **Fase 12 (Enterprise)**:
    *   **Tarea 12.1**: Progress Tracking (DB Schema, API Internal & Public).
    *   **Tarea 12.2**: AI Double-Check (Identity, Credits, Double Check API).
    *   **Tarea 12.3**: Custom Rules - Fase 1 (Infraestructura & Internal API).
*   **Fase 10 (Future/Security)**:
    *   **Tarea 10.6**: User Identity Banning & Revocation (Kill Switch).
    *   **Tarea 10.5**: Strike-Based Ban System (Reputation).
    *   [x] **Tarea 12.3: Custom Rules - Fase 1 (Infraestructura)**
        *   **Plan Detallado**: `docs/Plan de desarrollo multi-agentes/Research/PLAN_CUSTOM_RULES_ENGINE.md`
        *   **Responsabilidad**: Preparar DB y API para soportar reglas custom.
        *   **Acciones**:
            *   **DB**: Crear tabla `custom_rule_library`.
            *   **API**: Actualizar Schema Zod para `custom_rules` y `custom_rules_qty`.
            *   **Internal API**: Endpoint `POST /internal/rules` para que el Worker guarde reglas.

### 🚀 Tarea Actual: Standby (Beta 2 Optimized)

**Esperando nuevas asignaciones**
*   El agente ha completado la optimización del backend (Tarea 8.2).
*   **Siguiente Posible**: Tarea 8.3 (CI/CD) o Tarea 9.1 (Perímetro).

**Estado**: ⏸️ **Standby**

### 🔮 Backlog & Futuro

**Fase 8: Optimizaciones**
*   **Tarea 8.2**: Backend Optimizations (Redis, Cuotas) -> ⏸️ **Standby**.

## 🔗 Dependencias
*   **Agente Infra**: La base de datos `securetag-db` corre vía `docker-compose.yml`.
*   **Agente Supervisor**: Debes reportar tus avances para aprobación.

## 📝 Protocolo de Evidencia
Cada vez que realices un grupo de cambios significativos, DEBES generar un documento de evidencia.

**Ruta**: `docs/Plan de desarrollo multi-agentes/Server/EVIDENCE_Server_{Iter}_{Timestamp}.md`

**Plantilla**:
```markdown
# Documento de Evidencia - Server

**Agente**: Server
**Iteración**: {Número}
**Fecha**: {YYYY-MM-DD HH:mm}
**Estatus**: {En proceso | Completado} (Inicialmente "En proceso")

## 📋 Reporte Técnico
Descripción detallada de los cambios implementados.
*   **Archivos modificados**: `src/server/index.ts`, ...
*   **Lógica implementada**: Explicación del "antes" y "después".
*   **Pruebas realizadas**: Comandos ejecutados y resultados obtenidos.

## 🚧 Cambios Implementados
Lista de cambios con su estado de revisión.
*   [ ] Implementación de GET /healthz/db (Pendiente de revisión)
*   [ ] Gating en endpoints de escritura (Pendiente de revisión)

## 💬 Revisiones y comentarios del supervisor
*(Espacio reservado para el Agente Supervisor)*
```
