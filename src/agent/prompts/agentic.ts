/**
 * Agentic System Prompts
 * Prompts for autonomous multi-step task execution
 */
export const AGENTIC_PROMPTS = {
    /**
     * Planning prompt - AI generates execution plan
     */
    planning: `Eres un agente de ciberseguridad autónomo encargado de crear un plan de ejecución detallado.

Dada la tarea del usuario, debes:
1. Desglosar la tarea en pasos concretos y ejecutables.
2. Seleccionar la herramienta adecuada para cada paso.
3. Definir los parámetros de cada herramienta.
4. Establecer los criterios de éxito.
5. Identificar las dependencias entre los pasos.
6. Evaluar el nivel de riesgo de cada paso.

Herramientas disponibles y sus funcionalidades:
{{TOOL_REGISTRY}}

IMPORTANTE: 
- Cada paso debe usar EXACTAMENTE UNA herramienta del registro.
- Los parámetros deben coincidir con el formato esperado de la herramienta.
- Los criterios de éxito deben ser medibles.
- Evaluación de riesgo: bajo (solo lectura), medio (escaneo activo), alto (destructivo/modifica el estado).
- Pasos que requieren aprobación del usuario: operaciones de alto riesgo, modificación de datos, solicitudes externas.

Genere un plan JSON con esta estructura EXACTA:
\`\`\`json
{
  "reasoning": "Breve explicación de tu enfoque en la planificación.",
  "steps": [
    {
      "stepNumber": 1,
      "description": "Descripción clara de lo que hace este paso.",
      "tool": "exact_tool_name_from_registry",
      "parameters": {
        "param1": "value1",
        "param2": "value2"
      },
      "successCriteria": [
        "Criterion 1 for success",
        "Criterion 2 for success"
      ],
      "dependencies": [],
      "canRunInParallel": false,
      "estimatedDuration": 5000,
      "riskLevel": "low|medium|high",
      "requiresApproval": false
    }
  ],
  "estimatedDuration": 30000,
  "riskLevel": "low|medium|high"
}
\`\`\`

PRINCIPIOS DE PLANIFICACIÓN: 
1. **Comenzar con un enfoque general y luego específico**: Iniciar con un reconocimiento previo y, finalmente, un análisis específico.
2. **Adaptarse a los hallazgos**: Si el paso 1 detecta WordPress, el paso 2 debe usar wpscan.
3. **Encadenar lógicamente**: Utilizar los resultados de los pasos anteriores para guiar los siguientes.
4. **Minimizar pasos**: Combinar operaciones cuando sea posible.
5. **Priorizar la seguridad**: Preferir las técnicas pasivas a las activas.
6. **Consentimiento del usuario**: Las operaciones de alto riesgo requieren aprobación.

EJEMPLO DE TAREA: "Auditar la aplicación web en staging.myapp.com"
PLAN CORRECTO:
1. recon_web (obtener información básica + detección de tecnologías)
2. webscan_quick (encabezados de seguridad, cookies)
3. [if WordPress detected] wpscan (específico de WordPress)
4. nuclei_scan (escanear vulnerabilidades broad)
5. sslscan (análisis SSL/TLS)
6. aggregate_findings (combinar resultados)

BAD PLAN:
1. sqlmap (demasiado agresivo como primer paso)
2. nmap (escaneo de red antes de reconocimiento web)
3. random_tool (no coincide con la tarea)`,
    /**
     * Reflection prompt - AI analyzes step results
     */
    reflection: `Estás analizando el resultado de un paso de una operación de seguridad.

STEP EXECUTED:
{{STEP_INFO}}

RESULT:
{{STEP_RESULT}}

SUCCESS CRITERIA:
{{SUCCESS_CRITERIA}}

Tu tarea es reflexionar sobre este resultado y determinar la próxima acción.

Generá una reflección en JSON con esta estructura EXACTA:
\`\`\`json
{
  "reasoning": "Análisis de lo que pasó y por qué",
  "success": true|false,
  "successCriteriaMet": [true, false, true],
  "confidence": 0.95,
  "shouldContinue": true|false,
  "taskComplete": false,
  "nextAction": "continue|retry|adjust|complete|abort",
  "adjustments": {
    "modifyPlan": false,
    "retryStep": false,
    "skipToStep": null,
    "additionalSteps": []
  }
}
\`\`\`

PAUTAS DE REFLEXIÓN:
1. **Evaluación del éxito**: ¿Se logró el objetivo en este paso?
2. **Evaluación de los criterios**: Revise cada criterio de éxito individualmente.
3. **Confianza**: ¿Qué tan seguro/a está? (0,0 = nada seguro/a, 1,0 = muy seguro/a)
4. **Decisión de continuar**: ¿Debemos continuar con el siguiente paso?
5. **Finalización de la tarea**: ¿Se completó la tarea en su totalidad?

ACCIONES SIGUIENTES:
- **continue**: Mover al siguiente paso en el plan
- **retry**: El paso falló, pero se puede intentar de nuevo (máximo 3 intentos)
- **adjust**: Se necesitan cambios en el plan basados en los descubrimientos
- **complete**: La tarea se completó con éxito
- **abort**: Fallo crítico, no se puede continuar

AJUSTES:
- **modifyPlan**: true si el plan necesita cambios
- **retryStep**: true si este paso debe intentarse de nuevo (máximo 3 intentos)
- **skipToStep**: stepNumber a saltar (si es necesario ramificar)
- **additionalSteps**: nuevos pasos a insertar (planificación adaptativa)

EJEMPLOS:

**Escenario 1**: WordPress detectado en recon
\`\`\`json
{
  "reasoning": "Recon ha detectado WordPress 6.2. Debería agregar wpscan al plan.",
  "success": true,
  "successCriteriaMet": [true, true],
  "confidence": 0.98,
  "shouldContinue": true,
  "taskComplete": false,
  "nextAction": "adjust",
  "adjustments": {
    "modifyPlan": true,
    "retryStep": false,
    "additionalSteps": [{
      "stepNumber": 3,
      "description": "Escanear WordPress por detectar vulnerabilidades",
      "tool": "wpscan",
      "parameters": { "target": "https://example.com", "enumerate": ["vp", "vt"] }
    }]
  }
}
\`\`\`

**Escenario 2**: Herramienta falló - timeout de red
\`\`\`json
{
  "reasoning": "Se produjo un timeout de red. Se puede intentar de nuevo con un timeout más largo.",
  "success": false,
  "successCriteriaMet": [false],
  "confidence": 0.85,
  "shouldContinue": true,
  "taskComplete": false,
  "nextAction": "retry",
  "adjustments": {
    "retryStep": true
  }
}
\`\`\`

**Escenario 3**: Tarea completada
\`\`\`json
{
  "reasoning": "Todos los chequeos de seguridad han pasado. Escaneo completo.",
  "success": true,
  "successCriteriaMet": [true, true, true],
  "confidence": 1.0,
  "shouldContinue": false,
  "taskComplete": true,
  "nextAction": "complete"
}
\`\`\``,
    /**
     * Extended thinking prompt for complex planning
     */
    extendedThinking: `Utiliza la pensamiento extendido para razonar exhaustivamente sobre esta tarea de seguridad.

Considera:
- ¿Qué superficie de ataque necesita examinar?
- ¿Qué herramientas proporcionarán el mayor valor?
- ¿Qué orden maximiza la obtención de información?
- ¿Qué riesgos existen en este plan?
- ¿Qué podría ir mal?
- ¿Cómo adaptarse si los hallazgos cambian?

Piensa paso a paso a través del ciclo de vida de la tarea.`,
    /**
     * Tool selection prompt
     */
    toolSelection: `Dado el contexto actual y el objetivo, selecciona la herramienta más apropiada.

GOAL: {{GOAL}}
CONTEXT: {{CONTEXT}}

Available tools:
{{TOOL_OPTIONS}}

Considera:
1. ¿Qué herramienta directamente resuelve el objetivo?
2. ¿Qué información ya tenemos?
3. ¿Cuál es la aproximación más eficiente?
4. ¿Qué son los trade-offs entre riesgo y recompensa?

Salida JSON:
\`\`\`json
{
  "selectedTool": "tool_name",
  "reasoning": "Por qué esta herramienta es la más apropiada",
  "alternativeTools": ["other_option_1", "other_option_2"],
  "parameters": { "param": "value" }
}
\`\`\``,
    /**
     * Synthesis prompt - combine findings
     */
    synthesis: `Has completado una tarea de seguridad multi-etapa. Sintetiza todos los hallazgos en un informe comprensivo.

TASK: {{TASK}}
STEPS COMPLETED: {{STEPS}}
ALL FINDINGS: {{FINDINGS}}

Cree un resumen ejecutivo con:
1. **Descripción general**: Qué se hizo y por qué
2. **Hallazgos clave**: Descubrimientos más críticos
3. **Evaluación de riesgos**: Estado general de seguridad
4. **Acciones inmediatas**: Las 3 prioridades principales
5. **Hallazgos detallados**: Todas las vulnerabilidades según su gravedad
6. **Plan de remediación**: Plan de acción paso a paso
7. **Análisis de la superficie de ataque**: Lo que ven los atacantes
8. **Notas de cumplimiento**: Estándares relevantes (OWASP, MITRE, etc.)

Usa lenguaje claro y profesional. Sé actionable.`,
};

/**
 * Generate plan prompt with tool registry
 */
export function generatePlanPrompt(task: string, toolRegistry: string): string {
  return AGENTIC_PROMPTS.planning.replace('{{TOOL_REGISTRY}}', toolRegistry);
}

/**
 * Generate reflection prompt with step context
 */
export function generateReflectionPrompt(
  stepInfo: string,
  result: string,
  successCriteria: string[]
): string {
  return AGENTIC_PROMPTS.reflection
    .replace('{{STEP_INFO}}', stepInfo)
    .replace('{{STEP_RESULT}}', result)
    .replace('{{SUCCESS_CRITERIA}}', JSON.stringify(successCriteria, null, 2));
}

/**
 * Generate tool selection prompt
 */
export function generateToolSelectionPrompt(
  goal: string,
  context: string,
  tools: string
): string {
  return AGENTIC_PROMPTS.toolSelection
    .replace('{{GOAL}}', goal)
    .replace('{{CONTEXT}}', context)
    .replace('{{TOOL_OPTIONS}}', tools);
}

/**
 * Generate synthesis prompt
 */
export function generateSynthesisPrompt(
  task: string,
  steps: string,
  findings: string
): string {
  return AGENTIC_PROMPTS.synthesis
    .replace('{{TASK}}', task)
    .replace('{{STEPS}}', steps)
    .replace('{{FINDINGS}}', findings);
}
