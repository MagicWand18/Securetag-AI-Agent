# 🛡️ Plan de Resiliencia y Migraciones (Liquibase)

## 1. Objetivo
Migrar el sistema actual de gestión de base de datos (scripts SQL manuales) a un sistema profesional, versionado y automatizado, garantizando la integridad del esquema ("Schema Drift prevention") y la capacidad de recuperación ante desastres.

## 2. Selección de Herramienta: Liquibase

Tras evaluar Flyway, Prisma Migrate y Liquibase, seleccionamos **Liquibase** por:
1.  **Agnóstico**: Funciona excelente con PostgreSQL pero permite abstracción.
2.  **Checksums**: Detecta si un script ya ejecutado ha sido modificado ilegalmente (integridad).
3.  **Formatos Flexibles**: Permite SQL nativo (lo que ya tenemos) enriquecido con metadatos YAML/XML.
4.  **Rollbacks**: Soporte nativo para definir scripts de reversión.

## 3. Plan de Implementación (Tarea 9.5)

### Fase 1: Setup Inicial (Dockerización)
1.  **Contenedor Liquibase**: Agregar un servicio `securetag-migrate` en `docker-compose.yml`.
    *   Imagen: `liquibase/liquibase:latest`
    *   Network: `securetag-net` (acceso a `securetag-db`)
    *   Volumen: `./migrations:/liquibase/changelog`
2.  **Configuración**: Crear `liquibase.properties` o usar variables de entorno para conexión DB.

### Fase 2: Refactorización de Migraciones Existentes
Actualmente tenemos archivos SQL sueltos (`001_...sql` a `012_...sql`).
1.  **Master Changelog**: Crear un archivo `changelog-master.xml` (o YAML) que incluya los archivos SQL en orden.
2.  **Conversión a ChangeSets**:
    *   Opción A (Rápida): Usar `include file` para los SQLs existentes.
    *   Opción B (Recomendada): Envolver cada SQL en un formato "SQL formateado" de Liquibase para agregar metadatos (autor, id, rollback).
    *   *Ejemplo*:
        ```sql
        --liquibase formatted sql
        --changeset securetag:001_initial_schema
        CREATE TABLE ...
        --rollback DROP TABLE ...
        ```
3.  **Baseline**: Como la BD ya existe en producción, necesitaremos hacer un "changelog sync" inicial para marcar las migraciones existentes como ejecutadas sin volver a correrlas.

### Fase 3: Automatización de Backups (Resiliencia)
Implementar un contenedor "Sidecar" para backups.
1.  **Servicio `db-backup`**:
    *   Imagen: `postgres:18-alpine` (cliente).
    *   Script: Cron job que ejecuta `pg_dump`.
    *   **Cifrado**: Tubería (`pipe`) de salida a `gpg` o `openssl` antes de guardar en disco/S3.
    *   Destino: Volumen persistente local o bucket S3 (AWS/DigitalOcean Spaces).
2.  **Script de Restauración**:
    *   Script documentado y probado para descifrar y restaurar (`pg_restore`).

### Fase 4: Integración CI/CD
1.  En el pipeline de despliegue, ejecutar `liquibase update` antes de levantar la nueva versión de la aplicación.
2.  Si la migración falla, el despliegue se detiene automáticamente.

## 4. Comparativa de Herramientas

| Característica | Liquibase | Flyway | Prisma Migrate |
| :--- | :--- | :--- | :--- |
| **Formato** | SQL, XML, YAML, JSON | SQL, Java | Schema.prisma (DSL) |
| **Rollbacks** | ✅ Nativo (First-class) | ❌ Versión Pro/Enterprise | ❌ Complicado (Down migrations) |
| **Integridad** | ✅ Checksums estrictos | ✅ Checksums | ✅ Shadow Database |
| **Curva Aprendizaje** | Media | Baja | Baja (si usas Prisma ORM) |
| **Recomendación** | **Ganador** (Robustez/Rollbacks) | Bueno, pero rollbacks de pago | No usamos Prisma ORM |

## 5. Próximos Pasos Inmediatos
1.  Crear estructura de directorio `migrations/liquibase`.
2.  Mover SQLs actuales y crear `master-changelog.yaml`.
3.  Probar flujo `docker compose up` con el nuevo contenedor de migración.
