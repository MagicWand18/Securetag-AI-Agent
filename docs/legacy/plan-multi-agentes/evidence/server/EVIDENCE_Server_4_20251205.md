# Documento de Evidencia - Server (Task 8.4)

**Agente**: Server
**Iteración**: Beta 2
**Fecha**: 2025-12-06
**Estatus**: Completado

## 📋 Reporte Técnico

Se han implementado las funcionalidades de negocio requeridas para la gestión de proyectos y re-scanning.

### 1. Cambios en Base de Datos
*   **Migración 008 (`migrations/008_create_projects.sql`)**:
    *   Creada tabla `securetag.project` para agrupar escaneos.
    *   Agregado índice único `(tenant_id, alias)` para permitir nombres legibles como "backend-core".
    *   Agregadas columnas a `securetag.task`: `project_id`, `previous_task_id`, `is_retest`.
    *   Corregido `scripts/init-db.sh` para manejar dinámicamente el UUID del tenant de producción.

### 2. Cambios en API Server
*   **POST /codeaudit/upload**:
    *   Ahora acepta parámetro `project_alias`.
    *   Crea automáticamente el proyecto si no existe (upsert).
    *   Detecta si hay un escaneo previo exitoso (`completed`) para marcar el nuevo como `is_retest`.
*   **GET /projects**:
    *   Nuevo endpoint para listar proyectos del tenant.
*   **GET /projects/{alias}/history**:
    *   Nuevo endpoint para ver el historial de escaneos de un proyecto específico.

### 3. Pruebas Realizadas

#### Prueba 1: Creación de Proyecto y Scan Inicial
```bash
curl -X POST http://localhost:8080/codeaudit/upload \
  -H "X-API-Key: test-api-key-123" \
  -F "file=@test.zip" \
  -F "project_alias=backend-core"
```
**Resultado**: Proyecto creado, tarea encolada con `isRetest: false`.

#### Prueba 2: Listado de Proyectos
```bash
curl -X GET http://localhost:8080/projects
```
**Resultado**: Retorna JSON con el proyecto "backend-core".

#### Prueba 3: Detección de Retest
```bash
curl -X POST http://localhost:8080/codeaudit/upload ...
```
**Resultado**: Tarea encolada con `isRetest: true` al detectar el scan previo completado.

#### Prueba 4: Historial
```bash
curl -X GET http://localhost:8080/projects/backend-core/history
```
**Resultado**: Lista de tareas asociadas al proyecto ordenadas por fecha.

### 4. Refinamientos de Privacidad y Diffing (Hotfix)
*   **Sanitización de Respuesta**:
    *   Se ocultaron campos internos (`rule_id`, `fingerprint`) en `GET /codeaudit/{id}`.
    *   Se normalizaron las rutas de archivos (`file_path`) para ser siempre relativas, ocultando la estructura interna del servidor.
*   **Estabilidad del Motor de Análisis**:
    *   Worker actualizado para generar fingerprints estables independientes de la ruta absoluta de ejecución.
    *   Corrección en lógica de diffing para garantizar detección precisa de `new`, `fixed` y `residual`.

## 🚧 Cambios Implementados
*   [x] Migración SQL 008 aplicada y verificada.
*   [x] Lógica de API Server implementada y desplegada en contenedor local.
*   [x] Script `init-db.sh` robustecido.
*   [x] Sanitización de API y corrección de Diffing.
*   [x] Actualización de documentación (Guía Spartane).

## 💬 Notas Adicionales
Se detectó una inconsistencia en el esquema de base de datos (tenant_id UUID vs VARCHAR en migraciones antiguas). Se corrigió la migración 008 para usar UUID y se ajustó el script de inicialización para buscar el ID real del tenant.
