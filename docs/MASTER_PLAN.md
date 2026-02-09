# SECURETAG AI - PLAN MAESTRO

> **Version**: 2.0 (Documento Unificado)
> **Ultima actualizacion**: 2026-02-08
> **Estado del Proyecto**: Beta 3.1 - Post-Launch
> **Documento anterior**: `docs/legacy/plan-multi-agentes/SECURETAG_MASTER_PLAN_v1.md`

---

## 1. Vision del Producto

SecureTag AI es una plataforma SaaS de ciberseguridad de nueva generacion con dos modulos core:

1. **SAST Engine**: Analisis estatico de seguridad potenciado por IA cognitiva (`securetag-v1`)
2. **AI Shield**: Gateway de seguridad para trafico IA empresarial — protege lo que SALE hacia las IAs (PII, secrets, injection) y lo que ENTRA desde las IAs (codigo vulnerable). Incluye Chat UI estilo ChatGPT como interfaz principal + API proxy para uso programatico.

**Diferenciadores clave:**
- Deteccion + Analisis IA + Validacion + Recomendacion en un solo flujo
- Multi-tenant con aislamiento estricto
- Modelo de creditos "Pay-per-Value" (cobro por profundidad de analisis)
- Cross-file taint analysis poliglota
- Pipeline automatizado de inteligencia de amenazas (Zero-Day detection)
- AI Security Gateway con Chat UI propia + BYOK (Bring Your Own Key) para LLMs externos
- SAST sobre codigo generado por IA + auto-fix de vulnerabilidades antes de llegar al desarrollador

---

## 2. Arquitectura del Sistema

> Referencia detallada: [`docs/ARQUITECTURA_DEL_SISTEMA.md`](./ARQUITECTURA_DEL_SISTEMA.md)

### Componentes principales

| Componente | Tecnologia | Contenedor | Funcion |
|-----------|------------|------------|---------|
| **Frontend** | Wasp (React + Node.js) | `frontend-app` | Dashboard, billing, identity |
| **Frontend DB** | PostgreSQL 15 | `frontend-db` | Usuarios, pagos, creditos |
| **Core API** | Node.js/TypeScript | `core-api` | REST API, orquestacion de tareas |
| **Worker** | Node.js/TypeScript | `core-worker` | SAST, analisis IA, reportes |
| **Gateway** | Nginx | `core-gateway` | Reverse proxy, SSL termination |
| **Core DB** | PostgreSQL 18.1 | `core-db` | Tenants, tareas, findings, seguridad |
| **Queue** | Redis | `core-redis` | BullMQ task queue + cache |
| **Migrations** | Liquibase | `core-migrate` | Schema versioning |
| **Backup** | PostgreSQL Alpine | `core-backup` | Backups cifrados automaticos |
| **LLM** | Ollama / RunPod | Externo | Modelo `securetag-v1` (Llama 3.1 8B fine-tuned) |
| **AI Gateway** | Python 3.11 (FastAPI) | `core-ai-gateway` | Proxy IA: LiteLLM + auth + credits + PII detection + injection detection + secrets scanning + output scan + streaming SSE. 131 tests. Security-hardened: credenciales externalizadas, SecurityHeadersMiddleware (CSP/X-Frame/nosniff), /docs condicional, Semaphore(50) SSE DoS, input validation, asyncio.to_thread, debug logs eliminados |

### Herramientas integradas

Semgrep (SAST), Nmap, Nuclei, Ffuf, Gobuster, Amass, Subfinder, Httpx, Katana, Sqlmap, Wpscan, Testssl.sh

---

## 3. Estado de Implementacion

### Dashboard de Progreso

| Fase | Descripcion | Progreso | Estado |
|------|------------|----------|--------|
| **F1-F7** | Core (DB, Docker, Workers, LLM, Auth, Deploy) | 13/13 | COMPLETADO |
| **F8** | Beta 2 (SAST propio, Redis, Alias, Swagger) | 5/6 | 83% |
| **F9** | Hardening & Seguridad | 4/4 | COMPLETADO |
| **F10** | Features avanzados (Cross-file, Banning) | 5/6 | 83% |
| **F11** | QA & Validacion | 5/5 | COMPLETADO |
| **F12** | Enterprise Features | 4/5 | 80% |
| **F13** | Offensive AI (xpl01t) | 0/3 | 0% |
| **F15** | AI Shield (AI Security Gateway) | 5.5/6 | 92% - IMPLEMENTADO (Fases 0-3 deployadas, 5-6 pendiente deploy) |
| **F14** | Frontend SaaS | 5/5 | COMPLETADO |
| **Backlog F0** | Hotfixes & Estabilizacion | Completo | COMPLETADO |
| **Backlog F1** | Release Critical | Completo | COMPLETADO |
| **Backlog F2** | Enhanced Experience | ~15% | EN PROGRESO |
| **Backlog F3** | Growth & Engagement | 0% | PENDIENTE |
| **Backlog F4** | Advanced AI | 0% | PENDIENTE |

**Progreso global**: ~80% del scope total definido.

---

### 3.1 Lo que ESTA implementado

#### Core Platform (Fases 1-7)
- [x] Modelo de datos PostgreSQL completo (tenant, user, project, task, finding, etc.)
- [x] Infraestructura Docker (docker-compose, redes, volumenes)
- [x] Worker resiliente con retries, heartbeats, estados
- [x] Integracion LLM: modelo `securetag-v1` fine-tuned en RunPod
- [x] Autenticacion multi-tenant con API Keys (hash SHA-256)
- [x] Despliegue en DigitalOcean + RunPod (hibrido)
- [x] CI/CD con GitHub Actions (manual trigger)

#### Motor de Analisis (Fases 8, 10, 12)
- [x] Motor SAST propio con Semgrep OSS (reglas locales)
- [x] Cola escalable Redis/BullMQ
- [x] Alias de proyecto, Retest, Historial de scans
- [x] Documentacion API Swagger/OpenAPI
- [x] Migraciones con Liquibase + backups cifrados
- [x] Contexto seguro: Stack detection, XML context injection, anti-prompt injection
- [x] Cross-file taint analysis (TypeScript, Python, Java)
- [x] Dataset Exploit-DB (12.7k exploits, 38k Q&A pairs)
- [x] Strike-based ban system + User identity banning
- [x] Progress tracking con ETA dinamico
- [x] AI Double-Check (multi-provider: OpenAI/Anthropic, fallback)
- [x] Custom Rules on Demand (generacion + monetizacion por tiers)
- [x] Deep Code Vision (contexto extendido para Premium)

#### Seguridad (Fase 9)
- [x] Cloudflare WAF + Rate Limiting + Bot Fight Mode
- [x] Nginx reverse proxy + SSL/HSTS
- [x] Secure ZIP handling (Magic Bytes + VirusTotal)
- [x] Headers defensivos (CSP, XSS, HSTS)
- [x] Contenedores hardened (non-root, red aislada)
- [x] Rate limiting interno + Ban Hammer + IP Reputation

#### Frontend SaaS (Fase 14)
- [x] Dashboard con charts de severidad e historial
- [x] File uploader con validacion de creditos
- [x] Identity linking (Wasp User <-> SecureTag Tenant)
- [x] API Key management (hash SHA-256 en ambas DBs)
- [x] PayPal integration (creditos + suscripciones)
- [x] Paginas de error inmersivas (404/500)

#### Backlog Completado (Fases 0-1)
- [x] Bug fixes criticos (404, conectividad, linting)
- [x] Refactor de economia de creditos (cobro exacto, reembolsos)
- [x] Validacion de tier en backend
- [x] Auth guards, unicidad de cuenta, account deletion
- [x] Asociacion de proyectos, feedback de progreso real
- [x] Metricas de evolucion, descarga de recibos, historial de creditos
- [x] Reportes profesionales (Ejecutivo, Tecnico, Global)

---

### 3.2 Lo que FALTA implementar

> Roadmap priorizado completo: [`docs/ROADMAP.md`](./ROADMAP.md)
> Plan detallado AI Shield: [`docs/PLAN_AI_SHIELD.md`](./PLAN_AI_SHIELD.md)

#### EN DESARROLLO: AI Shield [F15] - Prioridad P0
- [x] **F15.0**: Verificacion de infraestructura (RAM, mem_limit) ✅ 2026-02-08
- [x] **F15.1**: Proxy basico funcional (FastAPI + LiteLLM + auth + credits) ✅ 2026-02-08
- [x] **F15.2**: Presidio PII detection + redaction (EN + ES) ✅ 2026-02-08
- [x] **F15.3**: LLM Guard injection + secrets scanning ✅ 2026-02-08
- [ ] **F15.4**: Management API Node.js (CRUD config, keys, analytics)
- [x] **F15.5**: Streaming SSE (prepare_stream + generate_stream, CORS, Nginx SSE, Semaphore DoS protection) ✅ 2026-02-08 (pendiente deploy)
- [x] **F15.6a**: Chat UI (ChatPage + 5 subcomponentes, Prisma models, Wasp routes, React.memo) ✅ 2026-02-08 (pendiente deploy)
- [ ] **F15.6b**: Admin Dashboard (Config, Keys, Logs, Analytics pages)

> **Bug corregido F15.1**: `credits_balance` migrado de INTEGER a NUMERIC(10,2) (migracion 029).

#### Pendiente de Fases Core
- [ ] **F8.3**: CI/CD automatico (GitHub Actions en push a main)
- [ ] **F10.4**: Polyglot expansion (C#/.NET, PHP/Laravel, Ruby/Rails, Go)
- [ ] **F12.5**: Automated Remediation / Snippet Fix (tambien se reutiliza en AI Shield output scanning para auto-fix de codigo generado por LLMs)

#### Pendiente Backlog Fase 2 (Post-Launch)
- [ ] Social Login (Google/GitHub) + 2FA
- [ ] GitHub repo integration (eliminar uploads manuales)
- [ ] GitHub Action oficial para CI/CD de clientes
- [ ] UI polish (animaciones, transiciones)
- [ ] Rebranding a "Aegis" (ecosistema mitologico)
- [ ] Limites de recursos tier-based (upload size, storage)

#### Pendiente Backlog Fase 3 (Growth)
- [ ] Dashboard dinamico con noticias de ciberseguridad
- [ ] Sistema de notificaciones inteligentes
- [ ] Bot de Telegram
- [ ] Nuevos modulos: Stress Testing, SCA, Secrets Detection

#### Pendiente Backlog Fase 4 (Advanced AI)
- [ ] Chat contextual con RAG
- [ ] SIEM Lite + operaciones de seguridad autonomas

#### Pendiente Fase 13 (Offensive AI)
- [ ] Entrenamiento modelo ofensivo `securetag-xpl01t`
- [ ] Expansion de datos (Metasploit/Nuclei)
- [ ] Agente Red Team con modo Auto-Exploit

---

## 4. Modelo de Negocio

### Planes de Suscripcion

| Plan | Precio | Creditos/mes | Funciones |
|------|--------|-------------|-----------|
| **Free** | Gratis | 10 | SAST basico, reglas estandar |
| **Premium** | $99/mes | 60 | + Custom Rules (standard/pro), reportes historicos |
| **Enterprise** | $499/mes | 300 | + Deep Code Vision, Cross-file, modelo `max` |

### Costo por Escaneo (LOC)

| Tamano | Clasificacion | Creditos |
|--------|--------------|----------|
| < 10K LOC | Micro/Startup | 5 |
| 10K - 500K | Standard | 15 |
| 500K - 2M | High Performance | 40 |
| > 2M | Massive/Gov | Custom |

### Costos Variables (On-Demand)
- AI Double-Check: 1-3 creditos/hallazgo (Standard/Pro/Max)
- Custom Rules: 1 credito procesamiento + 2-9 creditos por regla exitosa
- AI Shield proxy: 0.1 creditos/request proxeado, 0.01 creditos/request bloqueado

---

## 5. Infraestructura de Despliegue

| Servicio | Proveedor | Especificacion |
|----------|-----------|---------------|
| **App + Worker + DB** | DigitalOcean Droplet | Ubuntu 22.04, 4 vCPU, 8GB RAM |
| **LLM (GPU)** | RunPod Serverless | RTX 4090 (24GB VRAM), idle timeout 30s |
| **CDN + WAF** | Cloudflare | Full proxy, WAF rules, Rate Limiting |
| **Dominio** | api.securetag.com.mx | Apunta a Cloudflare -> DO |

### Guias de Despliegue
- [`docs/guides/deploy-digitalocean.md`](./guides/deploy-digitalocean.md)
- [`docs/guides/deploy-runpod.md`](./guides/deploy-runpod.md)
- [`docs/guides/security-checklist.md`](./guides/security-checklist.md)

---

## 6. Metodologia de Desarrollo

El proyecto utilizo un sistema de desarrollo multi-agente con 9 agentes especializados:

| Agente | Responsabilidad | Estado |
|--------|----------------|--------|
| **Supervisor** | Orquestacion y validacion | Standby |
| **Infra** | Docker, redes, despliegue | Completado |
| **Server** | API REST, auth, endpoints | Completado |
| **Worker** | SAST, LLM, analisis | Completado |
| **Security** | Hardening, WAF, banning | Completado |
| **QA** | Testing, validacion | Completado |
| **Frontend** | Dashboard, UI/UX | Completado |
| **FullStack** | Hotfixes, integracion | Activo |
| **Fine-tuning** | Modelo LLM, datasets | Completado |

> Documentacion historica de agentes: `docs/legacy/plan-multi-agentes/`

---

## 7. Documentacion del Proyecto

```
docs/
├── MASTER_PLAN.md                  # Este documento
├── ROADMAP.md                      # Roadmap priorizado de trabajo pendiente
├── ARQUITECTURA_DEL_SISTEMA.md     # Arquitectura tecnica detallada
├── SecureTag_Technical_Guide.md    # Guia de integracion (client-facing)
├── README.md                       # Indice de documentacion
├── guides/                         # Guias operativas
│   ├── deploy-digitalocean.md
│   ├── deploy-runpod.md
│   └── security-checklist.md
├── PLAN_AI_SHIELD.md               # Plan detallado del modulo AI Shield
├── presentation/                   # Material de pitch e inversion
└── legacy/                         # Documentacion historica
    └── plan-multi-agentes/         # Sistema multi-agente original
        ├── agents/                 # Instrucciones por agente
        ├── evidence/               # Registros de implementacion
        ├── plans/                  # Planes de implementacion ejecutados
        └── research/               # Investigacion y referencias
```
