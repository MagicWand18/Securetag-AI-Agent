# SecureTag AI - Instrucciones de Proyecto

## Que es SecureTag AI

Plataforma SaaS de ciberseguridad con dos modulos:

1. **SAST Engine** (Node.js/TypeScript) — Analisis estatico de seguridad con IA (`securetag-v1`)
2. **AI Shield** (Python/FastAPI) — Gateway de seguridad para trafico IA empresarial. Dos modos: **Chat UI** (interfaz estilo ChatGPT, producto principal) + **API Proxy** (para scripts/CI/CD). Protege lo que SALE hacia las IAs (PII, secrets, injection) y lo que ENTRA desde las IAs (codigo vulnerable → SAST + auto-fix)

## Stack Tecnologico

| Componente | Tecnologia | Contenedor |
|-----------|------------|------------|
| Backend/API | Node.js/TypeScript | `core-api` |
| Worker SAST | Node.js/TypeScript | `core-worker` |
| AI Gateway | Python 3.11, FastAPI, LiteLLM | `core-ai-gateway` |
| Frontend | Wasp (React + Prisma), TailwindCSS | `frontend-app` |
| DB Principal | PostgreSQL 18.1 | `core-db` |
| Cola/Cache | Redis (BullMQ) | `core-redis` |
| Proxy | Nginx | `core-gateway` |
| Migraciones | Liquibase | `core-migrate` |
| LLM | Llama 3.1 8B fine-tuned (`securetag-v1`) | RunPod Serverless |

## Estructura del Proyecto

```
/
├── ai-gateway/              # Python - AI Shield Gateway
│   ├── src/
│   │   ├── main.py          # FastAPI app
│   │   ├── config/settings.py
│   │   ├── middleware/       # auth, rate_limit, tenant_context
│   │   ├── pipeline/        # orchestrator, presidio_scan, llm_proxy
│   │   ├── routes/          # proxy, health, models
│   │   ├── services/        # db, redis, credits, audit_logger, encryption
│   │   └── models/schemas.py
│   ├── tests/
│   └── requirements.txt
├── src/                     # Node.js - Core API + Worker
│   ├── server/              # Express API
│   └── worker/              # SAST Worker
├── docker/                  # Dockerfiles por servicio
├── migrations/              # Liquibase SQL (026-029+)
├── nginx/                   # Nginx config
├── docker-compose.yml
└── docs/                    # Documentacion
    ├── MASTER_PLAN.md       # Plan maestro (fuente de verdad)
    ├── ROADMAP.md           # Roadmap priorizado
    ├── PLAN_AI_SHIELD.md    # Plan detallado AI Shield (6 fases)
    ├── ARQUITECTURA_DEL_SISTEMA.md
    └── guides/              # Deploy DO, RunPod, security
```

## Infraestructura

- **Produccion**: DigitalOcean Droplet ($24/mo, 4GB RAM, 2 vCPU)
- **SSH**: `ssh -i ~/.ssh/id_ed25519 root@143.198.61.64`
- **Dominio**: `api.securetag.com.mx` (Cloudflare WAF/CDN)
- **GPU**: RunPod Serverless (RTX 4090)
- **Containers**: 7 en produccion (core-db, core-redis, core-api, core-worker, core-gateway, core-backup, core-ai-gateway)
- **Nginx routing**: `/ai/` → core-ai-gateway:8000, todo lo demas → core-api:8080

## AI Shield — Estado y Pipeline

### Estado (Feb 2026)
- **Fase 0**: Infra check + mem_limit — COMPLETADA Y DEPLOYADA
- **Fase 1**: Proxy basico (auth + credits + LiteLLM + logging) — COMPLETADA Y DEPLOYADA
- **Fase 2**: Presidio PII detection + redaction (EN+ES) — COMPLETADA Y DEPLOYADA
  - Custom phone recognizer MX/US (5 patrones regex para formatos +52, area codes, +1)
  - PII logging en todos los paths (SUCCESS/BLOCK/ERROR) con pii_incidents en DB
  - Action labels alineados con DB CHECK constraint: `redacted`/`blocked`/`logged`
  - OPENAI_API_KEY inyectada via `${AI_PROVIDER_OPENAI_KEY}` del .env
- **Fase 3**: LLM Guard (injection + secrets + output scan) — COMPLETADA Y DEPLOYADA
  - Prompt injection detection heuristico (22 patrones regex, scoring 0.0-1.0, threshold 0.8)
  - Secrets/credentials scanning via detect-secrets + patrones custom (AWS, GitHub, OpenAI, Bearer, Slack)
  - Output scanning: reutiliza Presidio PII + secrets scanner sobre respuestas del LLM
  - Patron fail-open: si scanner falla, el request pasa (se loguea error)
  - 131 tests Python pasando
- **Fase 4**: Management API Node.js (CRUD, analytics) — PENDIENTE
- **Fase 5**: Streaming SSE — IMPLEMENTADA (pendiente deploy)
  - prepare_stream() + generate_stream() pattern, Nginx SSE config, CORS
  - asyncio.Semaphore(50) limita conexiones SSE concurrentes (DoS protection)
  - Output scan en streaming es LOG-ONLY (no se puede bloquear texto ya enviado)
- **Fase 6**: Chat UI — IMPLEMENTADA (pendiente Admin Dashboard + deploy)
  - ChatPage + 5 subcomponentes, Prisma models, Wasp routes, API key en localStorage
  - React.memo en MessageBubble, ChatSidebar, ChatInput
- **Security Hardening** (Ronda 1 + 2, 2026-02-08):
  - Credenciales externalizadas (settings.py sin defaults, docker-compose con ${VAR})
  - SecurityHeadersMiddleware: CSP, X-Frame-Options, nosniff, Referrer-Policy
  - FastAPI /docs condicional: solo disponible si AI_GW_LOG_LEVEL=DEBUG
  - Input validation: max_tokens (1-128K), content (100K chars), role allowlist
  - asyncio.to_thread() en scans Presidio/secrets, @lru_cache en _derive_key
  - Debug logs eliminados (35+ console.log('DEBUG:') removidos de produccion)
  - Reporte completo: `docs/reports/2026-02-08_dev-check_full.md`

### Pipeline del request (orchestrator.py)
```
POST /ai/v1/chat/completions (via Chat UI o API Proxy)
  OUTBOUND: Auth → Credits → LLM Guard input (injection + secrets)
    → Presidio PII scan (redact/block/log_only) → LiteLLM call
  INBOUND: LLM Guard output (PII + secrets en respuesta)
    → [futuro: SAST scan + auto-fix de codigo generado] → Async log
```

### Archivos clave AI Gateway
- `ai-gateway/src/pipeline/orchestrator.py` — Pipeline principal (9 pasos)
- `ai-gateway/src/pipeline/llm_guard_scan.py` — Injection detection + secrets scanning + output scan
- `ai-gateway/src/pipeline/presidio_scan.py` — PII detection (Presidio + spaCy EN/ES + custom phone MX/US)
- `ai-gateway/src/config/settings.py` — Variables de entorno (prefijo `AI_GW_`)
- `ai-gateway/src/models/schemas.py` — Todos los modelos Pydantic
- `ai-gateway/src/services/audit_logger.py` — Logging async + PII incidents (fire_and_forget_log_with_pii)

## Bases de Datos

Dos DBs separadas:
- **frontend-db** (Prisma) — Usuarios, pagos, creditos (gestionada por Wasp)
- **core-db** (SQL nativo + Liquibase) — Tenants, tareas, findings, AI Gateway

### Tablas AI Gateway (schema `securetag`)
- `ai_gateway_config` — Config por tenant (PII action, modelos, thresholds)
- `ai_gateway_key_config` — Config por API key (BYOK keys, rate limits)
- `ai_gateway_log` — Log de cada request proxeado
- `ai_gateway_pii_incident` — Detalle de PII detectado por request

### Tablas importantes para auth
- `tenant` — Incluye `credits_balance` (NUMERIC(10,2)), `ai_gateway_enabled`
- `api_key` — Hash SHA-256, incluye `ai_gateway_enabled`
- `security_ban` — Tabla de bans (NO `ban`), cols: type, value, is_banned, banned_until

## Patrones y Convenciones

### Python (AI Gateway)
- **Settings**: Pydantic BaseSettings con prefijo `AI_GW_` para env vars
- **Tests**: pytest + pytest-asyncio, mocks con `unittest.mock`
- **Singletons lazy**: Para Presidio engines, setear globals del modulo directamente en tests (`mod._analyzer = mock`)
- **Fail-open**: Si Presidio/LLM Guard falla, el request pasa (se loguea error)
- **Async logging**: `fire_and_forget_log()` — no bloquea el pipeline

### Node.js (Core API/Worker)
- **Auth**: SHA-256 hash de API key, patron replicado en Python
- **Credits**: Cobro upfront atomico con UPDATE WHERE balance >= amount
- **Migraciones**: Liquibase XML + SQL individuales

## Bugs Conocidos

- **credits_balance**: Migrado a NUMERIC(10,2) (migracion 029). Deploy verificado, cobro fraccionario funciona correctamente.

## Configuracion del AI Gateway

### Variables de entorno (settings.py, prefijo AI_GW_)
| Variable | Default | Descripcion |
|----------|---------|-------------|
| `AI_GW_DATABASE_URL` | (requerido) | Conexion a PostgreSQL |
| `AI_GW_REDIS_HOST` | core-redis | Host Redis |
| `AI_GW_REDIS_PORT` | 6379 | Puerto Redis |
| `AI_GW_REDIS_PASSWORD` | (requerido) | Password Redis |
| `AI_GW_SECURETAG_SYSTEM_SECRET` | (requerido) | Secret para cifrado BYOK |
| `AI_GW_CREDIT_COST_PROXY` | 0.1 | Creditos por request exitoso |
| `AI_GW_CREDIT_COST_BLOCKED` | 0.01 | Creditos por request bloqueado |
| `AI_GW_DEFAULT_RPM_PER_KEY` | 30 | Rate limit default por key |
| `AI_GW_DEFAULT_RPM_PER_TENANT` | 60 | Rate limit default por tenant |
| `AI_GW_LLM_TIMEOUT_SECONDS` | 120 | Timeout LLM call |
| `AI_GW_INJECTION_SCORE_THRESHOLD` | 0.8 | Threshold prompt injection (Fase 3) |
| `AI_GW_PII_CONFIDENCE_THRESHOLD` | 0.5 | Threshold minimo de confianza Presidio |
| `AI_GW_CONFIG_CACHE_TTL` | 60 | TTL cache de config tenant (segundos) |
| `AI_GW_LOG_LEVEL` | INFO | Nivel de logging |
| `OPENAI_API_KEY` | `${AI_PROVIDER_OPENAI_KEY}` | Key OpenAI para LiteLLM (fallback si no hay BYOK) |

### Config por tenant (tabla ai_gateway_config, futuro super-admin panel)
| Campo | Default | Descripcion |
|-------|---------|-------------|
| `is_enabled` | false | AI Shield activo para el tenant |
| `allowed_models` | ["*"] | Modelos LLM permitidos |
| `blocked_models` | [] | Modelos LLM bloqueados |
| `max_tokens_per_request` | 4096 | Max tokens por request |
| `max_requests_per_minute` | 60 | RPM del tenant |
| `pii_action` | redact | Accion PII: redact, block, log_only |
| `pii_entities` | [CREDIT_CARD, EMAIL, PHONE, PERSON, SSN, IP] | Entidades PII a detectar |
| `prompt_injection_enabled` | true | Habilitar deteccion injection (22 patrones, threshold 0.8) |
| `secrets_scanning_enabled` | true | Habilitar deteccion secrets (detect-secrets + custom) |
| `output_scanning_enabled` | true | Habilitar escaneo de output LLM (PII + secrets) |
| `prompt_logging_mode` | hash | Modo de log: hash o encrypted |

### Config por API key (tabla ai_gateway_key_config, futuro super-admin panel)
| Campo | Default | Descripcion |
|-------|---------|-------------|
| `model_access` | ["*"] | Modelos permitidos para esta key |
| `rate_limit_rpm` | 30 | RPM de esta key |
| `provider_keys_encrypted` | null | BYOK keys cifradas (OpenAI, Anthropic, etc) |
| `is_active` | true | Key activa o revocada |

## Reglas Criticas

- **Python 3.14 NO funciona** con asyncpg/pydantic-core — usar 3.11
- **Containers** en servidor usan prefijo `core-*` (los `securetag-*` fueron eliminados)
- **Tabla de bans** es `securetag.security_ban` (NO `securetag.ban`)
- **Presidio redaccion**: manual (`_redact_text`) en vez de `AnonymizerEngine.anonymize()` — evita import de OperatorConfig
- **Phone recognizer**: Custom PatternRecognizer MX/US (5 patrones regex) — PhoneRecognizer built-in de Presidio es demasiado estricto
- **Action labels DB**: `ai_gateway_pii_incident.action_taken` tiene CHECK constraint — solo acepta `redacted`, `blocked`, `logged`
- **spaCy models**: Usar `_sm` (12MB c/u), los `_lg` pesan 560MB c/u — imposible en 4GB
- **NUNCA** incluir credenciales reales en documentacion ni codigo
- Al hacer SCP + git pull en servidor, los archivos locales causan conflictos merge
- **mem_limit** de core-ai-gateway es 768m (Presidio + spaCy + detect-secrets)
- **detect-secrets**: Usar `transient_settings` con plugins especificos (no `default_settings`) para evitar falsos positivos de HexHighEntropyString
- **Injection patterns**: Compilados a nivel de modulo (inmutables), no recompilar en cada request
- **SSE Semaphore**: MAX_CONCURRENT_STREAMS=50, wait_for(timeout=5.0) en proxy.py — 503 si no hay slots
- **Security headers**: SecurityHeadersMiddleware en main.py aplica CSP/X-Frame/nosniff a TODAS las responses
- **FastAPI /docs**: Condicional — `docs_url="/docs" if _is_debug else None`, deshabilitado en produccion (INFO)
- **Streaming SSE**: `prepare_stream()` lanza HTTPException, `generate_stream()` es async generator puro (no excepciones)
- **Proyecto en servidor**: `/opt/securetag` (NO `/root/securetag`)
