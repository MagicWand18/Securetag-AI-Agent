# 🗂️ Backlog de Funcionalidades y Mejoras (Roadmap)

**Estado**: Documentación de Ideas & Planificación de Release
**Fecha**: 2025-12-29
**Objetivo**: Estructurar las funcionalidades pendientes en fases lógicas, priorizando aquellas críticas para la seguridad y operatividad básica del producto (MVP).

---

## 🚨 Fase 0: [COMPLETADO] Hotfixes y Estabilización (Prioridad Inmediata)
*Correcciones críticas derivadas de pruebas recientes. Bloqueantes para cualquier release.*

### 0.1 [COMPLETADO] Bugs Críticos y Funcionalidad Core
*   **[COMPLETADO] Error 404 en Reportes / Conectividad**: Solucionado problema de conectividad interna (`ENOTFOUND securetag-nginx`) y rutas de API. Los contenedores ahora se comunican correctamente en la red `securetag-net`.
*   **[COMPLETADO] Descuento de Créditos**: Refactorizado completamente bajo el plan `PLAN_Refactor_Credit_Economy.md`.
    *   Implementado modelo "Cobro Exacto" y "On-Demand".
    *   Corregida la sincronización de créditos Frontend <-> Backend (eliminado el problema de "restauración mágica" de créditos).
    *   Implementado reembolso automático por fallos de sistema y reembolso parcial por reglas no generadas.
*   **[COMPLETADO] Validación de Tier en Backend**: Implementada validación estricta de planes (Free/Pro/Enterprise) y modelos de IA en `src/server/index.ts` antes de procesar reglas custom.
*   **[COMPLETADO] Limpieza de Código (Linting)**: Eliminar importaciones y variables no utilizadas detectadas en `sast.ts`, `apiKeys.ts`, y `AccountPage.tsx` para mantener la calidad del código.
    > 💡 **Contexto Técnico:** Ejecutar `eslint --fix` o limpiar manualmente las líneas reportadas (ej. imports de `lucide-react` no usados). Verificar que no se eliminen imports necesarios para tipos implícitos.
*   **[COMPLETADO] Página de Proyectos IDLE**: Reactivar/Corregir la página de listado de proyectos que se mantiene en estado de carga/idle indefinidamente.
    > 💡 **Contexto Técnico:** Eliminado el flag `showEmptyState = true` que estaba hardcodeado en `SastProjectsPage.tsx`, permitiendo ahora visualizar los proyectos reales obtenidos desde el backend.

### 0.2 [COMPLETADO] Sincronización y Visualización de Datos (Frontend <-> Backend)
*   **[COMPLETADO]Visualización de Créditos**: Ajustar el display de créditos en `AccountPage`. Cambiar formato "3/1000" (incorrecto) a "Consumidos / Disponibles" o simplemente "Saldo Actual", aclarando que no hay un "límite máximo" arbitrario de tenencia.
    > 💡 **Contexto Técnico:** Modificar `AccountPage.tsx`. Eliminar la barra de progreso basada en "1000" si no existe tal límite. Mostrar simplemente `user.credits` disponible. Si se quiere mostrar "Consumidos", se necesita una nueva tabla o campo `creditsUsed` en el esquema de Prisma para llevar ese histórico.

### [COMPLETADO] 0.3 Errores de UI/UX y Responsive
*   **[COMPLETADO] Fondo Animado en Login (Mobile/Narrow)**: Corregir bug visual donde al estrechar la ventana en la página de Login, aparece incorrectamente el fondo animado reservado para usuarios logueados.
    > 💡 **Contexto Técnico:** Revisar `MainLayout.tsx` o el componente wrapper de la página. Probablemente hay una clase CSS `hidden md:block` mal aplicada o un media query condicional que no distingue correctamente entre estado `isLoggedIn` y el tamaño de pantalla para el fondo.
*   **[COMPLETADO] Protección de Rutas (Auth Guards)**:
    *   Corregir acceso indebido a menús de navegación cuando la sesión expira.
    *   Forzar redirección estricta a `/login` al intentar acceder a rutas protegidas (`/sast`, `/waf`, `/account`) sin sesión activa.
    > 💡 **Contexto Técnico:** Wasp maneja esto automáticamente si las páginas están declaradas con `authRequired: true` en `main.wasp`. Verificar que estas páginas tengan esa propiedad. Para los menús, usar `useAuth()` en el componente de Navbar para renderizar condicionalmente los enlaces de navegación.

---

## 🚨 Fase 1: Release Critical (Indispensable para Lanzamiento) [COMPLETADO]
*Estas funciones son obligatorias para garantizar seguridad, integridad de datos y flujos básicos operables. El producto no debe salir al público sin ellas.*

### 1.1 Seguridad y Gestión de Identidad (Auth) [COMPLETADO]
*   **Unicidad de Cuenta**: Validar estrictamente que no se pueda crear una cuenta con un correo electrónico o número de teléfono ya registrados en el sistema.
    > 💡 **Contexto Técnico:** Prisma ya hace esto para `@unique` en email. Para teléfono, si es opcional pero único, asegurar que el índice en DB lo soporte. Añadir validación en el Action de Signup (`user/operations.ts` o similar) antes de intentar crear el usuario para devolver un error amigable "El usuario ya existe".
*   **Verificación de Identidad**: Implementar flujo de verificación mediante código (OTP) enviado por email o SMS durante el proceso de registro (Sign-up) para asegurar que los usuarios son reales.
    > 💡 **Contexto Técnico:** Wasp soporta Email Verification. Habilitarlo en `main.wasp`: `emailVerification: { clientRoute: EmailVerificationRoute, ... }`. Configurar proveedor de envío de correos (SendGrid/SMTP/Resend) en variables de entorno.
*   **Gestión de Ciclo de Vida del Usuario (Account Deletion)**:
    *   Implementar funcionalidad "Eliminar Cuenta" con confirmación explícita (similar a cancelar plan).
    *   **Sincronización de Borrado**: Asegurar que la eliminación en Frontend (`opensaas-db`) dispare la eliminación/desactivación en Backend (`securetag-db`).
        > ✅ **Solución Colateral**: Esta implementación resolverá el problema de "Persistencia Fantasma" (Fase 0.2) donde usuarios recreados veían datos antiguos.
    *   **Política de Retención**: Definir y aplicar estrategia de datos post-borrado (¿Borrado total o anonimización para estadísticas?). Definir qué datos se conservan para mejora del producto.
    > 💡 **Contexto Técnico:** Crear una Action `deleteAccount`. Esta acción debe: 1. Llamar al API del Backend (`securetag-db`) para borrar/anonimizar datos de escaneo. 2. Borrar datos en `opensaas-db`. 3. Invalidar sesión. Para retención, considerar "Soft Delete" (`deletedAt` en DB) en lugar de `DELETE` físico inicial, y un Cron Job para purga definitiva tras 30 días.

### 1.2 Flujo de Escaneo Core (UX/Functional) [COMPLETADO]
*   **Asociación de Proyectos**: Modificar la pantalla "New Scan" para permitir seleccionar un proyecto existente (mediante un dropdown de alias) en lugar de forzar siempre la creación de uno nuevo.
    > 💡 **Contexto Técnico:** En `NewScanPage.tsx`, añadir un selector (Dropdown/Combobox) que se llene con `useQuery(getProjects)`. Si el usuario selecciona uno, usar ese `projectId`. Si escribe un nombre nuevo, crear proyecto.
*   **Navegación Contextual**: Al hacer clic en "Nuevo Escaneo" desde la página de Historial de Proyecto o desde un Reporte, redirigir a la pantalla de escaneo con el proyecto de origen ya pre-seleccionado/pre-configurado.
    > 💡 **Contexto Técnico:** Usar React Router state o Query Params: `/new-scan?projectId=xyz`. En `NewScanPage`, leer el param y pre-seleccionar el valor en el Dropdown.
*   **Feedback de Progreso Real**: Actualizar el Dashboard SAST para consumir y mostrar los campos `progress` (%) y `eta` (tiempo restante) que ya proporciona el API de escaneo en tiempo real.
    > 💡 **Contexto Técnico:** El backend ya emite estos datos. Asegurar que el frontend haga Polling (`useQuery` con `refetchInterval`) o use WebSockets (si implementado) para actualizar la barra de progreso en vivo, en lugar de un spinner estático.
*   **Mejoras UX en "New Scan"**:
    *   **Visualización de Archivos**: Corregir display "0.00 MB" para archivos muy pequeños (mostrar bytes o KB).
        > 💡 **Contexto Técnico:** Función helper `formatBytes(size)` en JS: si size < 1MB, mostrar en KB o Bytes. Aplicar en el componente de Upload.
    *   **Validación de Nombres**: Mostrar indicación clara (hint) de que los nombres de proyecto no deben contener espacios.
        > 💡 **Contexto Técnico:** Añadir regex pattern al input HTML o validación Zod en el form: `/^[a-zA-Z0-9_-]+$/`. Mostrar mensaje de error en tiempo real bajo el input.
    *   **Transparencia en Custom Rules**: Mostrar al usuario explícitamente *qué* reglas se generaron (contenido o resumen), no solo la cantidad ("3 reglas generadas").
        > 💡 **Contexto Técnico:** La respuesta del API de generación de reglas debe devolver un array de objetos `{ name, description, severity }`. Iterar y mostrar esto en un Accordion o Modal "Ver Reglas Generadas" antes o después del escaneo.


### 1.3 Integridad de Datos y Facturación [COMPLETADO]
*   **Métricas de Evolución**: Actualizar la página "Project History" para visualizar las métricas que retorna el API: Vulnerabilidades Nuevas vs. Resueltas vs. Pendientes a lo largo del tiempo.
    > 💡 **Contexto Técnico:** Usar librería de gráficas (Recharts/Chart.js). El endpoint de historial ya debe devolver series temporales. Mapear datos a la gráfica.
*   **Descarga de Recibos**: Funcionalidad en la sección de Billing para permitir a los usuarios descargar sus recibos de pago y facturas en formato PDF.
    > 💡 **Contexto Técnico:** Si se usa Stripe (integración default de OpenSaaS), usar `stripe.billingPortal` para generar un link al portal de cliente donde pueden bajar facturas, o usar el API de Stripe para obtener el PDF URL y mostrar botón de descarga directo.
*   **Historial Detallado de Consumo**:
    *   Crear vista de "Historial de Créditos" donde el usuario vea el desglose exacto por escaneo/acción.
    *   **Desglose de Costos**: Diferenciar costos base (Escaneo), costos extra (Custom Rules) y costos variables (Double Check) para total transparencia (ej. "Escaneo: 5, Custom Rules: 7, Double Check: 38 = Total 50").
    *   **Resumen en Reporte**: Incluir en el reporte del escaneo el número de Custom Rules aplicadas y el costo total en créditos de esa ejecución.
    > 💡 **Contexto Técnico:** Crear nueva entidad `CreditTransaction` en `schema.prisma`: `{ id, userId, amount, type (DEBIT/CREDIT), description, metadata (JSON), date }`. Cada vez que se consumen créditos, crear registro aquí. La vista de historial es simplemente un `getAll` de esta tabla filtrado por usuario.

---

## 🚀 Fase 2: Enhanced Experience (Post-Launch Inmediato)
*Mejoras significativas en la experiencia de usuario, reportes profesionales y facilidades de integración. Alta prioridad tras el lanzamiento.*

### 2.1 Reportes Profesionales [COMPLETADO]
*   **Sistema de Generación de Informes**: Definir estructura de datos y diseño para tres tipos de exportables:
    *   **Reporte Ejecutivo**: Resumen de alto nivel de un escaneo (KPIs, Score, Riesgo).
    *   **Reporte Técnico**: Detalle profundo de hallazgos de un escaneo.
    *   **Reporte Global de Proyecto**: Historial evolutivo y tendencias de seguridad de un proyecto completo.
    > 💡 **Contexto Técnico:** Usar librería server-side para PDF (`pdfkit` o `react-pdf` renderizado en servidor). Diseñar templates HTML/React para cada tipo. Exponer endpoints de descarga `/reports/:scanId/executive`, etc.
*   **Metadatos de Escaneo en pagina y reporte (Proof of Work)**:
    *   Mostrar explícitamente la **cantidad de reglas ejecutadas** en el escaneo.
    *   Mostrar la **cantidad total de archivos escaneados** para dar contexto al resultado.
    *   **Árbol de Archivos (Source Tree)**: Vista colapsable que muestre la estructura de carpetas y archivos analizados, permitiendo verificar qué se incluyó y qué se ignoró.
*   **Visualización de Hallazgos en pagina y reporte (Code Snippets)**:
    *   Mostrar fragmentos de código (5-10 líneas) alrededor de la vulnerabilidad detectada directamente en el reporte web.
    *   Incluir resaltado de sintaxis para facilitar la lectura rápida del fallo.

### 2.2 Onboarding y Autenticación Avanzada
*   **Social Login & 2FA**: Implementar inicio de sesión con Google y GitHub, y añadir Autenticación de Dos Factores (TOTP).
    > 💡 **Contexto Técnico:** Wasp facilita Social Login. Configurar `google` y `github` en `main.wasp` y añadir secretos en `.env`. Para 2FA, requerirá librería externa (`otpauth`) y extender el esquema de Usuario para guardar secreto TOTP y estado `2faEnabled`.
*   **Signup Stepper & Perfil Completo**:
    *   Rediseñar el registro para capturar obligatoriamente todos los datos del perfil: Nombre completo, Job Title, Teléfono.
    *   **Lógica de Organización**: Autocompletar campo "Organization" basándose en el dominio del email (Nombre personal para dominios públicos como Gmail/Outlook, Nombre de Empresa para dominios corporativos).
    *   Usar componente de pasos (Stepper) para capturar esta información de forma progresiva.
    > 💡 **Contexto Técnico:** Crear componente `SignupForm` customizado que reemplace al de Wasp default o se ejecute *después* del signup básico como paso de "Onboarding Obligatorio". Usar lógica JS simple para parsing de email: `email.split('@')[1]`. Mantener lista de dominios públicos comunes (`publicDomains.ts`) para la lógica de "Organization".

### 2.3 Integraciones de Flujo
*   **Conexión GitHub**: Permitir vincular cuenta de GitHub para listar y seleccionar repositorios privados/públicos directamente, eliminando la necesidad de subir ZIPs manuales.
    > 💡 **Contexto Técnico:** OAuth App en GitHub. Guardar `accessToken` de GitHub cifrado en DB. Usar API de GitHub para listar repos (`GET /user/repos`). Al escanear, el backend deberá descargar el repo usando el token en lugar de recibir un archivo upload.
*   **SecureTag GitHub Action (CI/CD)**:
    *   Desarrollar una GitHub Action oficial que permita a los usuarios (y al equipo interno) integrar escaneos de SecureTag en sus pipelines de CI/CD.
    *   Permitir configurar "Quality Gates" (fallar el pipeline si se detectan vulnerabilidades críticas).
    *   Habilitar escaneo de Infraestructura como Código (IaC) en estos pipelines.

### 2.4 UI Polish (Mejoras Visuales)
*   **Suscripciones Interactivas**: Implementar estilo "Lanyard" (tarjetas colgantes) para la selección de planes.
    > 💡 **Contexto Técnico:** Componente UI puramente visual (CSS/Tailwind/Framer Motion).
*   **Transiciones Globales**: Animaciones suaves de entrada/salida al navegar entre cualquier pantalla del aplicativo.
    > 💡 **Contexto Técnico:** Usar `AnimatePresence` de Framer Motion en el `App.tsx` o `MainLayout` envolviendo el `Outlet` del router.

### 2.5 Rebranding Integral (Ecosistema Mitológico)
*   **Renombramiento de Plataforma**: Cambiar referencias visuales de "SecureTag" a **"Aegis"** (La Plataforma de Defensa).
*   **Renombramiento de IA**: Cambiar referencias del motor de análisis a **"Argus"**.
    *   Análisis Estándar -> **"Argus Eye"**
    *   Double Check -> **"Argus Deep Mind"**
*   **Nuevos Nombres de Módulos**:
    *   WAF -> **"Phalanx"**
    *   OSINT -> **"Hermes"**
    *   Stress Testing -> **"Titan"**
    *   Red Team -> **"Ares"**
    *   Secrets Vault -> **"Hades"**
*   **Ajustes de UI**: Evaluar paleta de colores para alinear con la temática (Azul Profundo/Oro o Negro/Ciber-Neón).

### 2.6 Control de Recursos y Límites
*   **Validación de Cuotas (Tier-based)**:
    *   Implementar límites estrictos de tamaño de archivo (Upload Size) según el plan (Free/Pro/Enterprise).
    *   Implementar cuota de almacenamiento total por Tenant.
    *   Bloquear subidas si se excede el almacenamiento asignado, invitando al upgrade.
    > 💡 **Contexto Técnico:** Middleware de Express/Wasp para verificar `Content-Length` antes del upload. Verificar `user.storageUsed + fileSize <= user.planLimit` en DB antes de aceptar.

---

## 🌟 Fase 3: Growth & Engagement (Retención y Expansión)
*Funciones diseñadas para mantener al usuario activo e informado y expandir capacidades.*

### 3.1 Centro de Mando (Dashboard Overview)
*   **Contenido Dinámico**: Rediseñar el Home para mostrar noticias recientes de ciberseguridad y Podcasts generados por IA, además del resumen de proyectos.
    > 💡 **Contexto Técnico:** Integrar RSS Feeds de seguridad (Hacker News, CVE details). Backend job para fetchear y cachear noticias.

### 3.2 Notificaciones Inteligentes
*   **Sistema de Alertas**:
    *   Nuevas reglas de seguridad añadidas al sistema.
    *   **Alertas de Impacto**: Notificar si una nueva regla afecta el stack tecnológico del usuario.
    *   **Ofertas Flash**: Promociones de escaneo basadas en vulnerabilidades "trending" (ej. Log4j).
    > 💡 **Contexto Técnico:** Sistema de Notificaciones en DB + Email. Tabla `Notification`. Lógica de matcheo: Si nueva regla es "Java" y usuario tiene proyectos "Java", crear alerta.

### 3.3 Canales Alternativos
*   **Bot de Telegram**: Capacidad de lanzar escaneos y recibir alertas vía Telegram.
    > 💡 **Contexto Técnico:** Bot API de Telegram (Long Polling o Webhook). Mapear `telegramId` a `userId` en DB.

### 3.4 Nuevos Módulos de Seguridad (Portados)
*   **Módulo de Traffic Stress**: Implementación del módulo de pruebas de carga/estrés de tráfico (portado de proyecto existente).
    > 💡 **Contexto Técnico:** Integrar código existente como un nuevo servicio o contenedor. Exponer interfaz en Dashboard para configuración de tests (concurrencia, duración). Asegurar aislamiento para no afectar infraestructura propia.
*   **Análisis de Composición de Software (SCA)**: Implementación de escaneo de dependencias y librerías de terceros (portado de proyecto existente).
    > 💡 **Contexto Técnico:** Integrar módulo SCA. Verificar `package.json`, `requirements.txt`, etc., contra bases de datos de vulnerabilidades conocidas (CVEs).
*   **Detección de Secretos (Secrets)**: Implementación de búsqueda de credenciales hardcodeadas, tokens y claves API en el código (portado de proyecto existente).
    > 💡 **Contexto Técnico:** Integrar módulo de Secret Scanning (posiblemente basado en regex o entropía). Ejecutar en paralelo al análisis SAST.

---

## 🧠 Fase 4: Advanced AI (Diferenciadores Futuros)
*Funcionalidades de alto valor tecnológico.*

### 4.1 Chat Contextual
*   **Asistente de Proyecto**: Implementar un chat de IA que tenga cargado el contexto completo del código del proyecto, permitiendo al usuario hacer preguntas complejas sobre arquitectura, refactorización y seguridad específica de su codebase.
    > 💡 **Contexto Técnico:** RAG (Retrieval Augmented Generation). Indexar código escaneado en base de datos vectorial (Pinecone/pgvector). Usar LLM (OpenAI/Anthropic) para responder preguntas con contexto recuperado.

### 4.2 Operaciones de Seguridad Autónoma (SIEM & Claude Code)
*   **Análisis de Logs en Tiempo Real (SIEM Lite)**: Implementación de un repositorio centralizado de logs accesible para análisis automatizado.
*   **Integración con Claude Code Terminal**: Configuración para que el agente (Claude Code) tenga acceso de lectura al repositorio de logs para análisis proactivo en tiempo real.
*   **Automatización de Respuestas y Notificaciones**:
    *   Configurar reglas para que el agente tome acciones autónomas ante ciertos patrones de logs.
    *   **Human-in-the-Loop**: Sistema de autorización para acciones críticas (el agente solicita permiso antes de ejecutar).
    *   **Alertas Multicanal**: Notificaciones vía Telegram y Correo Electrónico sobre hallazgos o solicitudes de acción.
    > 💡 **Contexto Técnico:** Centralizar logs (ELK Stack, Loki o simplemente archivos estructurados en S3/MinIO). Exponer API o CLI para que Claude Code interactúe. Implementar bot de Telegram para el flujo de autorización (Bot envía "¿Bloquear IP X?", usuario responde "Sí").



## 🛠️ Tareas Internas & Mantenimiento (No visibles al Roadmap Público)
*   **Business Intelligence Discovery**:
    *   Realizar un análisis profundo del contenido de todas las tablas de base de datos (`securetag-db` y `opensaas-db`).
    *   Identificar nuevos indicadores (KPIs), tendencias de uso o anomalías que puedan sugerir nuevas funcionalidades o mejoras en el producto.




al implementar snipet fix, aplicar nosotros el cambios en el archivo, reescanerlo y ahi mismo en la vulnerabilidad mostrar si realmente si corrigio o no



Cambios para presentacion de inversion

### **3. Áreas de Oportunidad (Lo que falta o podría fortalecerse)**

#### **A. Para Inversionistas Locales (Enfoque en Ejecución)**
El inversionista local suele ser más conservador y se preocupa por el "riesgo de ejecución".

1.  **Falta el "Go-to-Market" (GTM) Explícito:**
    *   Sabemos el "Qué" (Producto) y el "Quién" (PyMEs/Gobierno), pero falta el **"Cómo"**.
    *   *Pregunta que te harán:* "¿Cómo vas a adquirir 1,000 PyMEs?" ¿Venta directa? ¿Marketing digital? ¿Canales de distribución?
    *   *Recomendación:* Un slide o sección pequeña que explique tu motor de ventas (ej. "Venta a través de Partners TI" o "Product-Led Growth").

2.  **Uso de Fondos (The Ask):**
    *   Actualmente el slide final dice "Seed Stage" y "Request Pitch Deck", pero es un poco genérico.
    *   *Recomendación:* Si ya tienes un número en mente (ej. $1.5M USD), suele ayudar poner un gráfico de pastel simple: "40% Ingeniería, 30% Ventas, 20% Ops". Eso les da seguridad de que no vas a quemar el dinero sin rumbo.

#### **B. Para Inversionistas Extranjeros (Enfoque en Escala y Foso)**
El inversionista extranjero (ej. Silicon Valley) busca el "Home Run" y se preocupa por la competencia global.

3.  **La "Moat" (Ventaja Competitiva Tecnológica):**
    *   La "Soberanía Digital" es un gran argumento de venta en México, pero a un inversionista de NY le preocupará: *"¿Qué impide que Snyk o GitHub copien esto?"*.
    *   *Recomendación:* Enfatizar más que tu ventaja no es solo ser mexicano, sino la **automatización para no expertos** (el motor Neuro-Simbólico). Dejar claro que tu tecnología hace accesible lo que hoy es complejo.

4.  **Matriz Competitiva (Nosotros vs. Ellos):**
    *   No hay una comparación visual directa.
    *   *Recomendación:* Un cuadro simple de ejes.
        *   Eje X: Complejidad (Baja vs. Alta).
        *   Eje Y: Soberanía/Compliance (Local vs. Global).
        *   Esto te posicionaría visualmente en un "Océano Azul" donde estás solo (Alta Soberanía + Baja Complejidad), lejos de los competidores caros y complejos.

5.  **Proyecciones Financieras (Traction Tease):**
    *   Muestras el SOM ($7.3M), lo cual es genial como "techo", pero no muestras la "curva" para llegar ahí.
    *   *Recomendación:* Un gráfico de barras simple proyectando los ingresos a 18-24 meses. A los inversionistas les gusta ver la forma de "palo de hockey", aunque sea una proyección.



    Hay que agregar una funcion para que manejar correctamente el envio de datos al usuario que deriven de una respuesta del API, esto cuando el response es muy largo, por ejemplo usar paginacion como lo hace google con los resultados, para no enviar toda la data de golpe. Esto será especialmente necesario conforme el producto crezca y se agreguen más funcionalidades, y los proyectos tengan mas lineas de codigo que se convierten en mas hallazgos que reportar.