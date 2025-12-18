# 💰 Plan de Monetización: Deep Code Vision (Contexto Extendido)

**Estatus**: Borrador / Planificación
**Fecha**: 2025-12-18
**Objetivo**: Restringir la funcionalidad de "Deep Code Vision" (Contexto de 50 líneas) exclusivamente a usuarios con plan **Premium** o superior. Los usuarios del plan **Free** o **Standard** recibirán solo el snippet básico (línea única o contexto mínimo).

---

## 🏗️ Arquitectura de la Solución

El control de acceso se implementará mediante una validación en cascada: Base de Datos -> Servidor (API) -> Worker (Ejecutor).

### 1. Base de Datos (PostgreSQL)
Se necesita identificar el nivel de suscripción del `tenant` (cliente).
*   **Tabla**: `securetag.tenant`
*   **Cambio**: Agregar columna `plan_tier` o `features_json`.
    *   *Opción A (Simple)*: Columna `plan_tier` (ENUM: 'free', 'pro', 'enterprise').
    *   *Opción B (Flexible - Recomendada)*: Columna `features` (JSONB) para activar flags específicos (`{"deep_code_vision": true}`).

### 2. Servidor (API Endpoint)
Al momento de crear la tarea de auditoría (`POST /codeaudit/upload`), el servidor debe consultar el plan del cliente e inyectar esta "autorización" en el payload de la tarea.
*   **¿Por qué aquí?** Para evitar que el Worker tenga que consultar la base de datos de clientes constantemente, manteniendo la separación de responsabilidades. El Worker solo ejecuta lo que el Servidor le autoriza.

### 3. Worker (Task Executor)
El ejecutor leerá la autorización del payload del trabajo (`job`) y decidirá qué estrategia de contexto aplicar.
*   **Premium**: Estrategia actual (Header + 15 antes + 15 después).
*   **Free**: Estrategia legacy (Solo la línea afectada o +/- 1 línea).

---

## 📝 Pasos de Implementación

### Paso 1: Migración de Base de Datos
Agregar la capacidad de definir planes.

```sql
-- Ejemplo de migración
ALTER TABLE securetag.tenant ADD COLUMN plan_tier VARCHAR(50) DEFAULT 'free';
-- Opcional: Definir features por plan en una tabla de configuración o hardcoded en el backend
```

### Paso 2: Actualización del Servidor (`src/server/index.ts`)

**Archivo**: `src/server/index.ts`
**Ubicación**: Handler `POST /codeaudit/upload` (aprox. línea 343, donde se hace el INSERT a `task`).

**Lógica a implementar**:
1.  Recuperar el `plan_tier` del `tenantId` actual (ya tenemos el `tenantId` en `authReq`).
2.  Determinar si el plan incluye `deep_code_vision`.
3.  Inyectar esta flag en el `payload_json`.

```typescript
// Pseudocódigo
const tenantInfo = await dbQuery('SELECT plan_tier FROM securetag.tenant WHERE id=$1', [tenantId]);
const plan = tenantInfo.rows[0].plan_tier;
const enableDeepVision = (plan === 'pro' || plan === 'enterprise');

// Al guardar la tarea:
const payload = { 
    ...
    features: {
        deep_code_vision: enableDeepVision
    }
};
```

### Paso 3: Actualización del Worker (`src/worker/TaskExecutor.ts`)

**Archivo**: `src/worker/TaskExecutor.ts`
**Ubicación**: Método `executeSemgrep`, bloque de "Enhanced Context Extraction" (líneas 300+).

**Lógica a implementar**:
Leer la flag del job y condicionar la extracción.

```typescript
// Pseudocódigo
const useDeepVision = job.features && job.features.deep_code_vision;

if (useDeepVision) {
    // ... Lógica ACTUAL de 50 líneas (Header + 15 + 15) ...
} else {
    // ... Lógica LIMITADA (Solo snippet original o contexto mínimo) ...
    extendedContext = codeSnippet; // Fallback al snippet original de Semgrep
}
```

---

## 📊 Estimación de Esfuerzo

| Tarea | Complejidad | Tiempo Estimado | Riesgo |
| :--- | :---: | :---: | :---: |
| Migración DB | Baja | 15 min | Bajo |
| Lógica Servidor | Baja | 30 min | Bajo |
| Lógica Worker | Media | 45 min | Medio (Pruebas requeridas) |
| **Total** | **Baja-Media** | **~1.5 Horas** | **Bajo** |

## 🧪 Plan de Pruebas

1.  **Caso Free**:
    *   Configurar un tenant con `plan_tier = 'free'`.
    *   Ejecutar escaneo.
    *   Verificar que el prompt enviado al LLM solo contenga el snippet corto.
    *   Verificar que la respuesta del LLM sea menos detallada (posible "Needs Review").

2.  **Caso Premium**:
    *   Configurar tenant con `plan_tier = 'pro'`.
    *   Ejecutar escaneo.
    *   Verificar que el prompt contenga las 50 líneas.
    *   Verificar "True Positive" confirmado.

---

## 🚀 Siguientes Pasos (Cuando decidas ejecutarlo)

1.  Confirmar si preferimos columna `plan_tier` (simple) o `features` (granular).
2.  Ejecutar migración SQL.
3.  Modificar `src/server/index.ts`.
4.  Modificar `src/worker/TaskExecutor.ts`.
