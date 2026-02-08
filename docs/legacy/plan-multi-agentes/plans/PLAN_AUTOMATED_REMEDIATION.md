# Plan de Implementación: Automated Remediation (Snippet Fix)

**Fecha**: 2025-12-23  
**Agente**: Worker  
**Objetivo**: Implementar la capacidad de generar parches de código automáticos (`snippet_fix`) dentro del análisis de vulnerabilidades realizado por el LLM.

---

## 📅 Estrategia por Fases

Implementaremos esta funcionalidad en 4 fases secuenciales para garantizar estabilidad y calidad. No se avanzará a la siguiente fase hasta que la anterior esté verificada.

### 🔹 Fase 1: Definición de Contratos y Tipos
**Objetivo**: Preparar las estructuras de datos para soportar el nuevo campo sin romper la compatibilidad existente.

*   **Cambios**:
    *   Modificar `AnalysisResult` en `src/worker/LLMClient.ts` para incluir el campo opcional `snippet_fix`.
    *   Definir la interfaz `SnippetFix` con `line` (number) y `code` (string).
*   **Verificación**:
    *   **Compilación**: Ejecutar `tsc` (o build script) para asegurar que no hay errores de tipos.
    *   **Prueba Estática**: Verificar que el código existente que usa `AnalysisResult` sigue funcionando (al ser un campo opcional, no debería haber regresiones).

### 🔹 Fase 2: Prompt Engineering y Simulación
**Objetivo**: Diseñar y validar el prompt que se enviará al LLM para asegurar que entiende cómo generar el parche.

*   **Cambios**:
    *   Actualizar `buildPrompt` o los métodos `analyzeWith...` en `LLMClient.ts`.
    *   Incluir instrucciones explícitas sobre el formato JSON del `snippet_fix`.
    *   Aportar ejemplos de one-shot learning en el prompt del sistema si es necesario (sin sobrecargar el contexto).
*   **Pruebas Unitarias (Mocking)**:
    *   Crear un script de prueba `test/unit/prompt_generation.test.ts`.
    *   Validar que el prompt generado contiene las nuevas instrucciones JSON schema.
    *   **No** se llama al LLM real todavía, solo se valida la construcción del string.

### 🔹 Fase 3: Lógica de Parseo y Normalización
**Objetivo**: Implementar la lógica capaz de extraer el `snippet_fix` de la respuesta del LLM, manejando errores de formato.

*   **Cambios**:
    *   Actualizar `parseResponse` y `normalize` en `LLMClient.ts`.
    *   Asegurar que si el LLM devuelve un JSON malformado o sin el fix, el sistema no falle (graceful degradation).
*   **Pruebas Unitarias**:
    *   Crear `test/unit/response_parsing.test.ts`.
    *   **Caso 1**: Respuesta perfecta con `snippet_fix`.
    *   **Caso 2**: Respuesta válida pero SIN `snippet_fix` (backward compatibility).
    *   **Caso 3**: Respuesta con `snippet_fix` malformado (ej. string en vez de objeto).
    *   **Caso 4**: Respuesta "alucinada" (campos extra).

### 🔹 Fase 4: Integración y Validación E2E Local
**Objetivo**: Conectar todo el flujo y verificar que un "hallazgo" termina con un "fix" en el JSON final.

*   **Cambios**:
    *   Integración final en el flujo `analyzeFinding`.
*   **Pruebas de Integración (Local)**:
    *   Crear `test/integration/worker_flow.test.ts`.
    *   Simular una respuesta completa de RunPod (usando un mock de `axios` o un servidor local dummy).
    *   Ejecutar el Worker contra este mock y verificar que el output en consola o DB (si aplica) contiene la estructura deseada.
    *   *Nota*: No se enviará nada a DigitalOcean ni se consumirán créditos reales de RunPod para estas pruebas de desarrollo inicial.

---

## 🛡️ Criterios de Éxito
1.  El sistema compila sin errores TypeScript.
2.  Las pruebas unitarias de parseo pasan el 100% de los casos (incluyendo bordes).
3.  La estructura final del JSON coincide exactamente con el requerimiento del usuario:
    ```json
    "snippet_fix": {
        "line": 45,
        "code": "<template>..."
    }
    ```
4.  No se introducen regresiones en la detección de vulnerabilidades (el `triage` y `severity` siguen funcionando).

---

## 🔙 Plan de Rollback
Dado que trabajamos en local con Git:
1.  Si una fase falla, se descartan los cambios (`git checkout .` o `git reset`).
2.  El código actual es funcional; el nuevo campo es puramente aditivo y opcional, lo que minimiza el riesgo de rotura crítica.
