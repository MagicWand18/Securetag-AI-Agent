# Plan de Optimización Backend: Redis & BullMQ (Tarea 8.2)

**Fecha**: 2025-12-19
**Objetivo**: Migrar la arquitectura de "Polling" a "Event-Driven" utilizando Redis y BullMQ, e implementar controles de escalabilidad (Rate Limiting distribuido y Cuotas de almacenamiento).

## 📋 Resumen Ejecutivo
Transformaremos el sistema actual donde el Worker consulta la DB cada 5 segundos, a un sistema reactivo donde el Server empuja tareas a una cola Redis y el Worker las procesa inmediatamente. Esto reduce latencia y carga en la base de datos.

---

## 📅 Fases de Ejecución

### 🏗️ Fase 1: Infraestructura (Redis) - COMPLETADO
**Objetivo**: Desplegar Redis en el entorno local Docker.

1.  **Actualizar `docker-compose.yml`**:
    *   Agregar servicio `securetag-redis` (imagen `redis:alpine`).
    *   Exponer puerto 6379 (internamente).
    *   Configurar persistencia de datos (volumen).
2.  **Configuración de Entorno**:
    *   Definir variables `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` en `docker-compose.yml` para `securetag-app` y `securetag-worker`.

**✅ Criterios de Aceptación / Verificación**:
*   [x] `docker compose up -d securetag-redis` inicia correctamente.
*   [x] **Test Manual**: Script simple en Node.js que conecta a Redis desde un contenedor y hace un PING.

---

### 🔌 Fase 2: Dependencias y Utilidades Core - COMPLETADO
**Objetivo**: Preparar el código base para interactuar con Redis.

1.  **Instalación de Paquetes**:
    *   `npm install bullmq ioredis rate-limit-redis`
    *   `npm install -D @types/ioredis`
2.  **Módulo de Conexión (`src/utils/redis.ts`)**:
    *   Implementar patrón Singleton para la conexión Redis.
    *   Manejo de errores de conexión y reconexión automática.
    *   Exportar instancia para reutilización.

**✅ Criterios de Aceptación / Verificación**:
*   [x] **Unit Test (`test/utils/redis.test.ts`)**:
    *   Test de conexión exitosa.
    *   Test de manejo de error (cuando Redis está abajo).

---

### 📤 Fase 3: Productor de Eventos (Server) - COMPLETADO
**Objetivo**: Que el servidor envíe tareas a la cola en lugar de solo guardar en DB.

1.  **Inicializar Colas**:
    *   Crear instancia `Queue` de BullMQ en `src/server/queues.ts`.
2.  **Refactorizar Endpoints**:
    *   `POST /codeaudit/upload`: Además del `INSERT` en Postgres, hacer `queue.add('codeaudit', { ... })`.
    *   `POST /scans/web`: Además del `INSERT`, hacer `queue.add('web', { ... })`.
    *   *Nota*: Mantenemos el INSERT en DB para historial y estado inicial, pero el trigger de ejecución pasa a ser Redis.

**✅ Criterios de Aceptación / Verificación**:
*   [x] **Integration Test (`test/server/producer.test.ts`)**:
    *   Llamar al endpoint API.
    *   Verificar que el trabajo existe en Redis (usando `queue.getJob()`).

---

### 📥 Fase 4: Consumidor de Eventos (Worker) - COMPLETADO
**Objetivo**: Reemplazar el bucle de polling por un Worker de BullMQ.

1.  **Refactorizar `entrypoint.ts`**:
    *   Eliminar el bucle `do...while` y `setTimeout`.
    *   Instanciar `Worker` de BullMQ.
2.  **Procesador de Trabajos**:
    *   Conectar el `TaskExecutor` existente al procesador del Worker BullMQ.
    *   Manejo de eventos: `completed`, `failed`.
    *   Actualizar estado en Postgres al finalizar (igual que antes, pero disparado por evento).

**✅ Criterios de Aceptación / Verificación**:
*   [x] **E2E Test Local**:
    *   Subir archivo vía API.
    *   Verificar logs del Worker: "Processing job..." inmediato.
    *   Verificar resultado final en DB.

---

### 🛡️ Fase 5: Escalabilidad y Protección - COMPLETADO
**Objetivo**: Proteger el sistema contra abusos usando Redis.

1.  **Rate Limiting Distribuido**:
    *   Actualizar middleware de seguridad en `src/server/index.ts`.
    *   Cambiar almacenamiento en memoria por `rate-limit-redis`.
2.  **Cuotas de Almacenamiento**:
    *   En `POST /codeaudit/upload`:
    *   Consultar uso actual del Tenant en DB.
    *   Si `(current_usage + file_size) > plan_limit`, rechazar (403).

**✅ Criterios de Aceptación / Verificación**:
*   [x] **Unit Test Rate Limit**:
    *   Simular N peticiones rápidas y verificar bloqueo consistente.
*   [x] **Unit Test Storage Quota**:
    *   Mockear respuesta de DB con uso lleno.
    *   Verificar que el upload es rechazado antes de procesar el archivo.

---

### 🧹 Fase 6: Limpieza y Despliegue - COMPLETADO
**Objetivo**: Eliminar código muerto y documentar.

1.  **Limpieza**: Borrar lógica de polling vieja en `WorkerClient`.
2.  **Documentación**: Actualizar `MASTER_INSTRUCTIONS` y guías de arquitectura.

**✅ Criterios de Aceptación / Verificación**:
*   [x] **Regression Test**: Ejecutar suite completa de tests existentes para asegurar que nada se rompió (validado mediante E2E).
