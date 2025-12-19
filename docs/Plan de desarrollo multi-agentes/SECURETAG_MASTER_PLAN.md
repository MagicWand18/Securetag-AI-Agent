# SECURETAG SAAS: MASTER PLAN & ARCHITECTURE
> **Documento Consolidado**: Fusiona `MULTI_AGENT_IMPLEMENTATION_PLAN.md` y `SECURETAG_SAAS_PLAN.md`.
> **Última actualización**: 2025-12-06
> **Estado del Proyecto**: Beta 2 (Fase 8) en curso.

---

## 🚦 Dashboard de Estado (Agentes)

| Agente | Estatus Actual | ¿Puede Ejecutarse? | Dependencia |
| :--- | :--- | :--- | :--- |
| **Supervisor** | 🟢 **Activo** | ✅ **SI** | N/A |
| **Infra** | ✅ **Completado** | ⏸️ **Standby** | Integración DO+RunPod completada. |
| **Server** | ✅ **Completado** | ⏸️ **Standby** | Auth implementado. Tareas críticas completadas. |
| **Worker** | ✅ **Completado** | ⏸️ **Standby** | LLM integrado. SAST propio implementado. |
| **Security** | 🟢 **Activo** | ✅ **SI** | Hardening de Beta 2. |
| **QA** | 🟢 **Activo** | ✅ **SI** | Validación Pre-Demo Spartane. |
| **Fine-tuning** | ✅ **Completado** | ⏸️ **Standby** | Modelo `securetag-v1` entrenado. |

### Métricas de Progreso Global
| Fase | Tareas Completadas | Tareas Pendientes | Progreso |
|------|-------------------|-------------------|----------|
| **Fase 1: Cimientos** | 3/3 | 0/3 | 100% ✅ |
| **Fase 2: DB-Only** | 2/2 | 0/2 | 100% ✅ |
| **Fase 3: Robustez Worker** | 3/3 | 0/3 | 100% ✅ |
| **Fase 4: LLM Integration** | 2/2 | 0/2 | 100% ✅ |
| **Fase 5: Auth & Multi-tenancy** | 1/1 | 0/1 | 100% ✅ |
| **Fase 6: Producción** | 1/1 | 0/1 | 100% ✅ |
| **Fase 7: Integración Final** | 1/1 | 0/1 | 100% ✅ |
| **Fase 8: Beta 2 (SAST & Opt)** | 4/6 | 2/6 | 66% 🔄 |
| **Fase 9: Hardening & Seguridad** | 4/4 | 0/4 | 100% ✅ |
| **Fase 10: Future (LLM/Data)** | 2/6 | 4/6 | 33% 🔄 |
| **Fase 11: QA & Entrega** | 5/5 | 0/5 | 100% ✅ |
| **Fase 12: Enterprise Features** | 4/4 | 0/4 | 100% ✅ |

**Progreso Total**: 29/38 tareas completadas (76%)


## 1. Visión y Objetivos

**Objetivo General**: Transformar el agente de ciberseguridad (CLI) en una API SaaS multi-tenant, resiliente y escalable, con soporte para herramientas externas (Semgrep, etc.), ejecución en contenedores Docker, y generación de datasets para fine-tuning de LLMs.

**Objetivo del MVP SaaS**: Exponer las funciones actuales como servicio multi‑tenant, con ejecución segura y escalable, empaquetando componentes en contenedores y orquestándolos.

---

## 2. Arquitectura del Sistema

El sistema se compone de tres pilares principales que evolucionan en paralelo:

1.  **API Server (App)**: Gestiona endpoints, autenticación API Key, y orquestación de tareas (productor).
2.  **Worker**: Consume tareas, ejecuta herramientas (Semgrep, Nuclei, etc.) y reporta resultados (consumidor).
3.  **Base de Datos (PostgreSQL)**: Fuente única de verdad para tareas, resultados, logs y configuración de tenants.
4.  **LLM Service**: Modelo fine-tuned `securetag-v1` alojado en RunPod (o Ollama local) para análisis de hallazgos.

### Componentes de MVP SaaS
*   **API HTTP**: endpoints para crear tareas de escaneo/análisis y consultar resultados.
*   **Orquestación**: cola de tareas y planificador; estados (`queued`, `running`, `completed`, `failed`).
*   **Workers**: procesos que invocan los módulos existentes (`WebScanner`, `DesktopScanner`, `OSINT`) y herramientas externas a través de `ExternalToolManager`, ejecutados en contenedores aislados por tenant.
*   **Persistencia**: base de datos para usuarios, proyectos, tareas, resultados y hallazgos; almacenamiento de objetos para reportes.
*   **Autenticación/autorización**: control de acceso por rol y límites por plan; auditoría de acciones.
*   **Observabilidad**: logging estructurado, métricas y alertas.
*   **LLM Service (compartido)**: servicio interno de inferencia IA multi‑tenant, accesible por red interna; aislamiento lógico por cliente (cuotas, límites, auditoría).

---

## 3. Roadmap de Implementación y Diseño Técnico

### ✅ Fase 1: Cimientos (Infra + DB)
**Objetivo**: Establecer infraestructura base y esquemas de datos.

*   **Tarea 1.1: Modelo de Datos Mínimo (PostgreSQL)**
    *   **Diseño**: Tablas `tenant`, `user`, `project`, `task`, `codeaudit_upload`, `tool_execution`, `scan_result`, `finding`, `artifact`, `audit_log`.
    *   **Estado**: ✅ Completado. (Ver Anexo C: DDL Completo).

*   **Tarea 1.2: Infraestructura Docker**
    *   **Acción**: `docker-compose.yml` para App, Worker, Postgres, Ollama. Red `securetag-net`. Volúmenes persistentes.
    *   **Estado**: ✅ Completado.

### ✅ Fase 2: Migración a DB-Only (Backend)
**Objetivo**: Eliminar dependencias de archivos JSON locales.

*   **Acción**: Refactorizar API para leer/escribir exclusivamente en PG. Implementar `GET /healthz/db` y Gating en endpoints de escritura (503 si DB cae).
*   **Estado**: ✅ Completado.

### ✅ Fase 3: Robustez del Worker & Herramientas
**Objetivo**: Capacidad de ejecución resiliente.

*   **Integración de Herramientas**:
    *   **Motor SAST**: Semgrep OSS gestionado por `ExternalToolManager`.
    *   **Otras**: Nuclei, Nmap, etc. (Ver Anexo A).
*   **Resiliencia**: Retries exponenciales, manejo de estados `retrying`/`timeout`/`failed`.
*   **Heartbeats**: Latidos periódicos a BD para monitoreo de workers vivos.
*   **Estado**: ✅ Completado.

### ✅ Fase 4: Integración LLM & Fine-tuning
**Objetivo**: Análisis inteligente de hallazgos.

*   **Implementación**: Clase `LLMClient` en Worker consume API de Ollama/RunPod.
*   **Modelo**: `securetag-v1` (Llama 3.1 8B Fine-tuned).
*   **Pipeline**: Extracción de datos (Web/PDF) -> Dataset JSONL -> Fine-tuning en RunPod.
*   **Estado**: ✅ Completado.

### ✅ Fase 5: Autenticación y Multi-tenancy
**Objetivo**: Seguridad y aislamiento.

*   **Modelo**: Tablas `api_key` vinculadas a `tenant`.
*   **Middleware**: Validación de `X-API-Key`. Inyección de `tenant_id` en contexto.
*   **Aislamiento**: Todas las queries filtran por `tenant_id`.
*   **Estado**: ✅ Completado.

### ✅ Fase 6 & 7: Producción e Integración Final
**Objetivo**: Despliegue automatizado y conexión híbrida.

*   **CI/CD**: GitHub Actions para despliegue en DigitalOcean.
*   **Gestión de Secretos**: Configuración segura en producción.
*   **Integración Híbrida**: DigitalOcean Droplet (App/Worker) conectado a RunPod GPU (LLM).
*   **Estado**: ✅ Completado.

---

## 🔄 Fase 8: Beta 2 - Motor SAST, Negocio y Optimización (ACTUAL)

### ✅ Tarea 8.1: Motor SAST Propio (Semgrep OSS)
**Problema**: Semgrep Cloud requiere token y reglas propietarias (costo/licencia).
**Solución**:
*   Usar `semgrep` CLI (OSS).
*   Gestión local de reglas en `/opt/securetag/rules`.
*   Eliminar dependencia de `SEMGREP_APP_TOKEN`.
**Estado**: ✅ Completado.

### 🔄 Tarea 8.2: Optimizaciones de Backend (Pendiente Beta 1)
**Objetivo**: Escalabilidad y Control.
*   **Cola Escalable**: Migrar de Polling PG a **Redis** (BullMQ).
*   **Cuotas**: Middleware para Rate Limiting y Storage Limits por Tenant.
**Estado**: ⏸️ Standby.

### 🔄 Tarea 8.3: Automatización Total (CI/CD)
**Objetivo**: Pipeline completo.
*   **Acción**: Habilitar workflows GH Actions para despliegue automático tras push a main.
**Estado**: ⏸️ Standby.

### ✅ Tarea 8.4: Funcionalidades de Negocio (Alias, Retest, Historial)
**Contexto**: Mejorar UX y trazabilidad.
1.  **Alias de Proyecto**:
    *   Columna `alias` en tabla `project`.
    *   Búsqueda por ID o Alias en API.
2.  **Retest y Trazabilidad**:
    *   Lógica de comparación (Diff) de hallazgos (New/Fixed/Residual).
    *   Historial de "Scan Runs" por proyecto.
**Estado**: ✅ Completado.

### ✅ Tarea 8.5: Documentación API (Swagger/OpenAPI)
**Contexto**: Necesidad de documentación interactiva.
*   **Solución**:
    *   `openapi.yaml` (Spec v3).
    *   `swagger-ui-express` en endpoint `GET /docs`.
    *   Swagger alojado en contenedor `securetag-app`.
**Estado**: ✅ Completado.

### ✅ Tarea 8.6: Resiliencia de DB & Migraciones (Liquibase)
**Responsable**: Agente Server
**Origen**: `PLAN_Resiliencia_Migraciones.md` (Security).
*   Implementar Liquibase para control de versiones de esquema.
*   Configurar contenedor sidecar para backups cifrados automáticos.
**Estado**: ✅ Completado (Ref: `EVIDENCE_Server_6`).

---

## ✅ Fase 9: Hardening & Seguridad (Agente Security)

**Objetivo**: Integrar checklist de ciberseguridad para producción (Perímetro, AppSec, InfraSec).
**Estado**: Fase Completada (Iteración 1).

*   **Tarea 9.1: Perímetro y Red (Checklist 1, 2)** PENDIENTE 🔄
    *   Cloudflare, WAF, SSH Hardening completados.
*   **Tarea 9.2: Secure ZIP Handling & AppSec (Checklist 6, 8)** ✅
    *   Validación Magic Bytes, VirusTotal check, Headers de Seguridad implementados.
*   **Tarea 9.3: Seguridad en Contenedores & Secretos (Checklist 3, 4)** ✅
    *   Usuario `securetag`, Docker hardening.
*   **Tarea 9.4: Observabilidad & Defensa en Profundidad (Checklist 5, 7, 10)** ✅
    *   Rate Limiting Interno, Logs de Seguridad y Ban Hammer (Reputation) implementado.

---

## 🔮 Fase 10: Futuro y Backlog

*   **Tarea 10.1: Contexto Seguro (Server/Worker)**:
    *   **Server**: Validación Zod en Upload ✅ (Ref: `EVIDENCE_Server_7`).
    *   **Worker**: Stack Detection, Context Injection (XML) & Anti-Prompt Injection Guardrails ✅ (Ref: `EVIDENCE_Worker_5`).
    *   **Extras Implementados**: Baneo automático de API Keys por inyección detectada, Validaciones de seguridad con IA.
*   **Tarea 10.2: Análisis de Flujo Avanzado**: Cross-file Taint Analysis híbrido.
*   **Tarea 10.3: Data Gen - Exploit-DB (Finetuning)**: Descargar y procesar todos los exploits públicos de exploit-db.com para dataset de entrenamiento.
*   **Tarea 10.5: Sistema de Reputación "Strike-Based Ban"** (Futuro)
    *   **Objetivo**: Evitar baneos inmediatos por falsos positivos o errores menores.
    *   **Lógica**: Acumular "Strikes" en ventana de tiempo (ej. 3 strikes en 24h = Ban temporal).
    *   **Tablas**: `security_strike` (tenant_id, reason, timestamp).
*   **Tarea 10.6: User Identity Banning** (Server) ✅ (Ref: `EVIDENCE_Server_12`)
    *   **Objetivo**: Baneo granular por `user_id` y revocación en cascada de API Keys.
    *   **Features**: Kill Switch, RBAC Middleware optimizado, Admin API.

---

## 🧪 Fase 11: QA & Entrega (Agente QA)

**Objetivo**: Validación final ("Sanity Check") de todas las funcionalidades prometidas en la documentación de cliente (`Spartane_Onboarding_Guide.md`).

*   **Tarea 11.1: Smoke Test & Auth** ✅ (Ref: `EVIDENCE_QA_01`)
*   **Tarea 11.2: Core Flow (Happy Path)** ✅ (Ref: `EVIDENCE_QA_01`)
*   **Tarea 11.3: Security Promises** ✅ (Ref: `EVIDENCE_QA_01`)
*   **Tarea 11.4: New Features (Beta 2)** ✅ (Ref: `EVIDENCE_QA_02`)
*   **Tarea 11.5: Validación Reglas Sintéticas** ✅ (Ref: `EVIDENCE_QA_03`)

---

## 🚀 Fase 12: Enterprise Features (Monetización)

**Objetivo**: Funcionalidades avanzadas para planes Pro/Enterprise y cobro por uso.

*   **Tarea 12.1: Progress Tracking Intuitivo** (Server/Worker) ✅ (Ref: `EVIDENCE_Server_8`, `EVIDENCE_Worker_6`)
    *   Endpoint y DB Schema en Server.
    *   Cálculo de ETA dinámico y reporte granular en Worker.
*   **Tarea 12.2: AI Double-Check (Second Opinion)** (Worker/Server) ✅ (Ref: `EVIDENCE_Server_9`, `EVIDENCE_Worker_7`)
    *   Backend: Schema Identity, Credits Balance, Double Check Config.
    *   Worker: Multi-Provider (OpenAI/Anthropic), Fallback Logic, Deep Code Vision Context.
*   **Tarea 12.3: Custom Rules on Demand** (Research/Worker) ✅ (Ref: `EVIDENCE_Server_10`, `EVIDENCE_Worker_8`, `EVIDENCE_Worker_9`)
    *   **On-Demand**: Generación de reglas específicas para stacks detectados (`custom_rules=true`).
    *   **Monetization**: Modelo de cobro "Processing Fee + Success Fee" y Tiers.
    *   **Automated Research Pipeline**: Sistema autónomo (Scheduler + Worker) para monitorear NVD/CISA y generar reglas globales.
    *   **Tech**: Migración de Python a TS (`CustomRuleGenerator`, `ThreatMonitor`, `ThreatEnricher`).
*   **Tarea 12.4: Deep Code Vision Monetization** (Worker) ✅ (Ref: `EVIDENCE_Worker_10`)
    *   **Objetivo**: Restringir el contexto extendido (50 líneas) a usuarios Premium.
    *   **Acción**: Validar `plan` del tenant en `ContextExtractor`.
    *   **Ref**: `Deep_Code_Vision_Monetization_Plan.md`.


---

## 🛠️ Anexos Técnicos

### Anexo A: Inventario de Herramientas
El sistema utiliza `ExternalToolManager` para gestionar:

1.  **Semgrep** (Analysis) - ✅ Integrado (Local).
2.  **Nmap** (Scanning) - ✅ Integrado (Sistema).
3.  **Nuclei** (Scanning) - ✅ Integrado (Go).
4.  **Ffuf** (Web Fuzzing) - ✅ Integrado (Go).
5.  **Gobuster** (Bruteforce) - ✅ Integrado (Go).
6.  **Amass** (Recon) - ✅ Integrado (Go).
7.  **Subfinder** (Recon) - ✅ Integrado (Go).
8.  **Httpx** (Recon) - ✅ Integrado (Go).
9.  **Katana** (Crawling) - ✅ Integrado (Go).
10. **Sqlmap** (Exploitation) - ✅ Integrado (Python venv).
11. **Wpscan** (CMS) - ✅ Integrado (Ruby).
12. **Testssl.sh** (SSL) - ✅ Integrado (Bash).

### Anexo B: Formato TOON (Token-Oriented Object Notation)
Es un formato de serialización diseñado para LLMs para reducir tokens.
Elimina sintaxis extra (llaves, comillas) para datos tabulares.

**Ejemplo JSON**:
```json
{ "users": [{ "id": 1, "name": "Alice" }, { "id": 2, "name": "Bob" }] }
```
**Ejemplo TOON**:
```text
users[2]{id,name}:
  1,Alice
  2,Bob
```

### Anexo C: Esquema de Base de Datos (PostgreSQL 18.1)
*DDL Completo extraído del plan original.*

```sql
-- Extensiones recomendadas
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- Esquema lógico
CREATE SCHEMA IF NOT EXISTS securetag;
SET search_path TO securetag;

CREATE TABLE IF NOT EXISTS tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL,
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS project (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  alias TEXT, -- Added in Beta 2
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name),
  UNIQUE (tenant_id, alias) -- Added in Beta 2
);

CREATE TABLE IF NOT EXISTS task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  project_id UUID REFERENCES project(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','retrying','timeout','completed','failed','dead_letter')),
  payload_json JSONB DEFAULT '{}'::jsonb,
  retries INT NOT NULL DEFAULT 0,
  priority SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_task_tenant_created ON task (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_planner ON task (tenant_id, status, priority, created_at);

CREATE TABLE IF NOT EXISTS codeaudit_upload (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  project_id UUID REFERENCES project(id) ON DELETE SET NULL,
  task_id UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tool_execution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  args_json JSONB DEFAULT '[]'::jsonb,
  exit_code INT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  stdout_ref TEXT,
  stderr_ref TEXT,
  metrics_json JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tool_exec_tenant_task ON tool_execution (tenant_id, task_id, started_at DESC);

CREATE TABLE IF NOT EXISTS scan_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  task_id UUID NOT NULL UNIQUE REFERENCES task(id) ON DELETE CASCADE,
  summary_json JSONB DEFAULT '{}'::jsonb,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  source_tool TEXT NOT NULL,
  rule_id TEXT,
  rule_name TEXT,
  severity TEXT CHECK (severity IN ('info','low','medium','high','critical')),
  category TEXT,
  cwe TEXT,
  cve TEXT,
  file_path TEXT,
  line INT,
  fingerprint TEXT,
  evidence_ref TEXT,
  analysis_json JSONB, -- Added in Phase 4 for LLM
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finding_tenant_created ON finding (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finding_tenant_severity ON finding (tenant_id, severity);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_finding_fingerprint ON finding (tenant_id, fingerprint) WHERE fingerprint IS NOT NULL;

CREATE TABLE IF NOT EXISTS artifact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT,
  hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artifact_tenant_task ON artifact (tenant_id, task_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_log (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  tokens_used BIGINT DEFAULT 0,
  requests_count BIGINT DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quota_tenant_window ON quota_usage (tenant_id, window_start, window_end);

CREATE TABLE IF NOT EXISTS api_key (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,
    scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(key_hash)
);
```

### Anexo D: Personalización de Marca y Checklist UI
*   Banner y colores: `src/utils/ui.ts` (`ui.banner()`).
*   Gradientes: Negro, gris, blanco y rojo.
*   Mensajes: Tono profesional, conciso, orientado a acción.

### Anexo E: Modelo de Precios

  Para un SaaS de Ciberseguridad IA en 2025, cobrar "por hallazgo" es arriesgado (incentiva a tener menos seguridad o castiga al que tiene más bugs).

**Mi Recomendación: Modelo Híbrido "Cazador" 🦅**

*   Suscripción Base (Costo Fijo - MRR): Cubre tu costo de DigitalOcean.
    *   Plan Dev: Hasta 5 escaneos/mes. Reglas estándar.
    *   Plan Pro: Escaneos ilimitados. Acceso a reportes históricos.
*   Esto te da estabilidad financiera.
*   Créditos de Inteligencia (Costo Variable - Pay as you go):
    *   Utiliza "Security Credits" para las funciones costosas (RunPod/OpenAI).
    *   AI Double-Check: 10 créditos por hallazgo verificado (Cubre costo de token).
    *   Custom Rules: 50 créditos por regla generada exitosamente.
*   ¿Por qué?: Alinea tu costo (GPU/API) con el valor que recibe el cliente. Si piden 100 reglas custom, pagan por ellas. Si no las usan, tu costo es cero.
*   Diferenciador Clave: La mayoría cobra por "Asiento" (Usuario) o "Líneas de Código". Tú puedes diferenciarte cobrando por "Profundidad de Análisis". El escaneo básico es "commodity" (barato/gratis), la Inteligencia (Double Check, Custom Rules) es el producto premium.