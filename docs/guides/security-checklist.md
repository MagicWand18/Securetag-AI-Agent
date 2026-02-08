# Checklist de Ciberseguridad para SecureTag SaaS

**Estado**: Implementado (Fase 9 completada)
**Referencia legacy**: `docs/legacy/plan-multi-agentes/evidence/security/`

---

## 1. Perimetro y Red

- [x] **Cloudflare**: WAF, Rate Limiting, Bot Fight Mode habilitados
- [x] **SSL**: Full (Flex) + HSTS
- [x] **Nginx Proxy**: Reverse proxy como gateway, aislamiento de servicios
- [x] **UFW**: Firewall con allowlist exclusiva de IPs de Cloudflare
- [ ] **Mejora pendiente**: Migrar SSL de Flex a Full (Strict) con certificado de origen

## 2. Seguridad Aplicativa (AppSec)

- [x] **Headers defensivos**: HSTS, CSP estricto, X-XSS-Protection, X-Content-Type-Options
- [x] **Rate Limiting**: Global (100 req/min) + Estricto en uploads (5 req/min)
- [x] **Validacion de archivos**: Magic Bytes verification para ZIP
- [x] **VirusTotal**: Consulta de reputacion antes de procesar archivos
- [x] **Validacion Zod**: Input validation en upload endpoint

## 3. Seguridad en Contenedores

- [x] **Usuario non-root**: Contenedores ejecutan como `securetag` (UID 1001)
- [x] **Docker hardening**: Sin privilegios extra, read-only donde es posible
- [x] **Red aislada**: `core-net` bridge, DB sin puertos expuestos al host

## 4. Sistema de Banning y Reputacion

- [x] **IP Banning**: Bloqueo inmediato por actividad maliciosa
- [x] **API Key Banning**: Desactivacion automatica de llaves comprometidas
- [x] **Tenant Banning**: Suspension preventiva (configurable)
- [x] **Strike System**: Three-strikes con ventana de tiempo (3 en 24h = Ban)
- [x] **User Identity Banning**: Baneo granular por user_id + revocacion en cascada

## 5. Proteccion de IA (Guardrails)

- [x] **Anti-Prompt Injection**: Deteccion de intentos de manipulacion del LLM
- [x] **Registro forense**: Log inmutable de intentos de ataque (`security_events`)
- [x] **Respuesta activa**: Baneo automatico de API Key por 24h ante ataques confirmados

## 6. Resiliencia de Datos

- [x] **Liquibase**: Control de versiones de esquema de DB
- [x] **Backups automaticos**: Contenedor sidecar con cifrado AES-256
- [x] **Rotacion**: Politica de retencion configurable
- [ ] **Pendiente**: Pruebas periodicas de restauracion de backups

## 7. Secretos y Credenciales

- [x] **API Keys**: Solo hashes SHA-256 almacenados en DB
- [x] **Variables de entorno**: Secretos via .env (no hardcodeados)
- [ ] **Pendiente**: Rotacion automatica de secretos
- [ ] **Pendiente**: Vault o sistema de gestion de secretos centralizado

## 8. Monitoreo y Observabilidad

- [x] **Logging estructurado**: JSON logs en todos los servicios
- [x] **Security events**: Tabla dedicada para eventos de seguridad
- [x] **Heartbeats**: Workers reportan estado periodicamente
- [ ] **Pendiente**: Alertas automaticas (Telegram/Email) ante eventos criticos
- [ ] **Pendiente**: Dashboard de seguridad (metricas en tiempo real)
