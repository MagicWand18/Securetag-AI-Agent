# Herramientas Opensource para integrar
          
A continuación tienes una selección curada de herramientas CLI open source o gratuitas, organizadas por categoría. Todas se integran bien en pipelines para un proyecto de API y evitan depender de interfaces gráficas. Indico nombre, descripción, enlace y un análisis de integración con pros y contras.

**SCA (Dependencias y vulnerabilidades)**
- OSV-Scanner
  - Descripción: escáner de vulnerabilidades para dependencias usando la base OSV; soporta múltiples gestores de paquetes y proyectos monorepo.
  - Enlace: https://github.com/google/osv-scanner
  - Integración en tu API: 
    - Pros: rápido, buena cobertura para ecosistema moderno, salida JSON; fácil de usar en `pre-commit` y CI.
    - Contras: depende de metadatos de dependencias correctamente declarados; cobertura de ecosistemas menos populares puede variar.

- Trivy
  - Descripción: escáner unificado de vulnerabilidades, secretos y misconfiguraciones para repos, contenedores, sistemas de archivos y Kubernetes; genera SBOM.
  - Enlace: https://github.com/aquasecurity/trivy
  - Integración en tu API:
    - Pros: una sola herramienta cubre SCA, contenedores, IaC básico y secretos; salida SARIF/JSON; muy usada en CI.
    - Contras: base de datos grande; primeras ejecuciones descargan firmas y pueden ser lentas; más ruido si no restringes alcance.

- Anchore Grype
  - Descripción: escáner de vulnerabilidades para imágenes y sistemas de archivos; funciona muy bien con SBOMs de Syft.
  - Enlace: https://github.com/anchore/grype
  - Integración en tu API:
    - Pros: buen rendimiento sobre SBOM; salida estructurada; útil para pipelines de contenedores.
    - Contras: típico solapamiento con Trivy; requiere mantener bases actualizadas.

- OWASP Dependency-Check
  - Descripción: SCA tradicional que correlaciona dependencias con CVEs (NVD).
  - Enlace: https://github.com/jeremylong/DependencyCheck
  - Integración en tu API:
    - Pros: reputación consolidada; formatos de salida variados (HTML, JSON, XML, SARIF).
    - Contras: idealmente requiere una API key de NVD para actualizaciones rápidas; más pesado y lento frente a alternativas modernas.

**SAST (Código fuente)**
- Semgrep
  - Descripción: análisis estático rápido con reglas expresivas para muchos lenguajes; muy adecuado para APIs y patrones de seguridad.
  - Enlace: https://semgrep.dev
  - Integración en tu API:
    - Pros: excelente DX, reglas comunitarias amplias, rápida integración en CI; salida SARIF/JSON; fácil de ajustar al contexto del proyecto.
    - Contras: puede generar falsos positivos si no ajustas reglas; reglas avanzadas requieren mantenimiento.

- CodeQL (CLI)
  - Descripción: motor de consultas para análisis estático avanzado; permite reglas precisas con su lenguaje de consultas.
  - Enlace: https://codeql.github.com/docs/codeql-cli/
  - Integración en tu API:
    - Pros: muy potente para detectar flujos complejos; resultados de alta calidad; salida SARIF.
    - Contras: curva de aprendizaje alta; configurar consultas útiles requiere tiempo; ejecución más pesada.

- Bandit (Python)
  - Descripción: SAST para Python con foco en vulnerabilidades frecuentes.
  - Enlace: https://github.com/PyCQA/bandit
  - Integración en tu API:
    - Pros: simple y rápido; buena cobertura de “pitfalls” en Python.
    - Contras: solo Python; necesita complementarse con linters y otras herramientas.

- Gosec (Go)
  - Descripción: SAST para proyectos Go.
  - Enlace: https://github.com/securego/gosec
  - Integración en tu API:
    - Pros: detecciones comunes en Go; salida amigable para CI.
    - Contras: lenguaje específico; puede requerir tunning para evitar ruido.

- Brakeman (Ruby on Rails)
  - Descripción: SAST específico para Rails (si tu API usa este stack).
  - Enlace: https://github.com/presidentbeef/brakeman
  - Integración en tu API:
    - Pros: detecciones profundas en Rails; muy maduro.
    - Contras: específico de Rails; irrelevante si no usas ese framework.

- FindSecBugs (Java)
  - Descripción: plugin de análisis de seguridad para proyectos Java/Android sobre SpotBugs.
  - Enlace: https://github.com/find-sec-bugs/find-sec-bugs
  - Integración en tu API:
    - Pros: amplia cobertura de patrones Java; integración con pipelines Java existentes.
    - Contras: requiere ecosistema Java; ruido si no se ajustan filtros.

- Flawfinder (C/C++)
  - Descripción: SAST para C/C++ enfocándose en llamadas inseguras y patrones comunes.
  - Enlace: https://github.com/david-a-wheeler/flawfinder
  - Integración en tu API:
    - Pros: muy simple; útil si tu API incluye componentes nativos.
    - Contras: reglas generales; puede ser muy ruidoso en bases grandes.

**Secretos (credenciales, llaves)**
- Gitleaks
  - Descripción: detector de secretos en repositorios Git y archivos; soporte para patrones y reglas personalizadas.
  - Enlace: https://github.com/gitleaks/gitleaks
  - Integración en tu API:
    - Pros: rápido, buen equilibrio precisión/recall; ideal para `pre-commit` y CI.
    - Contras: falsos positivos posibles; exige mantener reglas y allowlists.

- TruffleHog
  - Descripción: busca secretos con regex y heurísticas de alta entropía; incluye validación para algunos proveedores.
  - Enlace: https://github.com/trufflesecurity/trufflehog
  - Integración en tu API:
    - Pros: detección potente; soporte para múltiples fuentes.
    - Contras: consumo de recursos mayor; afinar reglas es clave para evitar ruido.

- detect-secrets (Yelp)
  - Descripción: escáner de secretos con baseline para evitar redescubrir hallazgos ya gestionados.
  - Enlace: https://github.com/Yelp/detect-secrets
  - Integración en tu API:
    - Pros: flujo con baseline muy útil; integración sencilla en `pre-commit`.
    - Contras: requiere disciplina para mantener el baseline; cobertura menor frente a alternativas más agresivas.

**IaC, Kubernetes y Dockerfile**
- Checkov
  - Descripción: análisis de IaC (Terraform, CloudFormation, Kubernetes, Helm, Dockerfile, etc.) con políticas integradas; también SCA básico.
  - Enlace: https://github.com/bridgecrewio/checkov
  - Integración en tu API:
    - Pros: amplio soporte de IaC; salida SARIF/JSON; políticas listas; buen rendimiento.
    - Contras: muchas políticas pueden generar ruido; requiere parametrizar `skip`/`enforcement` para flujo estable.

- tfsec
  - Descripción: análisis de seguridad para Terraform.
  - Enlace: https://github.com/aquasecurity/tfsec
  - Integración en tu API:
    - Pros: enfoque específico y eficiente sobre Terraform; configuración sencilla.
    - Contras: menos generalista que Checkov; complementa pero no sustituye scanners de Kubernetes/Dockerfile.

- Terrascan
  - Descripción: análisis IaC multi-proveedor para detectar misconfiguraciones y cumplimiento.
  - Enlace: https://github.com/tenable/terrascan
  - Integración en tu API:
    - Pros: buen alcance IaC; salida integrada en CI.
    - Contras: solapamiento con Checkov; curvar políticas y ajustar severidades requiere trabajo.

- KICS
  - Descripción: escáner IaC open source con amplia librería de checks (Terraform, Kubernetes, etc.).
  - Enlace: https://github.com/Checkmarx/kics
  - Integración en tu API:
    - Pros: reglas extensas y activas; buen rendimiento.
    - Contras: necesitas elegir entre varias herramientas IaC (evitar duplicidad de reportes).

- Kubescape
  - Descripción: seguridad para Kubernetes (configuración, posture y cumplimiento).
  - Enlace: https://github.com/kubescape/kubescape
  - Integración en tu API:
    - Pros: útil si despliegas tu API en K8s; checks de standard (NSA, MITRE, etc.).
    - Contras: añade complejidad si no usas Kubernetes; curva de configuración.

- Hadolint
  - Descripción: linter de Dockerfile con reglas de buenas prácticas y seguridad.
  - Enlace: https://github.com/hadolint/hadolint
  - Integración en tu API:
    - Pros: muy ligero y efectivo; ideal para mejorar imágenes y reducir superficie de ataque.
    - Contras: solo Dockerfile; necesita combinarse con escáneres de imagen.

**SBOM y cadena de suministro**
- Anchore Syft
  - Descripción: generación de SBOM (CycloneDX/SPDX) para imágenes y sistemas de archivos.
  - Enlace: https://github.com/anchore/syft
  - Integración en tu API:
    - Pros: SBOM estándar para auditoría y cumplimiento; base para escaneos (Grype/Trivy).
    - Contras: paso adicional en CI; archivos SBOM requieren almacenamiento y gestión.

- Cosign
  - Descripción: firma y verificación de artefactos (imágenes, blobs) con firmas criptográficas y fulcio/rekor.
  - Enlace: https://github.com/sigstore/cosign
  - Integración en tu API:
    - Pros: refuerza cadena de suministro; verifica integridad antes de despliegues.
    - Contras: requiere configurar flujos de firma y claves; añade complejidad operativa.

- SLSA Verifier
  - Descripción: verifica el cumplimiento de niveles SLSA en artefactos.
  - Enlace: https://github.com/slsa-framework/slsa-verifier
  - Integración en tu API:
    - Pros: garantiza trazabilidad y procedencia de builds; útil para auditorías.
    - Contras: requiere pipelines con generate/attestation; mejor para organizaciones con controles estrictos.

**Políticas como código**
- Conftest (OPA)
  - Descripción: evalúa archivos (YAML/JSON/HCL) contra políticas OPA para imponer reglas (seguridad y cumplimiento).
  - Enlace: https://github.com/open-policy-agent/conftest
  - Integración en tu API:
    - Pros: muy flexible; excelente para reglas organizacionales (nombres, etiquetas, límites).
    - Contras: necesitas escribir y mantener políticas; curva de adopción si no usas OPA.

**Linters y utilidades (buenas prácticas)**
- ShellCheck
  - Descripción: linter para scripts shell con recomendaciones de seguridad y robustez.
  - Enlace: https://github.com/koalaman/shellcheck
  - Integración en tu API:
    - Pros: evita errores en scripts CI y tooling; rápido y útil.
    - Contras: específico de shell; no cubre otros lenguajes.

- pre-commit
  - Descripción: framework de hooks locales para ejecutar herramientas antes de cada commit.
  - Enlace: https://pre-commit.com
  - Integración en tu API:
    - Pros: facilita estandarizar y hacer cumplir chequeos (Semgrep, Gitleaks, Trivy, linters); mejora calidad continua.
    - Contras: requiere consenso del equipo y mantenimiento de la configuración.

- ScanCode Toolkit
  - Descripción: análisis de licencias, copyrights y componentes en código/artefactos.
  - Enlace: https://github.com/nexB/scancode-toolkit
  - Integración en tu API:
    - Pros: cumplimiento de licencias; útil para auditoría y distribución.
    - Contras: ejecución pesada; aporta poco si no tienes requisitos de compliance.

**Recomendación práctica mínima para tu API**
- SCA: `OSV-Scanner` para dependencias + `Trivy` para repo/imagen.
- SAST: `Semgrep` como base; complementa con `Bandit`/`Gosec`/`FindSecBugs` según lenguaje.
- Secretos: `Gitleaks` + `detect-secrets` (baseline).
- IaC/Contenedores: `Checkov` + `Hadolint`; añade `tfsec` si Terraform es intensivo.
- SBOM y Supply Chain: `Syft` para SBOM + `Cosign` para firmas si distribuyes imágenes.

Todas estas herramientas se invocan vía CLI, producen salidas estructuradas (`JSON`, `SARIF`, `JUnitXML`) y encajan bien en pipelines de CI. Para evitar ruido, te sugiero:
- Configurar severidades y “soft-fail” por etapa (p. ej., advertencias en PR, fallo en main).
- Mantener listas de exclusión y baselines para secretos y SAST.
- Generar SBOM y almacenarlo con artefactos del build.
- Estandarizar la salida en `SARIF` para agregar resultados en tu plataforma de reportes.
