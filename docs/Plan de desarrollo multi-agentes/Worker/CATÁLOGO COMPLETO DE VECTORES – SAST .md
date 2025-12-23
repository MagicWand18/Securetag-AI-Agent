🔐 CATÁLOGO COMPLETO DE VECTORES – SAST CROSS-FILE READY

⸻

1. Injection (A03:2021 / A05:2025)

Las vulnerabilidades de inyección ocurren cuando datos controlados por el usuario son interpretados como instrucciones por un motor (SQL, OS, intérprete, runtime, etc.) en lugar de ser tratados como datos. Son de las vulnerabilidades más críticas, ya que frecuentemente conducen a ejecución remota de código, fuga de información o control total del sistema.

⸻

SQL Injection (SQLi)
	•	Flujo:
Input Usuario ➡️ Controller ➡️ Service ➡️ Database Query
(ej. query(), execute(), raw SQL, ORM sin parámetros)
	•	Descripción:
El input del usuario se concatena o se interpola directamente en una consulta SQL. El motor SQL interpreta el input como parte de la lógica de la consulta.
	•	Vectores comunes:
	•	Concatenación de strings
	•	Uso de ORM con raw queries
	•	Construcción dinámica de WHERE, ORDER BY, LIMIT
	•	Impacto:
Lectura/escritura de datos arbitrarios, bypass de autenticación, en ciertos motores ejecución de comandos del sistema.
	•	Cross-file relevance:
El input puede originarse en un archivo (controller) y llegar al sink en otro (repository/DAO).

⸻

Command Injection (CMDi)
	•	Flujo:
Input Usuario ➡️ Service ➡️ System Execution
(ej. exec(), spawn(), system(), subprocess.call())
	•	Descripción:
El input del usuario es utilizado para construir comandos del sistema operativo. Caracteres especiales (;, &&, |, $( )) permiten ejecutar comandos adicionales.
	•	Impacto:
Ejecución arbitraria de comandos, reverse shells, lectura/escritura de archivos, pivoting lateral.

⸻

Code Injection / Remote Code Execution (RCE)
	•	Flujo:
Input Usuario ➡️ Service ➡️ Code Evaluator
(ej. eval(), Function(), exec(), setTimeout(string))
	•	Descripción:
El input se evalúa dinámicamente como código dentro del runtime del lenguaje.
	•	Lenguajes afectados:
JavaScript, Python, PHP, Ruby, Java (EL), etc.
	•	Impacto:
Ejecución arbitraria de código con el contexto y permisos de la aplicación.

⸻

LDAP Injection
	•	Flujo:
Input Usuario ➡️ Service ➡️ LDAP Search
	•	Descripción:
El input del usuario se inserta directamente en filtros LDAP, permitiendo alterar consultas de autenticación o búsqueda.
	•	Impacto:
Bypass de autenticación, enumeración de usuarios y grupos, escalamiento de privilegios.

⸻

NoSQL Injection
	•	Flujo:
Input Usuario ➡️ Service ➡️ NoSQL Query
(ej. $where, $ne, $gt, filtros dinámicos)
	•	Descripción:
En bases NoSQL, el input del usuario puede modificar la estructura del query al inyectar operadores o expresiones evaluadas.
	•	Impacto:
Bypass de controles, acceso a datos no autorizados, ejecución de expresiones JavaScript en ciertos motores.

⸻

2. Server-Side Request Forgery (SSRF)

(A10:2021 / A01:2025)

SSRF
	•	Flujo:
URL / Host del Usuario ➡️ Service ➡️ HTTP Client
(axios, fetch, request, urllib, http client SDKs)
	•	Descripción:
El servidor realiza peticiones HTTP a URLs controladas por el usuario, permitiendo acceder a recursos internos no expuestos públicamente.
	•	Vectores adicionales dentro de esta categoría:
	•	Webhooks configurables
	•	Descarga de archivos remotos
	•	Validaciones insuficientes de esquema/host
	•	Impacto:
Acceso a metadata cloud, escaneo interno, bypass de firewalls, comunicación entre microservicios internos.

⸻

3. Broken Access Control / Path Traversal

(A01:2021 / A01:2025)

Path Traversal (LFI / RFI)
	•	Flujo:
Filename Usuario ➡️ Service ➡️ File System Operation
	•	Descripción:
El input controla rutas de archivos. Secuencias como ../ permiten salir del directorio permitido.
	•	Impacto:
Lectura de archivos sensibles, inclusión remota de código, ejecución indirecta.

⸻

Open Redirect
	•	Flujo:
URL Usuario ➡️ Service ➡️ HTTP Redirect
	•	Descripción:
El servidor redirige a URLs arbitrarias controladas por el usuario.
	•	Impacto:
Phishing, robo de tokens OAuth, abuso de confianza del dominio.

⸻

4. Cryptographic Failures

(A02:2021 / A04:2025)

Weak Randomness / Hardcoded Secrets
	•	Flujo:
RNG inseguro o secreto embebido ➡️ Crypto Operation
	•	Descripción:
Uso de generadores no criptográficos (Math.random) o secretos codificados en el código fuente.
	•	Flujos adicionales dentro de esta categoría:
	•	Tokens de sesión
	•	Reset de contraseñas
	•	Firmas JWT
	•	API keys
	•	Impacto:
Predicción de tokens, suplantación de identidad, acceso no autorizado.

⸻

5. Integrity Failures

(A08:2021 / A08:2025)

Insecure Deserialization
	•	Flujo:
Objeto Serializado Usuario ➡️ Service ➡️ Deserializer
	•	Descripción:
Datos serializados son deserializados sin validación de tipo, estructura o whitelist.
	•	Flujos adicionales:
	•	Cookies serializadas
	•	Payloads en colas (RabbitMQ, Kafka)
	•	Tokens con objetos embebidos
	•	Impacto:
Ejecución de código, manipulación de estado interno, bypass de controles.

⸻

6. Cross-Site Scripting (XSS)

(A03:2021 Injection)

Stored XSS
	•	Flujo:
Input Usuario ➡️ DB ➡️ View Rendering
	•	Descripción:
El input se almacena y posteriormente se renderiza en HTML sin escape.
	•	Cross-file relevance:
Source (input) y sink (template/view) ocurren en archivos distintos.

⸻

Reflected XSS
	•	Flujo:
Input Usuario ➡️ HTTP Response
	•	Descripción:
El input se refleja inmediatamente en la respuesta HTTP.

⸻

7. Log Injection / Forging

(A09:2021 / A09:2025)

Log Injection
	•	Flujo:
Input Usuario ➡️ Service ➡️ Logger
	•	Descripción:
El atacante inyecta saltos de línea o contenido falso en logs.
	•	Impacto:
Ocultamiento de ataques, confusión de auditorías, falsificación de eventos.

⸻

8. Advanced Node.js / Web Specifics

Prototype Pollution
	•	Flujo:
Input Usuario ➡️ merge / extend / clone ➡️ Object Prototype
	•	Descripción:
Modificación del prototipo global de objetos JavaScript (__proto__).
	•	Impacto:
Corrupción del runtime completo, bypass de validaciones.

⸻

Server-Side Template Injection (SSTI)
	•	Flujo:
Input Usuario ➡️ Service ➡️ Template Engine
	•	Descripción:
El input se evalúa como plantilla, permitiendo ejecución de código del lado servidor.

⸻

XML External Entity (XXE)
	•	Flujo:
XML Usuario ➡️ Service ➡️ XML Parser
	•	Descripción:
Entidades externas permiten lectura de archivos locales o SSRF.

⸻

Zip Slip
	•	Flujo:
Zip Usuario ➡️ Service ➡️ Unzip Operation
	•	Descripción:
Rutas maliciosas sobrescriben archivos fuera del directorio destino.

⸻

Regular Expression DoS (ReDoS)
	•	Flujo:
Input Usuario ➡️ Service ➡️ Regex Execution
	•	Descripción:
Expresiones vulnerables provocan consumo excesivo de CPU.

⸻

9. Business Logic & API Flaws

Mass Assignment
	•	Flujo:
Input Usuario (req.body) ➡️ Service ➡️ ORM Create / Update
	•	Descripción:
El input permite sobrescribir campos sensibles no previstos.

⸻

BOLA / IDOR
	•	Flujo:
Input ID ➡️ Service ➡️ DB Query
	•	Descripción:
Falta de validación de pertenencia del recurso al usuario autenticado.

⸻

Race Conditions (TOCTOU)
	•	Flujo:
DB Read ➡️ await ➡️ Lógica ➡️ DB Write
	•	Descripción:
Operaciones no atómicas permiten corrupción de estado bajo concurrencia.

⸻

Insecure JWT Handling
	•	Flujo:
Secret / Config ➡️ Auth Service ➡️ JWT Sign / Verify
	•	Descripción:
Secretos débiles, algoritmos inseguros o validación incorrecta de tokens.

⸻

Listo. Aquí van las categorías 10 a la 18 en exactamente el mismo formato enriquecido y descriptivo (tipo “documentación/rulebook SAST”), con:
	•	✅ Flujo
	•	✅ Subcasos / señales detectables
	•	✅ Impacto
	•	✅ Cross-file relevance (cuando aplica)
	•	✅ Notas de implementación SAST (cuando te ayuda a aterrizarlo)

⸻

10. Cross-Site Request Forgery (CSRF)

La CSRF sucede cuando un atacante logra que un usuario autenticado ejecute acciones no intencionadas en una aplicación, aprovechando que el navegador envía automáticamente cookies o credenciales de sesión en solicitudes cross-site.

CSRF
	•	Flujo:
Usuario autenticado visita enlace/imagen/página maliciosa ➡️ El navegador envía una petición no intencionada con la sesión del usuario ➡️ Acción privilegiada en el servidor (p.ej. cambio de password, transferencia) sin confirmación del usuario.
	•	Descripción:
El servidor “confía” en que la petición proviene del usuario legítimo porque incluye cookies o tokens automáticos. Si la aplicación no usa defensas (anti-CSRF token, SameSite correcto, verificación de origen), la acción se ejecuta.
	•	Señales típicas / subcasos:
	•	Endpoints que cambian estado (POST/PUT/PATCH/DELETE) sin CSRF token
	•	Uso de cookies de sesión sin SameSite=Lax/Strict (dependiendo del flujo)
	•	Falta de validación Origin / Referer en acciones sensibles
	•	Uso de “GET” para acciones con efecto (mal diseño)
	•	Impacto:
Cambios no autorizados de estado: cambio de correo/password, altas/bajas, transacciones, acciones administrativas, etc., “pareciendo” que lo hizo el usuario.
	•	Nota SAST (práctica):
CSRF es más “design/config-aware” que taint puro. Tu SAST puede marcar endpoints de estado que no exigen token, o frameworks donde la protección se desactivó.

⸻

11. Subida de Archivos sin Restricciones

Este vector ocurre cuando la app acepta archivos sin validar de forma sólida tipo real, tamaño, contenido, ruta, nombre, permisos, y/o cuando los coloca en una ubicación que puede ejecutarlos o servirlos de manera peligrosa.

Unrestricted File Upload
	•	Flujo:
Archivo proporcionado por el usuario ➡️ Service ➡️ Almacenamiento / Procesamiento del archivo (sin validar tipo o ubicación).
	•	Descripción:
El sistema guarda o procesa archivos controlados por el usuario. Si no hay controles, un atacante puede subir archivos diseñados para ser ejecutados, interpretados o explotados.
	•	Subcasos comunes (muy importantes para reglas SAST):
	•	Content-type trust: confiar en Content-Type o extensión (fácil de falsificar)
	•	Filename trust: usar el nombre original sin normalización (colisiones, path tricks)
	•	Upload + serve: guardar en un directorio público y servirlo directo (ejecución o XSS)
	•	Procesamiento inseguro: parseadores vulnerables (imágenes, PDF, Office, descompresores)
	•	Tamaño / cantidad: DoS por storage o CPU (zip bombs, millones de archivos)
	•	Impacto:
Desde toma de control completa, hasta ataques al cliente (XSS vía HTML/SVG), DoS por almacenamiento, defacement, o ejecución de código si el archivo llega a un contexto ejecutable.
	•	Cross-file relevance:
El upload puede estar en controller, validación parcial en service, y guardado real en storage module distinto. El motor debe rastrear el flujo completo.

⸻

12. Security Misconfiguration y Exposiciones de Configuración

La misconfiguración es el “todo lo que debería estar bien configurado y no lo está”: defaults inseguros, debug en prod, headers faltantes, CORS laxo, TLS mal puesto, permisos cloud débiles, etc.

Configuraciones por Defecto / Inseguras
	•	Flujo:
Config default / feature flag ➡️ Runtime / Deploy ➡️ Exposición
	•	Descripción:
La aplicación se despliega con defaults: credenciales por defecto, endpoints admin públicos, directorios listables, buckets abiertos, permisos excesivos.
	•	Impacto:
Acceso no autorizado, exposición de datos, takeover de componentes.

⸻

Encabezados de Seguridad Faltantes
	•	Flujo:
HTTP Response ➡️ Falta de headers ➡️ Vulnerabilidad explotable
	•	Descripción:
Ausencia de headers como CSP, HSTS, X-Frame-Options, X-Content-Type-Options. Eso abre la puerta a clickjacking, downgrade attacks, MIME sniffing, XSS más fácil de explotar.
	•	Impacto:
Elevación del riesgo real de XSS/clickjacking/MITM.

⸻

Mensajes de Error Verbosos / Debug en Producción
	•	Flujo:
Error/Exception ➡️ Response/Logs ➡️ Información sensible expuesta
	•	Descripción:
Stack traces, rutas internas, queries, secretos o detalles de infraestructura visibles a usuarios.
	•	Impacto:
Facilita explotación (recon), filtración de secretos, fingerprinting del stack.

⸻

Nota de alcance
	•	Nota:
Misconfig incluye también: CORS *, cookies sin flags, TLS inválido, validación de certificados desactivada, permisos IAM excesivos, etc. SAST puede detectar muchas “banderas rojas” en código/config.

⸻

13. Fallos en la Cadena de Suministro de Software (SCA)

Aquí el problema no está “en tu código”, sino en lo que tu código trae: librerías vulnerables, dependencias comprometidas, paquetes maliciosos, pipelines CI/CD inseguros.

Componentes Vulnerables o Desactualizados
	•	Flujo:
Dependency import ➡️ Código vulnerable en runtime ➡️ Explotación (CVE)
	•	Descripción:
Versiones con CVEs conocidas: el atacante explota directamente un bug del framework/lib.
	•	Impacto:
RCE, auth bypass, SSRF, deserialización, etc. según el CVE.

⸻

Dependencias Maliciosas (Typosquatting / Compromiso upstream)
	•	Flujo:
Install / update ➡️ Código malicioso en dependencia ➡️ Ejecución en build/runtime
	•	Descripción:
Paquetes “parecidos” (typosquatting) o mantenedores comprometidos inyectan payload.
	•	Impacto:
Robo de secretos, backdoors, exfiltración, ejecución remota.

⸻

Build/Deploy comprometido
	•	Flujo:
CI/CD pipeline ➡️ Artefacto alterado ➡️ Deploy
	•	Descripción:
Variables secretas filtradas, runners inseguros, scripts de build maliciosos, artefactos no firmados.
	•	Impacto:
Distribución de software ya comprometido (peor caso).

⸻

Nota SAST
	•	Nota:
Esto normalmente se cubre con SCA + SBOM + firma/verificación. En tu SaaS SAST, vale oro ofrecerlo como módulo.

⸻

14. Errores de Manejo de Memoria (Lenguajes de Bajo Nivel)

Este bloque aplica especialmente a C/C++, pero también aparece en otros entornos (Rust mal usado con unsafe, bindings nativos, extensiones).

Buffer Overflow / Escritura fuera de límite
	•	Flujo:
Input Usuario ➡️ Buffer fijo / copia insegura ➡️ Memory Corruption
	•	Descripción:
Escritura más allá del buffer: sobrescribe memoria adyacente.
	•	Impacto:
Crash, corrupción, RCE.

⸻

Out-of-Bounds Read
	•	Flujo:
Input Usuario ➡️ Índice inválido ➡️ Lectura de memoria
	•	Impacto:
Filtración de secretos, crashes, fuga de direcciones (ASLR bypass).

⸻

Use-After-Free
	•	Flujo:
Free(obj) ➡️ Referencia aún usada ➡️ Undefined behavior
	•	Impacto:
RCE o corrupción severa (según explotación).

⸻

Double Free
	•	Flujo:
Free(obj) ➡️ Free(obj) ➡️ Heap corruption

⸻

Integer Overflow / Underflow
	•	Flujo:
Cálculo de tamaños ➡️ wrap-around ➡️ buffers/índices incorrectos
	•	Impacto:
OOB write/read, bypass de validaciones.

⸻

Format String Injection
	•	Flujo:
Input Usuario ➡️ printf-like sink ➡️ Lectura/escritura de memoria
	•	Impacto:
Info leak, corrupción, ejecución.

⸻

Importancia
	•	Importancia:
Estos bugs son la autopista histórica del RCE “de verdad”. Si vas multi-lenguaje enterprise, esta categoría es clave para C/C++ y módulos nativos.

⸻

15. Fallos de Autenticación y Gestión de Sesiones

Aquí hablamos de todo lo que permite tomar cuentas, falsificar identidad o reutilizar sesiones. Es una de las áreas más explotadas en incidentes reales.

Credenciales / Secretos Hardcodeados
	•	Flujo:
Secret embebido ➡️ Auth / crypto / API call ➡️ Acceso indebido
	•	Descripción:
Contraseñas, API keys, tokens, private keys en código, configs versionadas, repos.
	•	Impacto:
Account takeover, acceso a infraestructura, fraude.

⸻

Almacenamiento Inseguro de Contraseñas
	•	Flujo:
Password ➡️ Hash débil/none ➡️ DB
	•	Descripción:
Texto plano o hashes débiles sin sal.
	•	Impacto:
Crack masivo tras brecha.

⸻

Políticas de Contraseña Débiles
	•	Flujo:
Login endpoint ➡️ No rate limit / no lockout ➡️ brute force
	•	Impacto:
Compromiso gradual de cuentas.

⸻

Mala Gestión de Sesiones
	•	Flujo:
Login ➡️ Session id no rota / cookies inseguras ➡️ session hijack
	•	Señales:
	•	Cookies sin HttpOnly, Secure, SameSite
	•	Sesiones eternas
	•	No invalidar sesión en logout

⸻

JWT Inseguro
	•	Flujo:
Secret débil / alg inseguro ➡️ JWT sign/verify ➡️ token forjado
	•	Impacto:
Bypass total de auth.

⸻

Flujo de Autenticación Roto
	•	Ejemplos típicos:
	•	Reset password sin verificar correctamente
	•	Cambiar password sin password actual
	•	Enumeración de usuarios en login
	•	MFA mal implementado (saltable)
	•	Impacto:
Account takeover, escalamiento de privilegios.

⸻

16. Manejo Incorrecto de Condiciones Excepcionales

(Te lo dejo en el mismo estilo, y alineado para que encaje con el resto.)

Condiciones Excepcionales mal manejadas
	•	Flujo:
Error inesperado / excepción no controlada ➡️ La aplicación no la maneja ➡️ Crash o estado inseguro / exposición
	•	Falta de Captura de Excepciones:
Excepciones no atrapadas causan caída o “fail-open” (p.ej. auth).
	•	catch vacío / genérico sin acción:
Oculta fallos reales o permite continuar en estado corrupto.
	•	Errores en casos borde:
Inputs extremos, estados imposibles, datos malformados.
	•	Importancia:
Enfatiza resiliencia y evita que errores se conviertan en bypass o info leak.

⸻

17. Otros Vectores Client-Side y Varios

Este bloque junta vectores que a veces caen “entre categorías”, pero en la práctica deben detectarse porque aparecen muchísimo en SPAs, GraphQL y arquitecturas modernas.

DOM-Based XSS
	•	Flujo:
Datos del usuario (URL/fragment/window.name) ➡️ Frontend JS ➡️ DOM sink (innerHTML, etc.)
	•	Impacto:
Ejecución de JS en navegador sin tocar el servidor.

⸻

Clickjacking (UI Redressing)
	•	Flujo:
Página legítima embebida en iframe ➡️ Usuario cree hacer clic en algo ➡️ Acción real en UI oculta
	•	Impacto:
Acciones sin consentimiento (likejacking, confirmaciones, cambios).

⸻

Exposición Excesiva de Datos (API)
	•	Flujo:
Request ➡️ Resolver/Controller ➡️ Respuesta incluye campos sensibles
	•	Descripción:
“El cliente filtra” es falso: el atacante llama al endpoint directo.

⸻

Falta de Limitación de Recursos (DoS lógico)
	•	Flujo:
Request costosa (GraphQL depth/joins) ➡️ CPU/DB overload ➡️ Denegación
	•	Mitigaciones típicas:
Rate limit, query complexity, depth limit, paginación.

⸻

Introspección GraphQL habilitada
	•	Flujo:
Introspection query ➡️ esquema completo expuesto ➡️ mejor recon + explotación
	•	Impacto:
Aumenta drásticamente superficie de ataque.

⸻

Inyección de Encabezados SMTP (Email Header Injection)
	•	Flujo:
Input Usuario ➡️ Construcción de headers ➡️ BCC/CC/headers inyectados
	•	Impacto:
Spam/phishing desde tu dominio, spoofing, abuso reputacional.

⸻

HTTP Response Splitting (CRLF)
	•	Flujo:
Input Usuario ➡️ Headers HTTP ➡️ Inyección de nuevos headers / split
	•	Impacto:
Set-Cookie malicioso, XSS indirecta, cache poisoning en ciertos casos.

⸻

Prototype Pollution (re-énfasis JS)
	•	Flujo:
Input Usuario ➡️ Object.assign/merge ➡️ __proto__ modificado
	•	Impacto:
Runtime compromise.

⸻

Ataques a Servicios de Mensajería (Microservicios / colas)
	•	Flujo:
Input Usuario ➡️ Message queue / event bus ➡️ Consumer deserializa/actúa
	•	Riesgo:
Lo mismo que deserialización insegura, pero distribuido: validación “se pierde” entre servicios.

⸻

18. Insuficiente Registro y Monitoreo

Esta categoría es vital porque convierte un incidente “pequeño” en una brecha catastrófica por tiempo de permanencia del atacante.

Logging/Monitoring insuficiente
	•	Descripción:
No registrar eventos clave (login, cambios de privilegio, accesos denegados) ni alertar patrones anómalos permite que atacantes operen sin ser detectados.
	•	Flujos típicos de fallo:
	•	Login failures no loggeados
	•	Cambios de rol sin auditoría
	•	Accesos a datos sensibles sin trazabilidad
	•	No correlación de eventos (sin SIEM/alertas)
	•	Impacto:
Detección tardía (días/meses), exfiltración lenta, imposibilidad de forense confiable.
	•	Nota SAST (práctica):
Aunque mucho es “operación”, tú sí puedes detectar:
	•	Ausencia de logs en rutas críticas
	•	catch que traga errores sin registrar
	•	Logs que sí existen pero sin contexto (sin userId/requestId)

⸻

Perfecto. Abajo te dejo un MODELO DE REGLAS (rule model) listo para implementar en un SAST con cross-file / cross-layer analysis, basado en tu catálogo 1–18.

Incluye:
	•	Sources (Inputs)
	•	Sinks (Operaciones peligrosas)
	•	Propagators (Cómo viaja/transforma el taint)
	•	Sanitizers/Guards (Qué “corta” o reduce riesgo)
	•	Y una tabla por lenguaje/framework: Node, Java Spring, .NET, Python, PHP, Go, Ruby.

Nota rápida: algunas categorías no son “taint puro” (ej. SCA, Misconfig, Monitoring). Aun así, te doy el modelo para que tu motor las cubra con pattern/design rules.

⸻

0) Modelo base (estructura de regla)

Una regla en tu motor puede verse así:
	•	RuleID: INJ.SQLI.001
	•	Category: Injection/SQLi
	•	Severity: Critical/High/Medium
	•	Sources: entradas no confiables
	•	Propagators: funciones/operaciones que transportan o transforman datos
	•	Sinks: punto peligroso (SQL, OS, template, etc.)
	•	Sanitizers/Guards: validaciones o APIs seguras que mitigan
	•	Constraints: contextos (solo si rawQuery, solo si shell=True, etc.)
	•	Cross-file: seguir símbolos (variables), argumentos, returns, fields, DTOs, etc.

⸻

1) MATRIZ GLOBAL (agnóstica al lenguaje)

1.1 Sources (Inputs) — comunes

HTTP / Web
	•	Query params (?q=)
	•	Path params (/users/:id)
	•	Body (JSON, form-data, multipart)
	•	Headers (incl. Host, X-Forwarded-*, Referer, Origin)
	•	Cookies
	•	File uploads (nombre, contenido, metadata)
	•	Webhooks inbound

APIs y Apps modernas
	•	GraphQL variables + selection arguments
	•	gRPC request messages
	•	WebSocket messages
	•	Server-Sent Events input
	•	OAuth/OIDC callbacks (params)

Datos externos
	•	DB (cuando se re-renderiza en HTML → Stored XSS)
	•	Cache/Redis
	•	Message queues (Kafka/Rabbit/SQS) payloads
	•	Config remota / feature flags
	•	Third-party APIs (si su contenido llega a sinks)

Runtime / OS
	•	Env vars (ojo: muchas veces “trusted” por diseño, pero útil para secrets/misconfig)
	•	CLI args
	•	File reads (si luego se ejecuta/renderiza)

⸻

1.2 Propagators (taint carriers) — comunes

String & templating
	•	Concatenación (+, interpolation, format)
	•	join, sprintf-like formatters
	•	Construcción de URLs (base + path, urljoin)
	•	Construcción de comandos (cmd = "git " + arg)

Parsing / serialization
	•	JSON parse/stringify
	•	XML parse
	•	YAML parse
	•	URL decode/encode (no sanitiza, solo transforma)
	•	Base64 encode/decode (no sanitiza)

Mapping / object binding
	•	DTO mapping (AutoMapper, Jackson binding, express body parsing)
	•	ORM entity creation from object (User.create(req.body))
	•	Reflection-based binders

Flow across modules
	•	Argument passing
	•	Return values
	•	Class fields / object properties
	•	Global state / singleton caches
	•	Event dispatchers / callbacks

⸻

1.3 Sanitizers / Guards — comunes (cortan o reducen taint)

Ojo: “sanitizer” depende del sink. No existe un sanitizer universal.

Validación
	•	Allowlist (regex estricta, enums)
	•	Schema validation (Zod/Joi/Pydantic, DataAnnotations, etc.)
	•	Type enforcement (convert to int y validar rango)
	•	Normalización de rutas (resolve + check root)
	•	URL allowlist (esquemas permitidos + host allowlist + IP denylist)

Escapes / encodes
	•	HTML escape (para XSS)
	•	JS string escape (para XSS en scripts)
	•	URL encode (para querystrings; no para HTML)
	•	SQL parameterization (la “sanitización” real para SQLi)

APIs seguras
	•	Queries parametrizadas / prepared statements
	•	“Safe exec”: sin shell, argumentos como array
	•	Template rendering con autoescape activado
	•	Parsers seguros (XML sin entidades)
	•	Librerías de unzip con validación de path

Controles de seguridad (guards)
	•	AuthZ check (ownership checks para BOLA/IDOR)
	•	Anti-CSRF token + SameSite
	•	Rate limiting
	•	Transacciones / locks (race conditions)

⸻

2) RULE PACK por categoría (1–18)

A continuación te doy el modelo por cada una, con Sources / Sinks / Propagators / Sanitizers.

⸻

2.1 Injection: SQLi

Sources
	•	Request params, body, headers
	•	GraphQL args
	•	MQ payloads (si terminan en query)

Sinks
	•	Raw SQL execution (query/execute)
	•	ORM raw queries / “unsafe” query builders
	•	String-built WHERE/ORDER BY/LIMIT usados como SQL

Propagators
	•	Concatenación e interpolación de strings
	•	“helper” functions que construyen filtros
	•	Builders que aceptan strings arbitrarios

Sanitizers/Guards
	•	Prepared statements / parameter binding
	•	ORM safe query APIs (placeholders)
	•	Allowlist estricta para ORDER BY/column names (nunca “escape” genérico)

⸻

2.2 Injection: Command Injection (CMDi)

Sources
	•	Params/body/uploads filename
	•	DB content (si luego se usa en comandos)
	•	MQ payloads (jobs)

Sinks
	•	OS exec functions (shell invocation)
	•	Process spawn con shell=true / string command

Propagators
	•	Concatenación de comandos
	•	Templates de comandos (f"tar -x {path}")
	•	Wrappers tipo run_cmd(user_arg)

Sanitizers/Guards
	•	Ejecutar con argv array, sin shell
	•	Allowlist de comandos + allowlist de argumentos
	•	Escapar no es suficiente si hay shell (preferible “no shell”)

⸻

2.3 Injection: Code Injection / RCE (eval)

Sources
	•	Cualquier input que llegue a eval/engine
	•	DB si se re-evalúa
	•	Templates dinámicas

Sinks
	•	eval, exec, Function, dynamic compilation, reflection execute
	•	Expression engines (según stack)

Propagators
	•	Construcción dinámica de expresiones
	•	“Template string” que luego se evalúa

Sanitizers/Guards
	•	No usar eval (ideal)
	•	Allowlist de expresiones (si inevitable)
	•	Sandboxing real (raro y complejo)

⸻

2.4 Injection: LDAP Injection

Sources: params/body
Sinks: ldap search/filter strings
Propagators: concatenación de filtros, builders
Sanitizers/Guards: APIs de filtro parametrizado/escape LDAP + allowlists

⸻

2.5 Injection: NoSQL Injection

Sources
	•	JSON body, GraphQL filters
	•	Querystring “filter” dinámico

Sinks
	•	Queries que aceptan objetos arbitrarios
	•	$where / scripts / operators

Propagators
	•	Merge de objetos ({...req.body})
	•	Dynamic filter building
	•	Object.assign, deep merge

Sanitizers/Guards
	•	Schema validation estricta
	•	Denylist de operadores peligrosos ($where, $ne en ciertos contextos)
	•	DTO mapping controlado

⸻

2.6 SSRF

Sources
	•	URL/host desde request (params/body/headers)
	•	Webhooks configurables
	•	Redirect-following result (SSRF indirecto)

Sinks
	•	HTTP clients
	•	URL fetchers (downloaders)
	•	DNS resolvers (si hay lookups)

Propagators
	•	URL join/build
	•	Redirect chains
	•	“proxy” endpoints

Sanitizers/Guards
	•	Allowlist de hosts/domains
	•	Validar esquema (http/https)
	•	Resolver DNS + bloquear IPs privadas/loopback/link-local
	•	No seguir redirects o revalidar cada redirect

⸻

2.7 Path Traversal (LFI/RFI)

Sources
	•	filename/path desde request
	•	zip entry names

Sinks
	•	File read/write/open
	•	include/require/load template from path

Propagators
	•	join, concatenación, normalización incompleta
	•	Env/config base path + user path

Sanitizers/Guards
	•	realpath/resolve + check “startsWith(baseDir)”
	•	Allowlist de filenames
	•	Rechazar .., separadores alternativos, unicode tricks

⸻

2.8 Open Redirect

Sources: URL param
Sinks: redirect response functions
Propagators: concatenación de URL, decode
Sanitizers/Guards: allowlist de dominios o rutas relativas únicamente

⸻

2.9 Crypto Failures: Weak randomness / Hardcoded secrets

Sources
	•	En crypto: no es “user source”; es “pattern source” (API usage)
	•	Config values en código
	•	Env vars versionadas (si detectas en repo)

Sinks
	•	Token generation, session IDs, reset tokens, JWT secrets, encryption keys

Propagators
	•	Copia/uso del secret en múltiples módulos
	•	Derivation functions mal usadas

Sanitizers/Guards
	•	CSPRNG APIs
	•	Secret management (vault/KMS)
	•	Rotación y no hardcode
	•	En JWT: claves fuertes + algoritmo seguro + expiración + aud/iss

⸻

2.10 Insecure Deserialization

Sources
	•	Body, cookies, headers
	•	MQ payloads
	•	Files uploaded (serialized objects)

Sinks
	•	Deserializers (pickle, unserialize, BinaryFormatter, etc.)
	•	Object mappers peligrosos con tipos dinámicos

Propagators
	•	Base64 decode → deserialize
	•	Compression → deserialize
	•	Pass-through de payload en módulos

Sanitizers/Guards
	•	Evitar deserialización de objetos no confiables
	•	Whitelists de tipos
	•	Firmar payloads (si inevitable)
	•	Preferir formatos “data-only” y validar schema

⸻

2.11 XSS: Stored/Reflected/DOM

Sources
	•	Request inputs
	•	DB content (Stored)
	•	URL fragment/window.name (DOM)

Sinks
	•	HTML rendering without escape
	•	Template engines sin autoescape
	•	DOM sinks (innerHTML, dangerouslySetInnerHTML)

Propagators
	•	Concatenación de HTML
	•	Markdown → HTML sin sanitizar
	•	Render de DB fields

Sanitizers/Guards
	•	Contextual output encoding (HTML/attr/JS/url)
	•	Template autoescape ON
	•	Sanitizers HTML (DOMPurify, bleach, etc.) cuando sea necesario
	•	CSP (guard, no sanitizer)

⸻

2.12 Log Injection / Forging

Sources: user inputs
Sinks: logger writes (info/warn/error)
Propagators: string building, JSON stringify
Sanitizers/Guards: normalizar \r\n, structured logging (campos), escaping

⸻

2.13 Prototype Pollution

Sources: JSON body, query params “deep object”, GraphQL input objects
Sinks: deep merge/assign to objects used globally
Propagators: merge, extend, Object.assign, lodash merge
Sanitizers/Guards: bloquear __proto__, constructor, prototype; deep merge seguro; schema strict

⸻

2.14 SSTI

Sources: user input
Sinks: template render/compile APIs con input como template
Propagators: concatenación de plantilla
Sanitizers/Guards: no permitir templates dinámicas; usar templates precompiladas; autoescape + sandbox (si existe)

⸻

2.15 XXE

Sources: XML user input
Sinks: XML parser con entidades/DTD habilitadas
Propagators: passes through modules, decompression
Sanitizers/Guards: deshabilitar DTD/XXE, parser seguro, allowlist de schemas

⸻

2.16 Zip Slip

Sources: zip entries, filenames
Sinks: unzip extract to filesystem
Propagators: path join on extraction
Sanitizers/Guards: normalize/resolve per entry + enforce destination root

⸻

2.17 ReDoS

Sources: user string
Sinks: regex evaluation (esp. patrones catastróficos)
Propagators: transforms previos
Sanitizers/Guards: regex safe libs, timeouts, límites de longitud, evitar patrones vulnerables

⸻

2.18 Business Logic & API: Mass Assignment

Sources: req.body / GraphQL input objects
Sinks: ORM create/update con objeto completo
Propagators: DTO mapping automático, spread operators
Sanitizers/Guards: allowlist de campos, DTO explícito, schema validation, forbid unknown

⸻

2.19 Business Logic & API: BOLA/IDOR

Sources: :id, params, GraphQL id args
Sinks: DB fetch/update/delete por ID sin ownership check
Propagators: repos/services wrappers
Sanitizers/Guards: WHERE user_id=current_user, policy checks, ABAC/RBAC guards

⸻

2.20 Business Logic & API: Race Conditions (TOCTOU)

Sources: request triggers (parallelism)
Sinks: read-then-write sin transacción/lock
Propagators: awaits, async boundaries
Sanitizers/Guards: transacciones, locks, optimistic concurrency, idempotency keys

⸻

2.21 Business Logic & API: Insecure JWT Handling

Sources: config secrets, headers tokens
Sinks: sign/verify with weak config
Propagators: token creation helpers
Sanitizers/Guards: strong keys, allowed alg list, exp/nbf/aud/iss validation, rotation

⸻

2.22 CSRF

Sources: browser auto-sent cookies + attacker-controlled origin
Sinks: state-changing endpoints without CSRF defenses
Propagators: same-site navigation, form submits
Sanitizers/Guards: CSRF tokens, SameSite, Origin/Referer checks, double-submit cookie

⸻

2.23 Unrestricted File Upload

Sources: multipart file + filename + mimetype
Sinks: storage in executable/public path, processing parsers
Propagators: re-serve, transform, unzip, image processing
Sanitizers/Guards: content sniffing, allowlist types, size limits, random names, store outside webroot, AV scanning (si aplica), safe processors

⸻

2.24 Security Misconfiguration (pattern/design rules)

Sources: configs, env, code flags
Sinks: debug mode, CORS *, TLS verify disabled, weak headers
Propagators: config loaders, env merge
Sanitizers/Guards: secure defaults, config policy checks, environment gating

⸻

2.25 Supply Chain (SCA)

Sources: dependency manifests/lockfiles
Sinks: known vulnerable versions / malicious packages
Propagators: transitive deps
Sanitizers/Guards: version upgrades, allowlist registries, SBOM, signatures, pinning

⸻

2.26 Memory Safety (C/C++)

Sources: user inputs, network buffers, file reads
Sinks: unsafe memory ops, indexing, format strings
Propagators: pointer arithmetic, casts
Sanitizers/Guards: bounds checks, safe APIs, compiler hardening (ASan, FORTIFY), but SAST = detectar patrones

⸻

2.27 Exception Handling (resilience rules)

Sources: exception throw points
Sinks: unhandled exceptions → crash/info leak/fail-open
Propagators: catch-all, empty catch, logging omissions
Sanitizers/Guards: explicit handling, safe fallback, no verbose errors, logging with context

⸻

2.28 Client-side & Misc (DOM XSS, clickjacking, data exposure, DoS logical, GraphQL introspection, SMTP headers, CRLF)

Aquí combinas taint + config + design según subcaso:
	•	DOM XSS = taint to DOM sinks + sanitizers
	•	Clickjacking = missing headers (misconfig)
	•	Data exposure = response shaping (pattern + policy)
	•	DoS lógico = complexity limits + rate limit (design/guard)
	•	SMTP header injection = CRLF into mail headers
	•	CRLF splitting = CRLF into HTTP headers

⸻

2.29 Insufficient Logging & Monitoring

Sources: “security relevant events” (login failures, authz denials, role changes)
Sinks: ausencia de logs / logs sin contexto / no alerting hooks
Propagators: swallowed exceptions, silent failures
Sanitizers/Guards: structured logging, correlation IDs, SIEM hooks, alerts, audit trails

⸻

3) Tabla por lenguaje / framework

A continuación: ejemplos concretos para que tu rule engine tenga catálogo de APIs por stack. (No exhaustivo al 100% del universo, pero sí lo suficiente para arrancar y extender.)

⸻

3.1 Node.js (Express/Nest/Fastify)

Sources
	•	req.query, req.params, req.body, req.headers, req.cookies
	•	ctx.request.* (Koa)
	•	GraphQL resolvers args ((_, args, ctx))

Sinks
	•	SQL: sequelize.query, knex.raw, pg.query con string, mysql.query
	•	CMD: child_process.exec, spawn con shell:true
	•	RCE: eval, Function, vm.runInThisContext
	•	SSRF: axios, fetch, request, got
	•	XSS: res.send(string), templating sin escape, React dangerouslySetInnerHTML
	•	SSTI: pug.render, ejs.render con plantilla dinámica
	•	XXE: libxmljs parse con entidades
	•	Zip: adm-zip, unzipper extract sin validación
	•	Logs: console.log, winston.*

Propagators
	•	template literals, +, String(), JSON.parse/stringify, object spreads, deep merges

Sanitizers/Guards
	•	SQL params (knex bindings, prepared statements)
	•	spawn(cmd, args, {shell:false})
	•	validator, zod, joi
	•	DOMPurify (frontend), escape libs
	•	CSRF middleware, SameSite cookies
	•	URL allowlist + IP block (SSRF)

⸻

3.2 Java (Spring Boot)

Sources
	•	@RequestParam, @PathVariable, @RequestBody
	•	HttpServletRequest.getParameter/getHeader
	•	GraphQL Java resolvers args

Sinks
	•	SQL: JdbcTemplate.query(String), Statement.execute, EntityManager.createNativeQuery
	•	CMD: Runtime.exec, ProcessBuilder (si string/sh -c)
	•	RCE: SpEL injection (ExpressionParser.parseExpression(user)), scripting engines
	•	SSRF: RestTemplate, WebClient, HttpClient
	•	XSS: JSP/Thymeleaf sin escape, @ResponseBody con HTML
	•	XXE: DocumentBuilderFactory con DTD enabled
	•	Deserialization: Java native serialization, ciertos mappers con default typing

Propagators
	•	String.format, concatenación, builders, Jackson mapping

Sanitizers/Guards
	•	PreparedStatements, parameter binding
	•	Validación Bean Validation (@Valid, constraints)
	•	Deshabilitar XXE en factories
	•	Spring Security CSRF enabled (o token)
	•	Output encoding / escaping en views

⸻

3.3 .NET (ASP.NET Core)

Sources
	•	[FromQuery], [FromRoute], [FromBody], HttpContext.Request.*
	•	Headers/cookies/session

Sinks
	•	SQL: raw ADO.NET SqlCommand.CommandText con concat; Dapper raw queries; EF FromSqlRaw
	•	CMD: Process.Start (shell)
	•	SSRF: HttpClient.GetAsync(url)
	•	XSS: Razor sin encoding (o Html.Raw)
	•	Deserialization: BinaryFormatter (legacy), type-unsafe serializers
	•	Logging sinks: ILogger.Log* con user strings

Propagators
	•	string.Format, interpolation $"{x}", JSON mapping, AutoMapper

Sanitizers/Guards
	•	Parameterized queries
	•	DataAnnotations validation
	•	Anti-forgery tokens
	•	Output encoding (Razor default, evitar Html.Raw)
	•	Safe HttpClient allowlist

⸻

3.4 Python (Django/Flask/FastAPI)

Sources
	•	Flask request.args/form/json/headers/cookies
	•	Django request.GET/POST, headers
	•	FastAPI function args + Pydantic models

Sinks
	•	SQL: cursor.execute(f"SELECT...{x}"), .raw()
	•	CMD: os.system, subprocess.run(..., shell=True)
	•	RCE: eval, exec, pickle.loads
	•	SSRF: requests.get(url), urllib.request.urlopen
	•	XSS: templates sin autoescape, mark_safe (Django), raw HTML responses
	•	XXE: lxml XML parse con entidades

Propagators
	•	f-strings, .format, JSON parsing, dict merges

Sanitizers/Guards
	•	Param queries
	•	subprocess.run([cmd, arg], shell=False)
	•	Pydantic/Django forms validation
	•	Template autoescape
	•	URL allowlist + block internal IPs

⸻

3.5 PHP (Laravel/Symfony)

Sources
	•	$_GET, $_POST, $_REQUEST, headers, cookies
	•	Laravel Request methods

Sinks
	•	SQL: DB::select("...$x"), raw queries
	•	CMD: exec, system, shell_exec
	•	RCE: eval, dangerous unserialize
	•	SSRF: curl_exec con URL controlada
	•	XSS: echo sin escape, blade {!! !!}
	•	SSTI: template compilation con input

Propagators
	•	concatenación ., interpolation, array merges

Sanitizers/Guards
	•	Prepared statements / query builder safe
	•	Escaping en views ({{ }} vs raw)
	•	Disable unsafe unserialize o usar allowed classes
	•	Validación request

⸻

3.6 Go (net/http, Gin)

Sources
	•	r.URL.Query(), mux.Vars, body decode JSON
	•	Gin c.Query, c.Param, c.BindJSON

Sinks
	•	SQL: db.Query("..."+x), fmt.Sprintf → query
	•	CMD: exec.Command("sh","-c", user)
	•	SSRF: http.Get(url)
	•	XSS: templates sin escape (html/template es más seguro que text/template)
	•	Zip: unzip sin validar paths

Propagators
	•	fmt.Sprintf, concatenación, json decode, struct mapping

Sanitizers/Guards
	•	Parameterized queries (db.Query(".. WHERE id=?", id))
	•	exec.Command(cmd, args...) sin shell
	•	html/template + autoescape
	•	Validación de input

⸻

3.7 Ruby (Rails)

Sources
	•	params, headers, cookies
	•	JSON body mapping

Sinks
	•	SQL: where("name = '#{x}'"), find_by_sql
	•	CMD: backticks, system, exec, %x()
	•	RCE: eval, instance_eval, YAML unsafe load
	•	SSRF: Net::HTTP.get(URI(url))
	•	XSS: raw, html_safe
	•	Deserialization: Marshal.load, YAML unsafe

Propagators
	•	string interpolation #{}, concatenación, hash merges

Sanitizers/Guards
	•	ActiveRecord parameterization (where(name: x))
	•	Avoid html_safe/raw
	•	Safe YAML load, avoid Marshal on untrusted data
	•	Validaciones strong params

⸻

4) Cómo usar esto para tu engine (muy directo)

Para cross-file, define:
	1.	Taint labels por tipo (SQL, CMD, HTML, URL, PATH, LDAP, NOSQL, TEMPLATE, LOG, etc.)
	2.	Propagators que preservan label (concat, format, parse)
	3.	Sinks que disparan finding si reciben label incompatible sin guard
	4.	Guards que “consumen” label (parameterization, escape contextual, allowlists)
	5.	Confidence scoring (taint puro alto, patterns medio, design rules score distinto)

⸻
