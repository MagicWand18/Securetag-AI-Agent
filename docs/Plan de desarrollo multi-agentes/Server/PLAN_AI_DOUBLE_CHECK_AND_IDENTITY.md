# Plan de Desarrollo: Enterprise Identity & AI Double Check

**Fecha**: 2025-12-17
**Autor**: Agente Server
**Versión**: 1.1 (Actualizado tras implementación Backend)
**Estado**: En Progreso (Backend Completado)

---

## 1. Visión General

Este documento detalla la arquitectura para transformar Securetag de un modelo simple de "Tenant con API Keys" a una plataforma Enterprise multi-usuario con capacidades avanzadas de IA.

**Objetivos Clave:**
1.  **Refactorización de Identidad**: Implementar jerarquía `Tenant` -> `User` -> `API Key`.
2.  **Monetización (Créditos)**: Sistema de control de cuotas para servicios premium.
3.  **AI Double Check**: Validación secundaria de hallazgos usando LLMs externos (OpenAI/Claude) con estrategia de fallback y transparencia total para el usuario.

---

## 2. Arquitectura de Datos (Database Schema)

Se realizarán cambios estructurales en PostgreSQL mediante migraciones Liquibase.

### 2.1. Nueva Entidad: `User`
Se introduce la tabla `securetag.app_user` (evitamos `user` por ser palabra reservada en SQL estándar).

```sql
CREATE TABLE securetag.app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES securetag.tenant(id),
    email TEXT NOT NULL,
    full_name TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'member', -- admin, member, viewer
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(email)
);
```

### 2.2. Actualización: `API Key`
Las llaves de API ahora pertenecerán a un usuario específico, manteniendo la referencia al tenant para performance.

```sql
ALTER TABLE securetag.api_key ADD COLUMN user_id UUID REFERENCES securetag.app_user(id);
-- Nota: Inicialmente nullable para migración, luego se podrá forzar NOT NULL
```

### 2.3. Sistema de Créditos (`Tenant`)
Los créditos son un recurso organizacional, no individual.

```sql
ALTER TABLE securetag.tenant ADD COLUMN credits_balance INTEGER NOT NULL DEFAULT 0;
```

### 2.4. Configuración AI (`Task`)
Persistencia de la configuración de "segunda opinión".

```sql
ALTER TABLE securetag.task ADD COLUMN double_check_config JSONB;
-- Ejemplo: { "level": "pro", "provider_used": "openai", "model_used": "gpt-5.2" }
```

### 2.5. Configuración de Proveedores por Tenant (`Tenant`)
Para permitir un control de consumo granular, cada tenant podrá tener asignadas sus propias credenciales. **IMPORTANTE**: Esta configuración es aprovisionada exclusivamente por los administradores de Securetag, no por el cliente.

```sql
-- Se usará PGP_SYM_ENCRYPT de pgcrypto para guardar esto seguro
ALTER TABLE securetag.tenant ADD COLUMN llm_config JSONB;
-- Estructura interna (cifrada o protegida):
-- {
--   "openai": { "api_key": "sk-...", "org_id": "org-..." },
--   "anthropic": { "api_key": "sk-ant-..." }
-- }
```

---

## 3. Lógica de Negocio

### 3.1. Niveles de Servicio y Créditos
Se definen 3 niveles de servicio para el Double Check, con diferentes costos y potencias de modelo.

| Nivel | Costo (Créditos) | Modelo OpenAI (Primary) | Modelo Claude (Fallback) |
| :--- | :---: | :--- | :--- |
| **Standard** | **1** | GPT-5 Mini | Claude Haiku 3 |
| **Pro** | **2** | GPT-5.2 | Claude Haiku 4.5 |
| **Max** | **3** | GPT-5.2 Pro | Claude Opus 4.5 |

Nota: todos los modelos mencionados si existen, sino los conoces buscalos en internet, no asumas que no existen.


### 3.2. Gestión de Créditos
*   **Validación Previa**: `tenant.credits_balance >= costo_nivel`.
*   **Deducción**: Se descuentan los créditos correspondientes al nivel solicitado tras un análisis exitoso.
*   **Política de Fallo**: Sin costo si ambos proveedores fallan.

### 3.3. Selección de Proveedor y Credenciales
El sistema resolverá las credenciales en el siguiente orden de prioridad:

1.  **Credenciales del Tenant**: Si el tenant tiene `llm_config` configurado para el proveedor, se usa esa llave. Esto permite facturación granular y aislamiento.
2.  **Credenciales del Sistema**: Si no hay configuración de tenant, se usan las variables de entorno globales (`.env`).

**Flujo de Inferencia:**
1.  Determinar Nivel (`standard` por defecto).
2.  Resolver Llave OpenAI (Tenant o Sistema).
3.  Intentar OpenAI.
4.  Si falla -> Resolver Llave Claude (Tenant o Sistema).
5.  Intentar Claude.
6.  Si falla -> Devolver error controlado (sin cobro).

**Configuración Centralizada (`.env`) - Default System Keys:**
```bash
# System Fallback Keys
AI_PROVIDER_OPENAI_KEY=sk-...
AI_PROVIDER_ANTHROPIC_KEY=sk-ant-...

# Model Mapping 
AI_MODEL_OPENAI_STANDARD=gpt-5-mini-2025-08-07
AI_MODEL_OPENAI_PRO=gpt-5.2-2025-12-11
AI_MODEL_OPENAI_MAX=gpt-5.2-pro-2025-12-11

AI_MODEL_ANTHROPIC_STANDARD=claude-haiku-4-5
AI_MODEL_ANTHROPIC_PRO=claude-sonnet-4-5
AI_MODEL_ANTHROPIC_MAX=claude-opus-4-5
```

---

## 4. Plan de Implementación

### Fase 1: Cimientos de Identidad (Breaking Changes) - ✅ COMPLETADO
1.  Crear migración SQL `014_create_users_table.sql`.
2.  Crear migración SQL `015_link_apikey_to_user.sql`.
3.  Actualizar scripts de inicialización (`init-db.sh`) para crear un usuario default `admin@securetag.io` ligado al tenant `production`.

### Fase 2: Sistema de Créditos - ✅ COMPLETADO
1.  Crear migración SQL `016_add_tenant_credits.sql`.
2.  Actualizar `init-db.sh` para asignar créditos iniciales (ej. 100) al tenant `production` para pruebas.

### Fase 3: AI Double Check Backend - ⚠️ PARCIAL (API Ready, Worker Pending)
1.  Crear migración SQL `017_add_task_double_check.sql` - ✅ COMPLETADO
2.  Implementar servicio `AIService` en Node.js (Worker): - ⏳ PENDIENTE (Corresponde al Agente Worker)
    *   **Worker Architecture**:
        *   Crear `src/worker/services/AIProvider.ts`: Interfaz y clientes (OpenAI, Anthropic).
        *   Crear `src/worker/services/CreditsManager.ts`: Manejo de consumo y validación de saldo.
        *   Actualizar `src/worker/TaskExecutor.ts`: Integrar el paso de Double Check tras el análisis SAST.
    *   **Lógica de Negocio**:
        *   Leer `double_check_config` de la tarea.
        *   Filtrar hallazgos por nivel (crítico/alto).
        *   **Reutilización de Prompt**: Usar exactamente el mismo prompt y contexto que se envía a RunPod (modelo propio), pero dirigido a los proveedores externos.
        *   Ejecutar inferencia con fallback.
        *   Actualizar hallazgos con resultado de IA (Campo `analysis_double_check`).
        *   Descontar créditos por hallazgo procesado.
3.  Actualizar endpoint `POST /codeaudit/upload`: - ✅ COMPLETADO
    *   Aceptar param `double_check=true`.
    *   Validar créditos disponibles.

### Fase 4: Baneo y Seguridad - ⏳ PENDIENTE
1.  Actualizar lógica de `banEntity`:
    *   Soportar baneo por `user_id` (además de IP/Key).
    *   Si un usuario es malicioso, invalidar todas sus API Keys.

---

## 5. Estrategia de Migración (Datos Existentes)
Dado que estamos en Beta 2 con datos "locales", podemos aplicar una estrategia de migración destructiva controlada o una migración de datos suave.

*   **Estrategia Elegida**: **Migración Suave**.
    *   Se creará un usuario "System Owner" por defecto para cada Tenant existente.
    *   Todas las API Keys huérfanas existentes se asignarán a este usuario "System Owner".
    *   Esto asegura que nadie pierda acceso tras la actualización.

