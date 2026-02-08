# Documento de Evidencia - Worker

**Agente**: Worker
**Iteración**: 12.3 (Custom Rules Engine)
**Fecha**: 2025-12-18
**Estatus**: Completado

## 📋 Reporte Técnico
Se ha implementado exitosamente el motor de generación de reglas personalizadas ("Custom Rules Engine") en el Worker. Esta funcionalidad permite analizar el stack tecnológico de un proyecto y generar reglas Semgrep específicas "on-demand" utilizando Inteligencia Artificial (OpenAI/Anthropic), validadas automáticamente mediante un ciclo de retroalimentación (Feedback Loop).

*   **Archivos modificados/creados**:
    *   `src/worker/services/CustomRuleGenerator.ts`: Nuevo servicio core que orquesta el flujo Discovery -> Code Gen -> Rule Gen -> Validation. Implementa prompts en español alineados con la investigación previa.
    *   `src/worker/ContextAnalyzer.ts`: Mejorado para extraer dependencias detalladas de `package.json`, `requirements.txt`, etc., vitales para el discovery de vulnerabilidades.
    *   `src/worker/TaskExecutor.ts`: Integración del motor en el flujo de ejecución de tareas. Detecta el flag `custom_rules`, ejecuta el generador e inyecta las reglas resultantes en el escaneo de Semgrep.
    *   `src/worker/services/AIProvider.ts` (y implementaciones): Refactorizado para soportar generación de contenido genérico (no solo análisis de hallazgos), permitiendo flexibilidad para generar código y YAML.
    *   `src/worker/WorkerClient.ts`: Nuevo método `saveCustomRule` para persistir las reglas exitosas en el Server.

*   **Lógica implementada**:
    1.  **Stack Analysis Profundo**: Identificación de frameworks y librerías específicas.
    2.  **Generación en 3 Pasos**:
        *   *Discovery*: IA propone vulnerabilidades relevantes para el stack.
        *   *Code Gen*: IA genera par de código (Vulnerable vs Seguro).
        *   *Rule Gen*: IA genera regla Semgrep YAML.
    3.  **Auto-Validación**: Ejecución real de Semgrep contra los snippets generados. Si falla, se reintenta con feedback del error.
    4.  **Monetización**: Integración con `CreditsManager` para cobro por intento (Processing Fee) y por éxito (Success Fee).
    5.  **Selección Dinámica de Modelo**: Soporte para parámetro `custom_rule_model` (standard, pro, max) mapeando a modelos específicos de OpenAI (5 mini, 5.2, 5.2 pro) y Anthropic (haiku 4.5, sonnet 4.5, opus 4.5).
    6.  **Validación de Tier**: Implementación de restricciones de acceso basadas en el plan del tenant (Free excluido, Max solo Premium).
    7.  **Contexto de Reglas Existentes**: Se inyectan pistas de reglas ya instaladas en el prompt de Discovery para evitar duplicidad.
    8.  **Robustez AI**: Mejoras en el parsing de respuestas JSON de la IA (regex fallback, manejo de arrays/objetos).

*   **Pruebas realizadas**:
    *   Script de integración `scripts/test_custom_rules.sh` ejecutado exitosamente con selección de modelo.
    *   Verificación de restricciones de Tier (Free y Premium/Max).
    *   Verificación de flujo completo: Upload -> Discovery -> Generation -> Validation -> Scan -> Result.
    *   Confirmación de generación de reglas únicas y manejo de errores de validación.

## 🚧 Cambios Implementados
*   [x] Mejorar ContextAnalyzer (Dependencias detalladas)
*   [x] Crear CustomRuleGenerator (Lógica Core)
*   [x] Refactorizar AI Providers (Generación genérica)
*   [x] Integrar en TaskExecutor (Flujo principal)
*   [x] Conectar persistencia con Server (/internal/rules)
*   [x] Integrar Monetización (Créditos)
*   [x] Implementar Selección Dinámica de Modelo y Validación de Tier
*   [x] Implementar Contexto de Reglas Existentes y Robustez AI

## 💬 Revisiones y comentarios del supervisor
La implementación cumple estrictamente con los requisitos de la Tarea 12.3 y el plan de desarrollo. El uso de prompts en español y la alineación con los scripts de investigación previos garantiza consistencia en la calidad de las reglas generadas.
