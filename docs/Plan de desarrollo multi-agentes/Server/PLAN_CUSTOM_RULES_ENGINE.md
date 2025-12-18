# 🧪 Plan de Implementación: Custom Rules Engine (Tarea 12.3)

**Objetivo**: Implementar un motor de generación de reglas SAST "On Demand" y un sistema de mantenimiento automático de la base de conocimiento, migrando la lógica de los scripts de investigación Python a la arquitectura robusta del Worker (TypeScript).

---

## 🏗️ 1. Arquitectura y Componentes

### 1.1 Server (Gestor de Peticiones & Librería)
*   **API**: `POST /codeaudit/upload` acepta nuevos parámetros:
    *   `custom_rules`: boolean (true para activar).
    *   `custom_rules_qty`: integer (min 1, default 3, max 10).
*   **Base de Datos**:
    *   Tabla `custom_rule_library`: Almacena las reglas generadas exitosamente.
        *   `id`: UUID
        *   `tenant_id`: UUID
        *   `rule_content`: YAML
        *   `stack_context`: JSON (tecnologías detectadas)
        *   `ai_metadata`: JSON (modelo usado, prompt version)
        *   `created_at`: Date
    *   Tabla `task`: Nueva columna `custom_rules_config` (JSONB).

### 1.2 Worker (Ejecutor Lógico)
Nueva clase `CustomRuleGenerator` (migración de `synthetic_rules_gen.py` a TS) con responsabilidades:
1.  **Stack Analysis**: Usa `ContextAnalyzer` para determinar el stack exacto (ej. "Node.js + Express + Mongoose"), ver contenido de archivos package.json, requirements.txt, etc.
2.  **Feasibility Check**: (Opcional) Validar si vale la pena generar reglas para este stack.
3.  **Generation Loop**: Ciclo de generación basado en `custom_rules_qty`.
    *   Gen Code (Vulnerable/Safe).
    *   Gen Rule (Semgrep YAML).
    *   Validate (Ejecutar Semgrep).
    *   Retry (Auto-correction).
4.  **Monetization**: Integración con `CreditsManager` para cobros complejos.

### 1.3 Maintenance Worker (Investigador Automático)
Nuevo tipo de tarea programada `research_maintenance`.
*   **Trigger**: Cronjob en Server que encola esta tarea cada X tiempo (ej. semanal).
*   **Objetivo**: Reemplazar la ejecución manual de `cve_monitor.py`.
*   **Flujo**:
    1.  Consultar APIs externas (NVD, CISA) desde el Worker.
    2.  Identificar CVEs recientes relevantes para los stacks soportados.
    3.  Generar reglas "Globales" (disponibles para todos los tenants).

---

## 💰 2. Modelo de Monetización y Tiers

### 2.1 Niveles de Acceso (Tiers)
El acceso a modelos de IA dependerá del Plan del Tenant (usando la lógica de `Deep_Code_Vision_Monetization_Plan.md`):

| Feature | Free | Standard (Paga) | Premium (Paga++) |
| :--- | :--- | :--- | :--- |
| **Custom Rules** | ❌ No disponible | ✅ Disponible | ✅ Disponible |
| **Modelos Disponibles** | N/A | • Securetag v1 (Finetuned)<br>• External Standard (GPT-4o-mini) | • Securetag v1<br>• External Standard<br>• External Pro (GPT-4o)<br>• External Max (o1/Claude Opus) |
| **Deep Code Vision** | ❌ No (Snippet) | ❌ No (Snippet) | ✅ Sí (50 líneas) |

### 2.2 Estructura de Costos (Security Credits)
El cobro se realiza en dos fases para ser justos con el usuario y cubrir nuestros costos de GPU/API.

**Fórmula**: `Costo Total = (Intentos * Costo_Intento) + (Reglas_Exitosas * Costo_Modelo)`

1.  **Costo por Intento (Processing Fee)**:
    *   **1 Crédito** por regla solicitada.
    *   Se cobra al inicio del proceso. Cubre el tiempo de cómputo y las llamadas fallidas.
    *   *Ejemplo*: Si pide 5 reglas, paga 5 créditos base.

2.  **Costo por Éxito (Success Fee)**:
    *   Se cobra **SOLO si la regla compila y valida** correctamente.
    *   El costo depende del modelo utilizado (configuración del usuario o auto-selección):
        *   **Standard**: +2 Créditos.
        *   **Pro**: +4 Créditos.
        *   **Max**: +9 Créditos.

**Ejemplo Práctico**:
Usuario Premium pide **4 reglas** usando modelo **Pro**.
*   Se logran generar **3 reglas válidas**. 1 falla.
*   Costo Intento: 4 * 1 = 4 créditos.
*   Costo Éxito: 3 * 4 = 12 créditos.
*   **Total descontado**: 16 créditos.

---

---

## 📝 3. Plan de Trabajo Detallado y Asignación

**Estrategia de Delegación**:
*   **Agente Server**: Prepara el terreno (DB, API, Cronjobs). **Debe ejecutarse PRIMERO**.
*   **Agente Worker**: Implementa la inteligencia (Migración Python->TS, Semgrep, OpenAI). **Ejecuta SEGUNDO**.

### Fase 1: Server Side (Infraestructura)
**Responsable**: 🤖 **Agente Server**
**Estado**: [ ] Pendiente

1.  **DB Migration**: Crear tabla `custom_rule_library`.
2.  **API Update**: Modificar `UserContextSchema` (zod) para aceptar `custom_rules` y `custom_rules_qty`.
3.  **Task Payload**: Asegurar que la configuración llegue al Worker en `payload_json`.
4.  **Internal API**: Crear endpoint para que el Worker guarde las reglas generadas (`POST /internal/rules`).

### Fase 2: Worker Logic (Cerebro & Migración)
**Responsable**: 👷 **Agente Worker**
**Estado**: [ ] Pendiente (Bloqueado por Fase 1)

1.  **Porting Logic**: Traducir `synthetic_rules_gen.py` a TypeScript (`src/worker/services/RuleGenerator.ts`).
    *   `ContextAnalyzer`: Mejorar para leer `package.json` y dependencias (Stack Analysis).
    *   `generateVulnerableCode()` & `generateSemgrepRule()`.
    *   `validateRule()` (wrapper `child_process`).
2.  **Credits Integration**: Actualizar `CreditsManager` para el cobro en dos fases (Processing Fee + Success Fee).
3.  **Integration**: Conectar en `TaskExecutor.ts`.

### Fase 3: Automated Research (Mantenimiento)
**Responsable**: 🤖 **Server** (Scheduler) y 👷 **Worker** (Ejecución)
**Estado**: [ ] Futuro

1.  **Scheduler (Server)**: Endpoint `POST /internal/scheduler/trigger-research`.
2.  **Logic (Worker)**: Tarea `RESEARCH` que consulta NVD/CISA.

---

## ⚠️ Riesgos y Mitigación
*   **Riesgo**: Semgrep Validation Loop infinito o muy lento.
    *   *Mitigación*: Timeout estricto de 30s por regla y Max Retries = 3.
*   **Riesgo**: Generación de reglas basura (Falsos Positivos).
    *   *Mitigación*: El proceso de validación (Paso 2) es crítico. Si detecta el código seguro como vulnerable, la regla se descarta automáticamente.
*   **Riesgo**: Costo de API OpenAI se dispara.
    *   *Mitigación*: El cobro por "Intento" mitiga esto. Además, rate limits por tenant.

---

## 🧪 Verificación
1.  **Unit Test**: Generador de reglas aislado (mockeando OpenAI).
2.  **Integration**: Petición completa con `custom_rules=true`. Verificar cobro en DB y existencia de reglas en `custom_rule_library`.
3.  **Security**: Verificar que usuarios Free no puedan activar este flag (Validation Layer).
