# Documento de Evidencia - Server

**Agente**: Server
**Iteración**: 12.3
**Fecha**: 2025-12-18 21:45
**Estatus**: Completado

## 📋 Reporte Técnico
Se ha implementado la infraestructura necesaria en el backend para soportar la generación de reglas personalizadas (Custom Rules Engine). Esto incluye cambios en la base de datos para almacenar las reglas y la configuración de las tareas, así como actualizaciones en la API para aceptar estas solicitudes y permitir al Worker persistir los resultados.

*   **Archivos modificados**:
    *   `src/server/index.ts`: Implementación de lógica de extracción de parámetros `custom_rules` y `custom_rules_qty`, validación de créditos, inserción en DB y nuevo endpoint `/internal/rules`.
    *   `src/server/schemas.ts`: Actualización de `UploadMetadataSchema` para validar los nuevos parámetros.
    *   `migrations/018_create_custom_rule_library.sql`: Nueva migración SQL.
    *   `migrations/changelog-master.xml`: Registro de la migración.
*   **Lógica implementada**:
    *   **DB**: Creada tabla `securetag.custom_rule_library` y añadida columna `custom_rules_config` a `securetag.task`.
    *   **API Public**: `POST /codeaudit/upload` ahora acepta y valida `custom_rules` (bool) y `custom_rules_qty` (int). Verifica saldo de créditos antes de encolar.
    *   **API Internal**: `POST /internal/rules` permite al Worker guardar reglas generadas, securizado via autenticación de API Key.
*   **Pruebas realizadas**:
    *   Script `scripts/test_custom_rules.sh` ejecutado exitosamente.
    *   Verificado que `custom_rules_config` se guarda correctamente en la tabla `task`.
    *   Verificado que `/internal/rules` inserta correctamente en `custom_rule_library`.

## 🚧 Cambios Implementados
*   [x] Migración DB (Tabla `custom_rule_library`)
*   [x] Actualización API Pública (`custom_rules` param)
*   [x] Endpoint Interno (`POST /internal/rules`)
*   [x] Verificación de Créditos (Pre-check)

## 💬 Revisiones y comentarios del supervisor
*(Espacio reservado para el Agente Supervisor)*
