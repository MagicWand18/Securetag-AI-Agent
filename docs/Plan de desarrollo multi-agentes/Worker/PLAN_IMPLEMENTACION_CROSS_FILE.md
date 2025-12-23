# Plan de Implementación: Análisis de Vulnerabilidades Cross-File (Híbrido)

**Fecha:** 2025-12-20
**Objetivo:** Implementar la Tarea 10.2 para detectar vulnerabilidades que atraviesan múltiples archivos (Cross-File Taint Analysis), superando las limitaciones del análisis estático tradicional por archivo.

---

## 🧠 Concepto: Análisis Híbrido

Utilizaremos un enfoque de dos etapas:
1.  **Extracción (Semgrep)**: Usar reglas ligeras ("Topology Rules") para identificar nodos de interés (Entradas de datos, Llamadas a funciones, Ejecuciones de BD) y exportarlos como metadatos estructurados.
2.  **Correlación (Worker Logic)**: Un nuevo motor en TypeScript (`CrossFileAnalyzer`) que reconstruye el flujo de datos conectando estos nodos a través de los límites de los archivos.

---

## 📅 Fases de Implementación

### Fase 1: Ingeniería de Reglas de Topología (Extracción) (✅ COMPLETADO)

**Objetivo:** Identificar piezas del rompecabezas sin juzgar si son vulnerables aún.

*   **Tarea 1.1:** Crear archivo de reglas `data/rules/topology-typescript.yaml`.
    *   *Detalle:* Definir patrones para detectar:
        *   `source-controller`: Métodos de controladores expuestos (ej. `@Post()`, `app.get()`).
        *   `call-service`: Llamadas a métodos de servicios inyectados (ej. `this.userService.update(...)`).
        *   `sink-db`: Ejecuciones de queries peligrosas en servicios (ej. `query(...)`, `execute(...)`).
    *   *Lenguajes:* TypeScript/JavaScript (NestJS, Express) inicialmente.

*   **✅ Unit Test 1 (Validación de Reglas):**
    *   Crear archivo `tests/fixtures/rules_test.ts` con código de ejemplo.
    *   Ejecutar `semgrep --config data/rules/topology-typescript.yaml tests/fixtures/rules_test.ts`.
    *   **Criterio de Éxito:** Semgrep debe reportar hallazgos con severidad `INFO` para cada nodo (Source, Call, Sink).
    *   **Resultado (2025-12-22):** 25 hallazgos detectados.
        *   **6 Nodos de Topología**: Sources (`source-controller`) y Calls (`call-service`).
        *   **19 Nodos de Sinks**: Cobertura de las 18 categorías de vulnerabilidad (algunas líneas activan múltiples reglas, ej. `call-service` + `sink-mass-assignment`).
        *   Validación exitosa: Todos los vectores del catálogo fueron identificados.

---

### Fase 2: Motor de Análisis Cross-File (Lógica) (✅ COMPLETADO)

**Objetivo:** Conectar las piezas para encontrar la vulnerabilidad.

*   **Tarea 2.1:** Crear servicio `src/worker/services/CrossFileAnalyzer.ts`.
    *   *Funcionalidad:*
        1.  Ingerir el JSON de resultados de Semgrep.
        2.  Construir un **Grafo de Llamadas** en memoria: `Controlador` -> `Llama a` -> `Servicio`.
        3.  Ejecutar algoritmo de búsqueda de caminos (Pathfinding):
            *   ¿Existe un camino desde un `source-controller` hasta un `sink-db`?
            *   ¿El argumento pasa "tainted" (contaminado) sin sanitización?

*   **✅ Unit Test 2 (Lógica del Grafo):**
    *   **Archivo:** `test/worker/CrossFileAnalyzer.test.ts`
    *   **Propósito:** Validar que el motor es capaz de correlacionar nodos desconectados (Source en archivo A, Sink en archivo B) y reportar vulnerabilidad solo cuando existe una conexión lógica válida.
    *   **Resultado:** Tests pasando correctamente (2/2).

---

### Fase 3: Integración en el Worker (✅ COMPLETADO)

**Objetivo:** Incorporar el nuevo motor en el flujo de trabajo existente.

*   **Tarea 3.1:** Modificar `src/worker/TaskExecutor.ts`.
    *   *Acción:*
        1.  Agregar `data/rules/topology-typescript.yaml` a los argumentos de ejecución de Semgrep.
        2.  Capturar el output crudo.
        3.  Instanciar e invocar `CrossFileAnalyzer.analyze(semgrepResults)`.
        4.  Fusionar los nuevos hallazgos "sintéticos" (Cross-File) con los hallazgos originales.

*   **✅ Unit Test 3 (Integración):**
    *   **Archivo:** `test/worker/TaskExecutorIntegration.test.ts`
    *   **Propósito:** Validar que el `TaskExecutor` orquesta correctamente la ejecución de Semgrep, la invocación del analizador Cross-File y el manejo de los Feature Flags del servidor.
    *   **Resultado:** Test de integración pasando correctamente (validando flag `cross_file_analysis: true`).

---

### Fase 4: Validación End-to-End (✅ COMPLETADO)

**Objetivo:** Prueba de fuego con código real.

*   **Tarea 4.1:** Crear Fixture Vulnerable.
    *   **Archivos:** `test/fixtures/mvc/users.controller.ts` y `test/fixtures/mvc/users.service.ts`.
    *   **Propósito:** Proveer un caso de uso real de arquitectura MVC (NestJS) con vulnerabilidades de Inyección SQL y Command Injection distribuidas entre archivos para probar la detección.

*   **Tarea 4.2:** Ejecutar escaneo completo (Reproduction Script).
    *   **Archivo:** `scripts/repro_cross_file.ts`
    *   **Propósito:** Script de demostración que ejecuta el flujo completo (Semgrep CLI -> Extracción -> Análisis Cross-File) fuera del ciclo de vida del worker para validación visual rápida.
    *   **Resultado:** Detección exitosa de 2 vulnerabilidades Cross-File (SQLi y CMDi) en los fixtures.

---

## 📚 Apéndice: Flujos y Estándares

### ¿Existen más flujos peligrosos? (OWASP Top 10 y Otros)

El patrón `Source` (Entrada) ➡️ `Sink` (Punto crítico) cubre una amplia gama de vulnerabilidades. Para lograr la máxima robustez, implementaremos soporte para los siguientes flujos críticos, basados en OWASP Top 10 y CWE Top 25:

#### 1. Injection (A03:2021 / A05:2025)
*   **SQL Injection (SQLi):**
    *   *Flujo:* Input Usuario ➡️ Service ➡️ **Database Query** (ej. `query()`, `execute()`, ORM raw queries).
*   **Command Injection (CMDi):**
    *   *Flujo:* Input Usuario ➡️ Service ➡️ **System Execution** (ej. `exec()`, `spawn()`, `system()`, `subprocess.call()`).
*   **Code Injection / Remote Code Execution (RCE):**
    *   *Flujo:* Input Usuario ➡️ Service ➡️ **Code Evaluator** (ej. `eval()`, `Function()`, `setTimeout(string)`).
*   **LDAP Injection:**
    *   *Flujo:* Input Usuario ➡️ Service ➡️ **LDAP Search** (ej. `ldapClient.search()`).
*   **NoSQL Injection:**
    *   *Flujo:* Input Usuario ➡️ Service ➡️ **NoSQL Query** (ej. `db.collection.find({ $where: ... })`).

#### 2. Server-Side Request Forgery (SSRF) (A10:2021 / A01:2025 merged)
*   **SSRF:**
    *   *Flujo:* URL/Host del Usuario ➡️ Service ➡️ **HTTP Client** (ej. `axios.get()`, `fetch()`, `request()`, `urllib`).

#### 3. Broken Access Control / Path Traversal (A01:2021 / A01:2025)
*   **Path Traversal (LFI/RFI):**
    *   *Flujo:* Filename del Usuario ➡️ Service ➡️ **File System Operation** (ej. `fs.readFile()`, `fs.createReadStream()`, `include()`).
*   **Open Redirect:**
    *   *Flujo:* URL del Usuario ➡️ Service ➡️ **HTTP Redirect** (ej. `res.redirect()`, `Location` header).

#### 4. Cryptographic Failures (A02:2021 / A04:2025)
*   **Weak Randomness / Hardcoded Secrets:**
    *   *Flujo:* RNG inseguro / Secreto en código ➡️ **Crypto Op / Auth**.

#### 5. Integrity Failures (A08:2021 / A08:2025)
*   **Insecure Deserialization:**
    *   *Flujo:* Objeto Serializado del Usuario ➡️ Service ➡️ **Deserializer** (ej. `JSON.parse()` confiando en tipos, `unserialize()`, `pickle.load()`).

#### 6. Cross-Site Scripting (XSS) (Stored/Reflected) (A03:2021 Injection)
*   **Stored XSS:**
    *   *Flujo:* Input Usuario ➡️ DB ➡️ **View Rendering** (HTML sin escapar).
    *   *Nota:* Requiere rastrear desde DB hasta la Vista (Source: DB, Sink: HTML response).
*   **Reflected XSS:**
    *   *Flujo:* Input Usuario ➡️ **HTTP Response** (sin sanitización/escaping).

#### 7. Log Injection / Forging (A09:2021 / A09:2025)
*   **Log Injection:**
    *   *Flujo:* Input Usuario ➡️ Service ➡️ **Logger** (ej. `console.log()`, `winston.info()`) sin sanitizar saltos de línea.    

#### 8. Advanced Node.js / Web Specifics
*   **Prototype Pollution:**
    *   *Flujo:* Input Usuario ➡️ `merge()`/`extend()`/`clone()` ➡️ **Object Prototype**.
*   **Server-Side Template Injection (SSTI):**
    *   *Flujo:* Input Usuario ➡️ Service ➡️ **Template Engine** (ej. `res.render(input)`, `pug.render(input)`).
*   **XML External Entity (XXE):**
    *   *Flujo:* XML del Usuario ➡️ Service ➡️ **XML Parser** (ej. `libxmljs.parseXml(input)` con entidades habilitadas).
*   **Zip Slip (File Overwrite):**
    *   *Flujo:* Archivo Zip del Usuario ➡️ Service ➡️ **Unzip Operation** (extraer archivos fuera del directorio destino).
*   **Regular Expression DoS (ReDoS):**
    *   *Flujo:* Input Usuario ➡️ Service ➡️ **Regex Execution** (RegEx vulnerable).    

#### 9. Business Logic & API Flaws
*   **Mass Assignment:**
    *   *Flujo:* `req.body` completo ➡️ **ORM Create/Update**.
*   **BOLA / IDOR:**
    *   *Flujo:* ID en Input ➡️ **DB Access** (sin check de ownership).
*   **Race Conditions (TOCTOU):**
    *   *Flujo:* DB Read ➡️ await ➡️ DB Write (sin lock).
*   **Insecure JWT:**
    *   *Flujo:* Weak Secret ➡️ **JWT Sign**.

#### 10. Cross-Site Request Forgery (CSRF)
*   **CSRF:**
    *   *Flujo:* Auth User ➡️ **State-Changing Action** (POST/PUT) sin Token/SameSite.

#### 11. Subida de Archivos sin Restricciones
*   **Unrestricted File Upload:**
    *   *Flujo:* File Input ➡️ **Storage/Exec** (sin validar tipo/nombre/path).

#### 12. Security Misconfiguration
*   **Misconfig:**
    *   *Flujo:* Config Default/Insegura ➡️ **Runtime** (ej. debug=true, no headers).

#### 13. Supply Chain (SCA)
*   **Vulnerable Component:**
    *   *Flujo:* Dependencia con CVE ➡️ **Runtime Import**.

#### 14. Errores de Memoria (C/C++)
*   **Buffer Overflow / Use-After-Free:**
    *   *Flujo:* Input ➡️ **Unsafe Memory Op**.

#### 15. Fallos de Autenticación
*   **Weak Auth:**
    *   *Flujo:* Password ➡️ **Weak Hash** / Logic Bypass.

#### 16. Manejo Incorrecto de Excepciones
*   **Unhandled Exception:**
    *   *Flujo:* Error ➡️ **Crash / Info Leak** (catch vacío o verbose).

#### 17. Client-side & Misc
*   **DOM XSS / Clickjacking:**
    *   *Flujo:* Input ➡️ **DOM Sink** / UI sin frame-breakers.

#### 18. Insufficient Logging
*   **No Logging:**
    *   *Flujo:* Critical Event (Login Fail) ➡️ **No Log / Silent Fail**.

### Matriz de Implementación de Reglas (Fase 1.2)

Expandiremos `data/rules/topology-typescript.yaml` para incluir los Sinks de las 18 categorías (priorizando Node.js/TS):

| Categoría | Tipo de Sink (Semgrep ID) | Patrones (Ejemplos Node/TS) |
| :--- | :--- | :--- |
| **SQLi** | `sink-sql` | `query($Q)`, `execute($Q)`, `raw($Q)` |
| **CMDi** | `sink-command` | `exec($C)`, `spawn($C)`, `child_process.exec($C)` |
| **Codei/RCE** | `sink-code-eval` | `eval($C)`, `new Function($C)`, `vm.run($C)` |
| **SSRF** | `sink-ssrf` | `axios.get($U)`, `fetch($U)`, `http.get($U)` |
| **Path Trav** | `sink-path-traversal` | `fs.readFile($P)`, `fs.open($P)`, `res.sendFile($P)` |
| **NoSQLi** | `sink-nosql` | `$COLL.find({$where: $C})` |
| **Deserial** | `sink-deserialization` | `node_serialize.unserialize($D)` |
| **Proto Poll** | `sink-proto-pollution` | `merge($A,$B)`, `assign($A,$B)` (deep) |
| **SSTI** | `sink-ssti` | `res.render($V, $D)`, `pug.render($S)` |
| **XXE** | `sink-xxe` | `libxmljs.parseXml($X)` |
| **Mass Assign** | `sink-mass-assignment` | `User.create($B)`, `$REPO.save($B)` |
| **BOLA/IDOR** | `sink-db-access-by-id` | `$REPO.findOne($ID)`, `$REPO.delete($ID)` |
| **CSRF** | `sink-csrf-check` | Rutas POST/PUT sin middleware CSRF (detectar ausencia) |
| **File Upload** | `sink-file-upload` | `mv($P)`, `fs.writeFile($P)` (con input name) |
| **Weak Crypto** | `sink-weak-crypto` | `md5($P)`, `Math.random()` (para tokens) |
| **Reflected XSS**| `sink-reflected-xss` | `res.send($I)`, `res.write($I)` (sin escape) |
| **Log Inj** | `sink-log-injection` | `console.log($I)`, `logger.info($I)` |

La lógica en `CrossFileAnalyzer.ts` (Fase 2) correlacionará estos sinks con los sources detectados.

### Fase 1.3: Soporte para Python (Completado)
- [x] Crear `data/rules/topology-python.yaml`.
- [x] Definir patrones para Flask/Django (Routes, Views, Models).
- [x] Mapear sinks específicos de Python (e.g., `subprocess.call`, `pickle.loads`).

### Fase 1.4: Soporte para Java (Completado)
- [x] Crear `data/rules/topology-java.yaml`.
- [x] Definir patrones para Spring Boot (Controllers, Services, Repositories).
- [x] Mapear sinks específicos de Java (e.g., `Runtime.exec`, `EntityManager`).

### Fase 1.5: Expansión de Lenguajes (Futuro)

El motor `CrossFileAnalyzer` ha sido diseñado para ser agnóstico del lenguaje. Para soportar nuevos lenguajes, solo se requiere crear el archivo de reglas de topología correspondiente (`topology-<lang>.yaml`).

**Lenguajes Prioritarios:**

1.  **Vue.js (Frontend/Fullstack)**
    *   **Reto**: Analizar flujo de datos entre Componentes (`props`, `emit`) y Stores (Pinia/Vuex).
    *   **Objetivo**: Detectar XSS vía `v-html` inseguro propagado desde props, o contaminación de estado global.
    *   **Archivos**: `.vue`, `.js`, `.ts`.

2.  **C# (.NET Core)**
    *   **Objetivo**: Soporte para arquitecturas empresariales MVC en .NET.
    *   **Patrones**: `ControllerBase`, `DependencyInjection`, Entity Framework.

3.  **PHP (Laravel/Symfony)**
    *   **Objetivo**: Cubrir el vasto mercado de PHP moderno.
    *   **Patrones**: Rutas en `web.php`, Controladores, Eloquent ORM.

4.  **Go (Golang)**
    *   **Objetivo**: Microservicios de alto rendimiento.
    *   **Patrones**: `gin-gonic`, `net/http`, `sqlx`.

5.  **Ruby (Rails)**
    *   **Objetivo**: Aplicaciones legacy y startups.
    *   **Patrones**: MVC clásico de Rails (`ActionController`, `ActiveRecord`).

---

## 4. Estado Actual

| Fase | Descripción | Estado |
| :--- | :--- | :--- |
| **Source** | `@GetMapping(...) public $RET $METHOD(...)` | `source-controller` |
| **Call** | `this.$SERVICE.$METHOD(...)` | `call-service` |
| **Sink SQLi** | `entityManager.createQuery($Q)` | `sink-sql` |
| **Sink CMDi** | `Runtime.getRuntime().exec($C)` | `sink-command` |
| **Sink XSS** | `response.getWriter().write($S)` | `sink-reflected-xss` |

*   **Pruebas:** Crear `test/fixtures/java_mvc/` con `UserController.java` y `UserService.java`.

### Fase 1.5: Otros Lenguajes Factibles

El enfoque de Cross-File Analysis es altamente portable a lenguajes orientados a objetos o con estructuras MVC claras.

1.  **Vue.js (Frontend/Fullstack)**:
    *   **Estado:** ⏸️ Pospuesto (Limitaciones Técnicas).
    *   **Extensión:** `.vue`
    *   **Razón:** El soporte actual de Semgrep para parsear semánticamente archivos `.vue` (Script + Template) es insuficiente para crear reglas de topología complejas. Se requiere un pre-procesador o esperar mejoras en el motor.
    *   **Nota:** Las reglas basadas puramente en Regex fueron evaluadas y descartadas por falta de contexto semántico.

2.  **C# (.NET Core)**:
    *   **Extensión:** `.cs`
    *   **Viabilidad:** Alta.
    *   **Estructura:** Controllers (`[HttpGet]`), Services (Dependency Injection), EF Core (`FromSqlRaw`).
    *   **Reglas:** Similares a Java.

2.  **Go (Golang)**:
    *   **Extensión:** `.go`
    *   **Viabilidad:** Media/Alta.
    *   **Estructura:** Handlers (`http.HandleFunc`), Structs/Interfaces para servicios.
    *   **Reto:** Menos estandarizado que MVC tradicional, pero patrones como `gin` o `echo` son detectables.

3.  **PHP (Laravel/Symfony)**:
    *   **Extensión:** `.php`
    *   **Viabilidad:** Alta.
    *   **Estructura:** Controllers, Service Classes, Eloquent/Doctrine.
    *   **Reglas:** Sintaxis de llamadas `$this->service->method()`.

4.  **Ruby (Rails)**:
    *   **Extensión:** `.rb`
    *   **Viabilidad:** Alta.
    *   **Estructura:** Controllers, Models/Services.
    *   **Reglas:** `def index ... end`, `User.find_by_sql`.

## ❓ Preguntas Frecuentes

### ¿Por qué Cross-File si Semgrep ya encuentra SQLi?

Es una duda común. Semgrep (en su versión OSS estándar) es excelente encontrando vulnerabilidades **dentro del mismo archivo**, pero tiene puntos ciegos críticos en arquitecturas modernas como MVC (Model-View-Controller).

**Ejemplo de Punto Ciego (Single-File):**

*   **Archivo A (Controller):** Recibe datos del usuario (`req.body.id`). Semgrep ve la entrada, pero no ve ningún uso peligroso aquí. -> **Safe**
*   **Archivo B (Service):** Recibe un argumento `id` y lo concatena en SQL (`"SELECT * FROM users WHERE id = " + id`). Semgrep ve el uso peligroso, pero no sabe si `id` viene del usuario o es una constante interna segura. -> **Safe/Low Confidence**

**La Solución Cross-File:**
Nuestro motor conectará los puntos: "El dato entró en el Archivo A, viajó al Archivo B y explotó en la base de datos". Solo viendo el panorama completo podemos confirmar la vulnerabilidad con alta certeza.

## 💰 Estrategia de Monetización (Arquitectura Server-Side) (✅ COMPLETADO)

Para garantizar desacoplamiento, escalabilidad y gestión dinámica, la lógica de autorización se centralizará en el Servidor, no en el Worker.

### Fase 3.5: Implementación de Feature Flags (✅ COMPLETADO)

**1. Lógica en el Servidor (`src/server/index.ts`)**
El servidor será el único responsable de decidir qué capacidades tiene activas el tenant basándose en su configuración (`llm_config`, `plan`, etc.).

*   **Acción:** Al crear el payload de la tarea (`taskPayload`), el servidor consultará la configuración del tenant y establecerá explícitamente el flag.
    ```typescript
    // Pseudocódigo en Server
    const enableDeepVision = tenantConfig.llm_config?.deep_code_vision === true;
    const enableCrossFile = tenantConfig.plan === 'Premium'; // O basado en llm_config

    const taskPayload = {
        // ...
        features: { 
            deep_code_vision: enableDeepVision,
            cross_file_analysis: enableCrossFile 
        }
    };
    ```

**2. Lógica en el Worker (`src/worker/TaskExecutor.ts`)**
El Worker actuará como un ejecutor "tonto" (stateless regarding billing), obedeciendo únicamente a las capacidades instruidas en el trabajo.

*   **Implementación:**
    ```typescript
    // En TaskExecutor.ts
    // Única fuente de verdad: El flag 'features' del job.
    // Eliminamos cualquier chequeo de 'tier' o 'plan' local.
    const enableCrossFile = job.features?.cross_file_analysis === true;
    
    if (enableCrossFile) {
        logger.info('[Cross-File Check] Feature Enabled by Server. Running topology analysis...');
        const crossFileReports = await this.crossFileAnalyzer.analyze(payload, workDir);
        // ...
    }
    ```

**Beneficios de esta arquitectura:**
*   **Desacoplamiento:** El Worker no necesita conocer los nombres de los planes ("Premium", "Gold", "Enterprise").
*   **Gestión Dinámica:** Permite activar Cross-File Analysis a usuarios Free para pruebas o eventos especiales simplemente modificando la inyección en el Servidor, sin redesplegar Workers.
*   **Consistencia:** Sigue el mismo patrón establecido por Deep Code Vision.


### ¿Son independientes del lenguaje?

**Conceptualmente SÍ, Técnicamente NO.**

*   **Concepto (Universal):** "Si entra dato sucio y llega a lugar sensible sin limpiar, es peligroso". Esto aplica a Java, Python, Go, PHP, etc.
*   **Implementación (Específica):**
    *   En **Java (Spring)**, la entrada es `@GetMapping` y el sink es `entityManager.createQuery`.
    *   En **Python (Flask)**, la entrada es `@app.route` y el sink es `cursor.execute`.
    *   En **Node (Express)**, la entrada es `req.body` y el sink es `pool.query`.

**Estrategia de SecureTag:**
El motor `CrossFileAnalyzer` (Fase 2) será **agnóstico**. Solo entenderá de nodos `Source` y `Sink`.
La "traducción" de cada lenguaje se hará en la **Fase 1 (Reglas YAML)**. Si queremos soportar Python en el futuro, solo agregamos `topology-python.yaml`, y el motor de análisis funcionará sin cambios.





# 🧪 Plan de Pruebas de Integración (Docker) - Cross-File Analysis

Este plan define las pruebas necesarias para validar la funcionalidad de **Cross-File Taint Analysis** en un entorno de contenedores idéntico a producción, asegurando que la segregación de características por plan (Premium vs Free) funcione correctamente.

## 📋 Prerrequisitos
*   Entorno Docker local activo.
*   Imágenes de `securetag-server` y `securetag-worker` construidas con los últimos cambios.
*   Base de datos PostgreSQL local accesible por los contenedores.

## 🧪 Escenario 1: Validación Premium (Feature Enabled)

**Objetivo:** Verificar que un tenant con plan `Premium` activa el motor de análisis cross-file y detecta vulnerabilidades complejas.

### Configuración
1.  **Tenant**: Usar `spartane` (o crear `tenant_premium`).
2.  **Base de Datos**:
    ```sql
    UPDATE tenants SET plan = 'Premium' WHERE id = 'spartane';
    -- Asegurar que la configuración permite deep_code_vision (generalmente va de la mano)
    UPDATE tenants SET config = jsonb_set(config, '{llm_config,deep_code_vision}', 'true') WHERE id = 'spartane';
    ```
3.  **Input**: Archivo ZIP conteniendo `test/fixtures/mvc/` (Controlador y Servicio vulnerables).

### Pasos de Prueba
1.  Iniciar servicios: `docker-compose up -d`
2.  Enviar tarea de escaneo vía API:
    ```bash
    curl -X POST http://localhost:8080/codeaudit/upload \
      -H "X-API-Key: $API_KEY_PREMIUM" \
      -F "file=@vulnerable-mvc.zip"
    ```
3.  Monitorear logs del Worker:
    `docker logs securetag-worker -f`

### Criterios de Aceptación
*   [ ] **Log de Activación**: Debe aparecer:
    `info: [Cross-File Check] Feature Enabled by Server (Premium). Running topology analysis...`
*   [ ] **Ejecución Semgrep**: Se debe observar la ejecución de reglas de topología (`topology-mvc.yaml`).
*   [ ] **Hallazgos**: El JSON final debe contener vulnerabilidades que un escaneo normal no detectaría (ej. SQL Injection correlacionado entre Controller y Service).
    *   *Verificación*: Buscar `analysis_json.cross_file_details` o evidencia de la traza completa.

---

## 🧪 Escenario 2: Validación Standard/Free (Feature Disabled)

**Objetivo:** Verificar que un tenant con plan `Standard` o `Free` **NO** tiene acceso al motor cross-file, ahorrando recursos computacionales.

### Configuración
1.  **Tenant**: Crear o modificar `tenant_free`.
2.  **Base de Datos**:
    ```sql
    UPDATE tenants SET plan = 'Free' WHERE id = 'tenant_free';
    ```
3.  **Input**: Mismo archivo ZIP (`test/fixtures/mvc/`).

### Pasos de Prueba
1.  Reiniciar Worker (para limpiar estados si es necesario): `docker-compose restart worker`
2.  Enviar tarea de escaneo vía API:
    ```bash
    curl -X POST http://localhost:8080/codeaudit/upload \
      -H "X-API-Key: $API_KEY_FREE" \
      -F "file=@vulnerable-mvc.zip"
    ```
3.  Monitorear logs del Worker.

### Criterios de Aceptación
*   [ ] **Log de Salto**: Debe aparecer (o la ausencia de la activación):
    `info: [Cross-File Check] Feature Disabled for this job.`
*   [ ] **Eficiencia**: El tiempo de escaneo debe ser menor que en el escenario Premium.
*   [ ] **Hallazgos**: El reporte **NO** debe contener los hallazgos complejos de cross-file (o solo mostrar los hallazgos superficiales por archivo individual si las reglas base los detectan).

---

## 🛠️ Script de Automatización (Propuesto)

Se creará un script `scripts/test_docker_integration.sh` que:
1.  Construye las imágenes frescas.
2.  Levanta el stack.
3.  Inyecta los datos de prueba en Postgres.
4.  Ejecuta los `curl` contra el endpoint local.
5.  Hace `grep` en los logs del contenedor para validar los mensajes clave.




# Plan de Pruebas Extendidas - Cross-File Analysis

## Objetivo
Ampliar la cobertura de pruebas de integración para validar la detección de patrones de ataque complejos en arquitecturas MVC (Node.js/NestJS/Express), asegurando que el motor `CrossFileAnalyzer` correlacione correctamente fuentes, llamadas y sumideros para diversas categorías de vulnerabilidad.

## Escenarios de Prueba

### 1. Stored XSS (Cross-Site Scripting)
*   **Flujo**: `Controller` (Recibe input sin sanear) -> `Service` (Guarda en DB) -> `Controller` (Renderiza/Devuelve datos sin escapar).
*   **Archivo Source**: `posts.controller.ts` (Método `createPost` recibe `body.content`).
*   **Archivo Sink**: `posts.service.ts` (Método `save` inserta en DB sin sanitización).
*   **Expectativa**: Detección de flujo `cross-file-xss`.

### 2. Path Traversal (LFI)
*   **Flujo**: `Controller` (Recibe nombre de archivo) -> `Service` (Lee archivo del sistema).
*   **Archivo Source**: `files.controller.ts` (Método `getFile` recibe `query.path`).
*   **Archivo Sink**: `files.service.ts` (Método `read` usa `fs.readFileSync(path)` sin validar).
*   **Expectativa**: Detección de flujo `cross-file-path-traversal`.

### 3. SSRF (Server-Side Request Forgery)
*   **Flujo**: `Controller` (Recibe URL destino) -> `Service` (Realiza petición HTTP).
*   **Archivo Source**: `proxy.controller.ts` (Método `fetchUrl` recibe `body.url`).
*   **Archivo Sink**: `proxy.service.ts` (Método `makeRequest` usa `axios.get(url)` o `fetch(url)`).
*   **Expectativa**: Detección de flujo `cross-file-ssrf`.

### 4. Broken Access Control (IDOR)
*   **Flujo**: `Controller` (Recibe ID de recurso) -> `Service` (Consulta DB por ID sin verificar owner).
*   **Archivo Source**: `account.controller.ts` (Método `getAccount` recibe `param.id`).
*   **Archivo Sink**: `account.service.ts` (Método `findById` hace `SELECT * FROM accounts WHERE id = input`).
*   **Nota**: Este es más difícil de detectar estáticamente como "vulnerabilidad" sin contexto de auth, pero podemos detectar el patrón "User Input -> DB Lookup" como "Sensitive Lookup".
*   **Expectativa**: Detección de flujo `cross-file-broken-access-control` (si definimos la regla correspondiente).

### 5. Prototype Pollution
*   **Flujo**: `Controller` (Recibe JSON arbitrario) -> `Service` (Merge recursivo inseguro).
*   **Archivo Source**: `settings.controller.ts` (Recibe configuración).
*   **Archivo Sink**: `settings.service.ts` (Usa `_.merge({}, input)` o función recursiva vulnerable).
*   **Expectativa**: Detección de flujo `cross-file-prototype-pollution`.

## Implementación de Fixtures
Se crearán nuevos archivos en `test/fixtures/mvc_extended/` simulando estos escenarios.

### Estructura de Archivos
```
test/fixtures/mvc_extended/
├── posts.controller.ts
├── posts.service.ts
├── files.controller.ts
├── files.service.ts
├── proxy.controller.ts
├── proxy.service.ts
└── settings.controller.ts
```

## Ejecución
Utilizar el script existente `scripts/test_docker_integration.sh` apuntando al nuevo directorio de fixtures.
