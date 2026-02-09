# SECURETAG AI - ROADMAP

> **Ultima actualizacion**: 2026-02-08
> **Fuentes**: Consolidacion de `SECURETAG_MASTER_PLAN_v1.md` + `PLAN_Backlog_Features.md`
> **Criterio de priorizacion**: Impacto en revenue > Diferenciacion competitiva > Nice-to-have

---

## Prioridad 0: EN DESARROLLO — AI Shield (AI Security Gateway) [F15]

**Estado**: Fases 0-3 deployadas en produccion. Fases 5 (streaming SSE) y 6 (Chat UI) implementadas localmente (pendiente deploy). Fase 4 pendiente.
**Plan detallado**: [`docs/PLAN_AI_SHIELD.md`](./PLAN_AI_SHIELD.md)
**Estimacion restante**: ~8-12 dias (Fase 4 + Admin Dashboard + deploys)
**Monetizacion**: 0.1 creditos/request proxeado, 0.01 creditos/request bloqueado
**Tests**: 131 tests Python (todos pasando)
**Security Hardening (Ronda 1+2, 2026-02-08)**: Credenciales externalizadas, deps actualizadas (litellm 1.61.20, redis:7.4-alpine, cryptography 44.0.3), input validation (max_tokens, role, content size), asyncio.to_thread en scans, SSE Semaphore(50) DoS protection, SecurityHeadersMiddleware (CSP/X-Frame/nosniff/Referrer), FastAPI /docs condicional, debug logs eliminados, error exposure removida. Ver `docs/reports/2026-02-08_dev-check_full.md`

Gateway de seguridad para trafico IA empresarial. Dos modos de entrega:
- **Chat UI** (principal): Interfaz estilo ChatGPT donde los desarrolladores interactuan con IAs. IT bloquea acceso directo a ChatGPT/Claude y redirige a chat.securetag.com
- **API Proxy** (programatico): Para scripts, CI/CD y herramientas que consumen APIs de LLM por codigo

Proteccion implementada:
- **Outbound**: PII detection + redaction (Presidio EN+ES, phone MX/US), prompt injection detection (22 patrones), secrets scanning (detect-secrets + custom)
- **Inbound**: Output scanning (PII + secrets en respuestas del LLM). SAST + auto-fix de codigo generado — planificado
- BYOK (Bring Your Own Key) — los tenants usan sus propias API keys de LLM
- Contenedor Python (FastAPI) independiente del SAST

| Fase | Entregable | Dias | Estado |
|------|-----------|------|--------|
| 0. Infra | Verificar RAM, mem_limit | 1 | ✅ Completada y deployada |
| 1. Foundation | Proxy + auth + credits + logs | 5-7 | ✅ Completada y deployada |
| 2. Presidio | PII detection + redaction (EN+ES) + phone MX/US + PII audit logging | 4-5 | ✅ Completada y deployada |
| 3. LLM Guard | Injection + secrets + output scan | 4-5 | ✅ Completada y deployada |
| 4. Management API | CRUD + analytics Node.js | 5-6 | Pendiente |
| 5. Streaming SSE | SSE streaming + CORS + Nginx SSE + Semaphore DoS | 3-4 | ✅ Implementada (pendiente deploy) |
| 6. Frontend | **Chat UI** + Admin Dashboard | 7-10 | ✅ Chat UI implementada (pendiente Admin Dashboard + deploy) |

**Lo implementado en Fases 0-2 (verificado E2E en produccion):**
- Auth via X-API-Key + permisos `ai_gateway_enabled` en tenant y api_key
- Cobro upfront atomico 0.1 creditos + reembolso si LLM falla
- Rate limiting por key y por tenant (configurable)
- Model validation (allowed/blocked lists)
- Presidio PII scan bilingue (EN+ES) con 3 modos: REDACT, BLOCK, LOG_ONLY
- Custom phone recognizer (5 regex patterns: MX intl, MX local, US dash, US intl, parenthesis)
- PII audit logging completo en todos los paths (SUCCESS, BLOCK, ERROR)
- Tabla `ai_gateway_pii_incident` con action labels: `redacted`, `blocked`, `logged`
- LiteLLM proxy con BYOK + fallback a OPENAI_API_KEY del .env
- Logging async fire-and-forget con prompt hash/encrypted
- mem_limit 768m, spaCy sm models (12MB c/u)

**Bug corregido**: `credits_balance` migrado de INTEGER a NUMERIC(10,2) (migracion 029). Cobro fraccionario de creditos ahora funciona correctamente.

---

## Prioridad 1: ALTA (Revenue & Core)

Funcionalidades que directamente generan ingresos, reducen churn, o son bloqueantes para crecimiento. A implementar despues de AI Shield.

### 1.1 Automated Remediation / Snippet Fix [F12.5]
**Impacto**: Diferenciador competitivo masivo. Ningun SAST open-source genera parches automaticos.
- Generar codigo de reemplazo exacto (`snippet_fix`) usando el LLM fine-tuned
- Output: JSON con `line` y `code` para parchar vulnerabilidades
- **Extra**: Aplicar el fix, re-escanear, y mostrar si realmente corrigio el problema
- Integrar en `LLMClient` y respuesta de analisis
- **Conexion con AI Shield**: La misma logica de auto-fix se reutiliza en el output scanning de AI Shield para sanitizar codigo generado por LLMs externos antes de entregarlo al desarrollador
- **Ref plan**: `docs/legacy/plan-multi-agentes/plans/PLAN_AUTOMATED_REMEDIATION.md`

### 1.2 Social Login + 2FA [Backlog 2.2]
**Impacto**: Reduce friccion de registro. Standard para cualquier SaaS.
- Google OAuth + GitHub OAuth via Wasp config
- 2FA con TOTP (libreria `otpauth`)
- Signup stepper: Nombre completo, Job Title, Telefono, Organizacion (auto-detect por dominio email)

### 1.3 GitHub Integration [Backlog 2.3]
**Impacto**: Elimina friccion principal (subir ZIPs). Habilita CI/CD para clientes.
- OAuth App en GitHub para listar y clonar repos privados
- GitHub Action oficial `securetag-scan` para pipelines CI/CD
- Quality Gates: fallar pipeline si hay vulnerabilidades criticas
- Soporte para escaneo IaC en pipelines

### 1.4 CI/CD Automatico Propio [F8.3]
**Impacto**: Agiliza releases internos.
- GitHub Actions para deploy automatico en push a main
- Pipeline: Build -> Test -> Deploy DO -> Health check

### 1.5 Limites de Recursos Tier-based [Backlog 2.6]
**Impacto**: Protege infraestructura y forza upgrades.
- Limites de upload size por plan (Free: 10MB, Pro: 100MB, Enterprise: 500MB)
- Cuota de almacenamiento total por Tenant
- Middleware de validacion `Content-Length` antes de procesar

### 1.6 Paginacion en API [Nota tecnica]
**Impacto**: Performance. Critico conforme crecen los proyectos.
- Implementar paginacion en todos los endpoints que devuelven listas
- Pattern: `?page=1&limit=50` con metadata `{ total, page, pages }`

---

## Prioridad 2: MEDIA (Diferenciacion & Expansion)

Features que expanden el mercado o fortalecen posicion competitiva.

### 2.1 Polyglot Expansion [F10.4]
**Impacto**: Mas lenguajes = mas clientes potenciales.
- **Alta prioridad**: C# (.NET Core), PHP (Laravel/Symfony), Ruby (Rails)
- **Media prioridad**: Go (Golang)
- Cross-file analysis para cada lenguaje
- **Ref plan**: `docs/legacy/plan-multi-agentes/plans/PLAN_IMPLEMENTACION_CROSS_FILE.md`

### 2.2 Rebranding a "Aegis" [Backlog 2.5]
**Impacto**: Identidad de marca memorable. Ecosistema mitologico.
- Plataforma: **Aegis** (Defensa)
- Motor IA: **Argus** (Argus Eye = Estandar, Argus Deep Mind = Double Check)
- Modulos futuros: Phalanx (WAF), Hermes (OSINT), Titan (Stress), Ares (Red Team), Hades (Secrets)
- Ajuste de paleta de colores (Azul Profundo/Oro o Negro/Ciber-Neon)

### 2.3 UI Polish [Backlog 2.4]
**Impacto**: Percepcion de calidad y profesionalismo.
- Animaciones de entrada/salida (Framer Motion `AnimatePresence`)
- Tarjetas "Lanyard" para seleccion de planes
- Transiciones suaves entre pantallas

---

## Prioridad 3: BAJA (Growth & Future)

Features de largo plazo para retencion y expansion del producto.

### 3.1 Dashboard Dinamico [Backlog 3.1]
- Home con noticias de ciberseguridad (RSS feeds)
- Podcasts generados por IA
- Resumen de proyectos del usuario

### 3.2 Notificaciones Inteligentes [Backlog 3.2]
- Alertas de nuevas reglas de seguridad
- Alertas de impacto (nueva regla afecta tu stack)
- Ofertas flash basadas en vulnerabilidades trending

### 3.3 Bot de Telegram [Backlog 3.3]
- Lanzar escaneos via Telegram
- Recibir alertas de resultados
- Mapeo `telegramId` -> `userId`

### 3.4 Nuevos Modulos de Seguridad [Backlog 3.4]
- **Stress Testing (Titan)**: Pruebas de carga/estres (portar de proyecto existente)
- **SCA (Software Composition Analysis)**: Escaneo de dependencias contra CVEs
- **Secrets Detection (Hades)**: Busqueda de credenciales hardcodeadas (regex + entropia)

### 3.5 Chat Contextual con RAG [Backlog 4.1]
- Asistente IA con contexto completo del codigo del proyecto
- RAG con base vectorial (pgvector o Pinecone)
- Preguntas sobre arquitectura, refactorizacion, seguridad especifica

### 3.6 SIEM Lite + Operaciones Autonomas [Backlog 4.2]
- Repositorio centralizado de logs (ELK/Loki)
- Integracion con Claude Code Terminal para analisis proactivo
- Human-in-the-loop para acciones criticas
- Alertas multicanal (Telegram + Email)

---

## Prioridad 4: EXPERIMENTAL (Offensive AI)

Fase 13 completa. Requiere investigacion adicional y consideraciones eticas.

### 4.1 Modelo Ofensivo `securetag-xpl01t` [F13.1]
- Fine-tuning Llama 3.1 8B con dataset Exploit-DB (38k Q&A)
- Infraestructura serverless dedicada en RunPod
- **Ref**: `docs/legacy/plan-multi-agentes/research/ROADMAP_Offensive_Model_Training.md`

### 4.2 Expansion de Datos [F13.2]
- Integrar templates de Nuclei
- Integrar modulos Ruby de Metasploit

### 4.3 Agente Red Team [F13.3]
- Integrar modelo `xpl01t` en flujo de auditoria
- Modo "Auto-Exploit" (bajo autorizacion explicita del usuario)

---

## Notas para Presentacion de Inversion

### Areas a fortalecer para pitch

1. **Go-to-Market (GTM)**: Definir motor de ventas (Product-Led Growth, Partners TI, venta directa)
2. **Uso de fondos**: Desglose visual (40% Ingenieria, 30% Ventas, 20% Ops)
3. **Moat tecnologico**: Enfatizar automatizacion para no-expertos (Neuro-Simbolico)
4. **Matriz competitiva**: Cuadro de ejes (Complejidad vs Soberania) mostrando Ocean Azul
5. **Proyecciones financieras**: Grafico de barras 18-24 meses con curva de crecimiento
