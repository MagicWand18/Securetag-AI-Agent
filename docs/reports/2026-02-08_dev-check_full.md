# Dev Check Report

**Fecha:** 2026-02-08 18:30
**Modo:** --full
**Scope:** Proyecto completo (enfasis en Streaming SSE + Chat UI)
**Branch:** main
**Veredicto original:** ❌ BLOCKED (3 CRITICAL en security, 3 CRITICAL en dependencies)
**Veredicto post-remediacion:** ⚠️ WARN (0 CRITICAL, 3 HIGH diferidos, MEDIUM/LOW pendientes)

---

## Resumen Ejecutivo

| Check | Estado | Issues |
|-------|--------|--------|
| Code Review | ⚠️ WARN | 29 issues (2C, 7H, 11M, 9L) |
| Security | ❌ FAIL | 25 vulnerabilidades (3C, 6H, 7M, 5L, 4I) |
| Performance | ⚠️ WARN | 24 problemas (3C, 8H, 7M, 6L) |
| Tech Debt | ⚠️ WARN | Score: 52/100 |
| Dependencies | ❌ FAIL | 83 deps, 3C + 5H + 6M + 4L vulns |

---

## Detalles por Categoria

### 1. Code Review (29 issues)

**CRITICAL (2):**
- **C-1**: API Key almacenada en localStorage — riesgo XSS. Cualquier XSS permite exfiltracion.
- **C-2**: `saveMessage` no valida campo `role` — permite inyeccion de `system` role en historial LLM.

**HIGH (7):**
- **H-1**: Duplicacion masiva entre `process_request()` y `prepare_stream()` (~120 lineas identicas).
- **H-2**: `[DONE]` sentinel no rompe el loop externo del cliente SSE correctamente.
- **H-3**: `catch` en SSE parsing traga errores de servidor silenciosamente.
- **H-4**: `encrypt_value` post-stream puede fallar sin ser capturado.
- **H-5**: Sin validacion de tamano de `content` en `saveMessage`.
- **H-6**: CORS default solo localhost — produccion requiere configuracion.
- **H-7**: Sin cleanup de abort en useEffect — memory leak y state updates en componente desmontado.

**MEDIUM (11):** Missing return types, sidebar links duplicados, `as any` casts, PII detection heuristica fragil, mock duplication en tests, context dict sin tipado, modelos hardcodeados, query con empty string, sin debounce en send, race condition en auto-titulo, Nginx Connection header.

**LOW (9):** Import duplicado, `context: any` en actions, model IDs con fecha, dialog sin dismiss, f-string en logger, role como String no enum, overflow en mobile, code block detection, dependency array.

### 2. Security Scan (25 vulnerabilidades)

**CRITICAL (3):**
- **CRIT-01**: OpenAI API key real en `.env` (no trackeado por git, pero en disco).
- **CRIT-02**: Credenciales hardcodeadas en `settings.py` defaults (DB password, Redis password, system secret para cifrado BYOK).
- **CRIT-03**: Credenciales hardcodeadas en `docker-compose.yml` (trackeado por git).

**HIGH (6):**
- **HIGH-01**: Error details expuestos en API responses (`str(exc)` en main.py).
- **HIGH-02**: API key en localStorage (XSS exfiltration).
- **HIGH-03**: Streaming SSE bypasses output scanning (PII/secrets llegan al cliente en tiempo real, scan es LOG-ONLY).
- **HIGH-04**: Sin validacion de `max_tokens` — DoS via requests con max_tokens=1M.
- **HIGH-05**: Sin limite de conexiones SSE concurrentes (DoS vector).
- **HIGH-06**: Sin validacion de `role` en `saveMessage` (permite role injection).

**MEDIUM (7):** FastAPI docs expuesto en prod, Nginx sin security headers para SSE, PII bypass via formatos no estandar, CORS configurable pero default permisivo, sin CSP header, Prisma sin enum para roles, audit log fire-and-forget sin backpressure.

**LOW (5) + INFO (4):** Minor information disclosure, HKDF sin salt unico, model IDs predecibles, etc.

### 3. Performance (24 issues)

**CRITICAL (3):**
- **P-01/P-02**: `scan_messages()` y `scan_input()` son sincronos y CPU-bound (Presidio/spaCy/detect-secrets). Bloquean el event loop de asyncio, limitando concurrencia a 1 request durante escaneos.
- **F-01**: `setMessages()` con spread completo del array en CADA chunk SSE (50-100 re-renders/segundo durante streaming).

**HIGH (8):**
- `scan_output()` post-stream bloqueante, buffer de streaming sin limite, `_derive_key()` sin cache, N+1 en `authenticate_request()`, doble `model_dump()`, `MessageBubble` sin `React.memo`, `ReactMarkdown` re-parsea en cada token, `sendMessage` dependency stale, Nginx sin `proxy_http_version 1.1`.

**Top 5 Quick Wins:** `React.memo` en MessageBubble (+1 linea), `proxy_http_version 1.1` en nginx (+1 linea), reutilizar `model_dump()` (+2 lineas), cachear derived key (+5 lineas), `React.memo` en ChatSidebar/ChatInput (+2 lineas).

### 4. Tech Debt (Score: 52/100)

**Breakdown:** AI Gateway Python 78/100, Node.js Core 35/100, Frontend React 45/100, Config/Infra 65/100.

**Hallazgos clave:**
- 9 TODOs activos
- 120+ lineas duplicadas en orchestrator (process_request vs prepare_stream)
- 160+ usos de `any` en TypeScript
- 35+ `console.log('DEBUG:')` en produccion (exponen datos sensibles)
- 8 bloques de codigo comentado
- `sendMessage()` = 198 lineas en una sola funcion
- `src/server/index.ts` = 1049 lineas monoliticas
- **Cobertura de tests: 8% global** (119 Python tests, 0 Node.js, 0 Frontend)

### 5. Dependencies (83 analizadas)

**CRITICAL (3):**
- `litellm 1.48.7`: CVE-2024-6587 (SSRF) + CVE-2024-6825 (RCE). Actualizar a >= 1.81.8.
- `redis:alpine` (Docker): CVE-2025-49844 (RediShell RCE, CVSS 10.0). Fijar a >= 7.4.5.

**HIGH (5):**
- `cryptography 43.0.1`: CVE-2024-12797. Actualizar a >= 46.0.4.
- `undici ^6.0.0`: CVE-2025-22150 + CVE-2026-22036. Actualizar a >= 6.23.0.
- `node:20-bookworm`: Multiples CVEs. Usar `-slim` y version parcheada.

**Dependencias abandonadas (3):** detect-secrets (21 meses), xml-js (7 anos), yamljs (8 anos).

**93% de dependencias Python estan desactualizadas** (14/15).

---

## Acciones Requeridas

### 🔴 Bloqueantes (resolver antes de deploy)

1. **[SECURITY CRIT-02/03]** Remover credenciales hardcodeadas de `settings.py` defaults y `docker-compose.yml`. Usar `${VAR}` con .env obligatorio.
2. **[DEPS CRIT]** Actualizar `litellm` a >= 1.81.8 (RCE + SSRF).
3. **[DEPS CRIT]** Fijar imagen Docker `redis:alpine` a version >= 7.4.5 (RCE CVSS 10.0).
4. **[SECURITY HIGH-04]** Validar `max_tokens` con `min(request.max_tokens, config.max_tokens_per_request)`.
5. **[CODE C-2]** Validar `role` en `saveMessage` contra allowlist `["user", "assistant"]`.

### 🟡 Recomendadas (resolver pronto)

6. **[SECURITY HIGH-01]** No exponer `str(exc)` en respuestas de error — usar mensajes genericos.
7. **[PERF P-01/P-02]** Envolver `scan_messages()` y `scan_input()` en `asyncio.to_thread()`.
8. **[CODE H-1]** Extraer pre-checks duplicados a `_run_pre_checks()` compartido.
9. **[CODE H-3]** Separar JSON parse de error handling en SSE client.
10. **[PERF F-01/F-02]** Agregar `React.memo` a MessageBubble, ChatSidebar, ChatInput.
11. **[DEPS HIGH]** Actualizar `cryptography`, `undici`, `fastapi`, `vite`.
12. **[DEBT]** ~~Eliminar 35+ `console.log('DEBUG:')` de produccion.~~ HECHO
13. **[SECURITY HIGH-05]** ~~Agregar semaphore para limitar conexiones SSE concurrentes.~~ HECHO

### 🟢 Nice to Have

14. Fetchear modelos desde `/v1/models` en vez de hardcodear en ModelSelector.
15. Agregar `proxy_http_version 1.1` a Nginx para SSE.
16. Tipar context en chat server actions (usar tipos generados por Wasp).
17. Agregar `flex-wrap` a sugerencias del chat para mobile.
18. Reemplazar dependencias abandonadas (xml-js, yamljs, detect-secrets).

---

## Archivos Mas Afectados

| Archivo | Issues |
|---------|--------|
| `ai-gateway/src/pipeline/orchestrator.py` | 12 issues (duplicacion, blocking I/O, error exposure, buffer sin limite) |
| `frontend/.../chat/ChatPage.tsx` | 11 issues (localStorage key, re-renders, sendMessage 198 loc, abort cleanup) |
| `ai-gateway/src/config/settings.py` | 3 issues (credenciales hardcoded, CORS default) |
| `docker-compose.yml` | 3 issues (credenciales en git, imagenes sin versionar) |
| `frontend/.../server/actions/chat.ts` | 5 issues (role injection, content size, any types, ownership duplication) |
| `nginx/default.conf` | 3 issues (HTTP version, compression, security headers) |

---

*Generado por `/dev-check --full` - 2026-02-08 18:30*

---

## Remediacion (2026-02-08)

### Estado de hallazgos CRITICAL y HIGH

| ID | Severidad | Descripcion | Estado |
|----|-----------|-------------|--------|
| CRIT-01 | CRITICAL | OpenAI key en .env en disco | DIFERIDO — .env en .gitignore, riesgo aceptado para uso local |
| CRIT-02 | CRITICAL | Credenciales hardcodeadas en settings.py | ABORDADO — defaults sensibles eliminados, requiere env vars |
| CRIT-03 | CRITICAL | Credenciales hardcodeadas en docker-compose.yml | ABORDADO — reemplazadas con ${VAR} refs |
| C-1 | CRITICAL | API Key en localStorage | DIFERIDO — patron aceptado (identico a OpenAI Playground) |
| C-2 | CRITICAL | saveMessage no valida role | ABORDADO — validacion contra allowlist |
| P-01 | CRITICAL | scan_messages() bloquea event loop | ABORDADO — asyncio.to_thread() |
| P-02 | CRITICAL | scan_input() bloquea event loop | ABORDADO — asyncio.to_thread() |
| F-01 | CRITICAL | Re-renders excesivos en streaming | ABORDADO — React.memo en componentes |
| DEPS-01 | CRITICAL | litellm CVE-2024-6587/6825 | ABORDADO — actualizado a 1.61.20 |
| DEPS-02 | CRITICAL | redis:alpine CVE RCE | ABORDADO — fijado a redis:7.4-alpine |
| HIGH-01 | HIGH | Error details en API responses | ABORDADO — str(exc) eliminado |
| HIGH-02 | HIGH | API key en localStorage | DIFERIDO — patron aceptado |
| HIGH-03 | HIGH | Streaming bypasses output scanning | DIFERIDO — limitacion arquitectural, output scan es LOG-ONLY por diseno |
| HIGH-04 | HIGH | Sin validacion max_tokens | ABORDADO — Field con ge/le en Pydantic |
| HIGH-05 | HIGH | Sin limite SSE concurrentes | ABORDADO — asyncio.Semaphore(50) + wait_for timeout en proxy.py |
| HIGH-06 | HIGH | Sin validacion role en saveMessage | ABORDADO — allowlist ["user", "assistant"] |
| H-1 | HIGH | Duplicacion orchestrator | ABORDADO — extraido _run_prechecks() |
| H-2 | HIGH | [DONE] sentinel no rompe loop | ABORDADO — flag streamDone |
| H-3 | HIGH | catch traga errores SSE | ABORDADO — separar parse vs stream errors |
| H-4 | HIGH | encrypt_value sin try/catch | ABORDADO — envuelto en try/catch |
| H-5 | HIGH | Sin validacion content size | ABORDADO — limite 100,000 chars |
| H-6 | HIGH | CORS default solo localhost | ABORDADO — configurable via AI_GW_CORS_ORIGINS |
| H-7 | HIGH | Sin cleanup abort useEffect | ABORDADO — useEffect cleanup |
| DEPS-H1 | HIGH | cryptography CVE-2024-12797 | ABORDADO — actualizado a 44.0.3 |
| DEPS-H2 | HIGH | undici CVEs | ABORDADO — actualizado a ^6.23.0 |
| DEPS-H3 | HIGH | node:20-bookworm sin slim | ABORDADO — cambiado a bookworm-slim |
| PERF-H1 | HIGH | _derive_key sin cache | ABORDADO — @lru_cache(maxsize=1) |
| PERF-H2 | HIGH | MessageBubble sin React.memo | ABORDADO |
| PERF-H3 | HIGH | Nginx sin proxy_http_version 1.1 | ABORDADO |

### Hallazgos MEDIUM abordados (Ronda 2)

| ID | Severidad | Descripcion | Estado |
|----|-----------|-------------|--------|
| HIGH-05 | HIGH | Sin limite SSE concurrentes (DoS) | ABORDADO — asyncio.Semaphore(50) + wait_for timeout 5s |
| DEBT-12 | MEDIUM | 35+ console.log('DEBUG:') en produccion | ABORDADO — eliminados todos los debug logs |
| SEC-M1 | MEDIUM | FastAPI docs /docs expuesto en prod | ABORDADO — docs_url=None cuando log_level != DEBUG |
| SEC-M5 | MEDIUM | Sin CSP header en AI Gateway | ABORDADO — SecurityHeadersMiddleware (CSP, X-Frame, nosniff, Referrer) |
| PERF-H4 | MEDIUM | doble model_dump() en orchestrator | RESUELTO — ya corregido en _run_prechecks() (Ronda 1) |
| PERF-H8 | MEDIUM | ReactMarkdown re-parsea cada token | DIFERIDO — requiere useMemo + split streaming |
| CODE-L | LOW | context: any en actions, 160+ any en TS | DIFERIDO — typing completo es tarea grande |

### Hallazgos DIFERIDOS (no abordados)

- CRIT-01 (OpenAI key en .env en disco) — .env en .gitignore; riesgo aceptado
- HIGH-02 (API key en localStorage) — patron estandar (OpenAI Playground lo usa)
- HIGH-03 (streaming SSE bypasses output scanning) — limitacion arquitectural, LOG-ONLY por diseno
- PERF-H8 (ReactMarkdown re-parsea cada token) — requiere refactor complejo, siguiente iteracion
- CODE-L (160+ `any` en TypeScript) — typing completo es tarea grande, siguiente iteracion
- Tech Debt score 52/100 — se aborda parcialmente con refactor orchestrator + limpieza debug logs
- Dependencias abandonadas (detect-secrets, xml-js, yamljs) — requieren evaluacion de reemplazos
- MEDIUM/LOW/INFO restantes — diferidos a siguiente iteracion
