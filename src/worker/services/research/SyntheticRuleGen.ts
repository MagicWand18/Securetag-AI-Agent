import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import OpenAI from 'openai';
import { EnrichedCVE } from './ThreatEnricher';

import { fileURLToPath } from 'url';

// Configuración de Directorios (Ajustar según estructura del Worker)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '../../../../'); 
const RULES_DIR = path.join(BASE_DIR, 'data/rules/synthetic');
const TEMP_DIR = path.join(BASE_DIR, 'scripts/research/temp');

// Asegurar existencia de directorios
(async () => {
  await fs.mkdir(RULES_DIR, { recursive: true });
  await fs.mkdir(TEMP_DIR, { recursive: true });
})();

export class SyntheticRuleGen {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-5.1') { // Ajustar modelo según disponibilidad real
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * Analiza viabilidad SAST (Prompt "Architect")
   */
  private async analyzeSastFeasibility(cveId: string, description: string, aiContext: string): Promise<{ feasible: boolean; reason: string; suggested_approach: string }> {
    const prompt = `
    Actúa como un arquitecto de seguridad experto en análisis estático (SAST).
    
    Vulnerabilidad: ${cveId}
    Descripción: ${description}
    Contexto Técnico: ${aiContext}
    
    Pregunta: ¿Es posible detectar esta vulnerabilidad de forma confiable analizando ÚNICAMENTE el código fuente de una aplicación (JavaScript/TypeScript/Node.js) buscando patrones de uso inseguro de APIs o lógica defectuosa?
    
    Criterios de EXCLUSIÓN (Responde NO si aplica alguno):
    - Es un bug de memoria en un componente compilado (C/C++) como navegadores, kernels, drivers (ej: Buffer Overflow en Chrome).
    - Es un problema de configuración de infraestructura o red.
    - Es una vulnerabilidad en una librería de terceros que se soluciona actualizando (SCA), no cambiando el código propio.
    - Requiere ejecución dinámica para detectarse.
    
    Responde con un JSON puro:
    {
        "feasible": true/false,
        "reason": "Explicación breve de por qué sí o por qué no",
        "suggested_approach": "SAST" | "SCA" | "DAST" | "Manual"
    }
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1
      });
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error: any) {
      console.error(`⚠️ Error en análisis de viabilidad para ${cveId}: ${error.message}`);
      return { feasible: false, reason: `Error API: ${error.message}`, suggested_approach: "Manual" };
    }
  }

  /**
   * Genera código vulnerable y seguro (Prompt "Developer")
   */
  private async generateCode(cveId: string, description: string): Promise<{ vulnerable_code: string; safe_code: string }> {
    const prompt = `
    Actúa como un experto en seguridad de aplicaciones.
    Objetivo: Generar ejemplos de código JavaScript/Node.js para probar reglas de detección SAST.
    
    Vulnerabilidad: ${cveId} - ${description}
    
    Genera un JSON con dos campos:
    1. 'vulnerable_code': Un snippet de código Node.js realista que contenga esta vulnerabilidad. Debe ser simple pero funcional.
    2. 'safe_code': Un snippet similar que realice la misma función pero de forma SEGURA (corregido).
    
    Formato de respuesta esperado (JSON puro):
    {
        "vulnerable_code": "...",
        "safe_code": "..."
    }
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2
      });
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error: any) {
      console.error(`❌ Error generando código para ${cveId}: ${error.message}`);
      return { vulnerable_code: "", safe_code: "" };
    }
  }

  /**
   * Genera regla Semgrep (Prompt "Security Engineer")
   */
  private async generateRule(cveId: string, description: string, vulnerableCode: string, feedback: string = "", aiContext: string = ""): Promise<string> {
    let feedbackPrompt = "";
    if (feedback) {
      feedbackPrompt = `
        ❌ INTENTO ANTERIOR FALLIDO:
        ${feedback}
        
        Por favor, ajusta la regla para corregir este error.
        - Si falló en detectar el código vulnerable: Haz el patrón más genérico o revisa la sintaxis.
        - Si detectó el código seguro (falso positivo): Haz el patrón más específico o añade exclusiones (pattern-not).
      `;
    }

    const prompt = `
    Actúa como un experto en ingeniería de detección de Semgrep.
    Objetivo: Crear una regla Semgrep para detectar ${cveId}.
    
    CONTEXTO DE INTELIGENCIA DE AMENAZAS (CRÍTICO):
    ${aiContext}
    
    Código Vulnerable de referencia:
    \`\`\`javascript
    ${vulnerableCode}
    \`\`\`
    
    ${feedbackPrompt}
    
    Requisitos de la regla:
    1. ID de la regla: \`synthetic-${cveId.toLowerCase().replace(/-/g, '')}\`
    2. Lenguaje: javascript, typescript
    3. Mensaje: Debe explicar por qué es peligroso citando el CVE y el contexto de explotación.
    4. Severidad: ERROR
    5. Patrón: Debe hacer match con el código vulnerable proporcionado, pero ser lo suficientemente genérico para variantes similares.
    6. Metadata: DEBE incluir los siguientes campos OBLIGATORIOS:
       - cwe: "CWE-XXX: Nombre del CWE" (Identifica el CWE más apropiado)
       - owasp: "AXX:2021 - Nombre de Categoría OWASP" (Identifica la categoría OWASP Top 10)
       - category: "security"
       - technology:
         - javascript
         - typescript
         - nodejs
       - likelihood: "HIGH" | "MEDIUM" | "LOW"
       - impact: "HIGH" | "MEDIUM" | "LOW"
       - confidence: "HIGH" | "MEDIUM" | "LOW"
       - references:
         - "https://nvd.nist.gov/vuln/detail/${cveId}"
    
    RESTRICCIONES TÉCNICAS (MUY IMPORTANTE PARA EVITAR WARNINGS):
    - NO uses 'pattern-sources' ni 'pattern-sinks' a menos que especifiques 'mode: taint'. Por defecto usa 'mode: search' (implícito) y usa 'patterns' o 'pattern-either'.
    - 'metavariables' DEBE estar dentro de un bloque 'pattern-inside' o similar, nunca al nivel raíz de 'patterns'.
    - NO uses campos obsoletos como 'message-format'.
    - Si usas 'fix:', asegúrate de que el código de reemplazo sea sintácticamente válido y completo. Si no puedes garantizarlo, NO incluyas 'fix'.
    
    Devuelve SOLO el contenido YAML de la regla.
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      });
      let content = response.choices[0].message.content || "";
      
      // Limpieza básica de Markdown
      if (content.startsWith('```yaml')) {
        content = content.replace('```yaml', '').replace(/```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace('```', '').replace(/```$/, '');
      }
      return content.trim();
    } catch (error: any) {
      console.error(`❌ Error generando regla para ${cveId}: ${error.message}`);
      return "";
    }
  }

  /**
   * Valida la regla ejecutando Semgrep
   */
  private async validateRule(rulePath: string, vulnPath: string, safePath: string): Promise<{ valid: boolean; reason: string }> {
    try {
      // 1. Test Vuln (Debe detectar)
      const vulnResult = await this.runSemgrep(rulePath, vulnPath);
      if (!vulnResult.success) return { valid: false, reason: `Semgrep Error (Vuln): ${vulnResult.error}` };
      
      const vulnData = JSON.parse(vulnResult.stdout);
      if (!vulnData.results || vulnData.results.length === 0) {
        return { valid: false, reason: "La regla no detectó el código vulnerable (False Negative)." };
      }

      // 2. Test Safe (No debe detectar)
      const safeResult = await this.runSemgrep(rulePath, safePath);
      if (!safeResult.success) return { valid: false, reason: `Semgrep Error (Safe): ${safeResult.error}` };

      const safeData = JSON.parse(safeResult.stdout);
      if (safeData.results && safeData.results.length > 0) {
        return { valid: false, reason: "La regla detectó el código seguro (False Positive)." };
      }

      return { valid: true, reason: "" };
    } catch (e: any) {
      return { valid: false, reason: `Excepción validación: ${e.message}` };
    }
  }

  private runSemgrep(configPath: string, targetPath: string): Promise<{ success: boolean; stdout: string; error: string }> {
    return new Promise((resolve) => {
      const proc = spawn('semgrep', ['--config', configPath, targetPath, '--json']);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => stdout += data);
      proc.stderr.on('data', (data) => stderr += data);

      proc.on('close', (code) => {
        resolve({
          success: code === 0 || code === 1, // Semgrep devuelve 1 si encuentra issues (que es lo esperado a veces) pero aquí validamos el output JSON
          stdout,
          error: stderr
        });
      });
    });
  }

  /**
   * Ejecuta el ciclo de generación para una lista de CVEs
   */
  public async run(targets: EnrichedCVE[]): Promise<void> {
    // 1. Cargar logs de estado para filtrar
    const failedLogPath = path.join(TEMP_DIR, 'failed_cves.json');
    const skippedLogPath = path.join(TEMP_DIR, 'skipped_cves.json');
    
    let failedLog: any[] = [];
    let skippedLog: any[] = [];
    
    try {
      const data = await fs.readFile(failedLogPath, 'utf-8');
      failedLog = JSON.parse(data);
    } catch (e) { /* Ignore */ }
    
    try {
      const data = await fs.readFile(skippedLogPath, 'utf-8');
      skippedLog = JSON.parse(data);
    } catch (e) { /* Ignore */ }
    
    const skippedIds = new Set(skippedLog.map((s: any) => s.id));

    // 2. Pre-filtrar objetivos pendientes
    console.log(`🔍 Filtrando objetivos ya procesados...`);
    const pendingTargets: EnrichedCVE[] = [];
    
    for (const t of targets) {
      if (skippedIds.has(t.id)) continue; // Ya marcado como omitido

      const rulePath = path.join(RULES_DIR, `${t.id}.yaml`);
      try {
        await fs.access(rulePath);
        continue; // Regla ya existe
      } catch {
        pendingTargets.push(t);
      }
    }

    console.log(`🚀 Iniciando Generador de Reglas Sintéticas (${pendingTargets.length} pendientes de ${targets.length} totales)...`);

    for (const target of pendingTargets) {
      console.log(`\n🔹 Procesando ${target.id}...`);

      // 1. Viabilidad
      const feasibility = await this.analyzeSastFeasibility(target.id, target.description, target.ai_context || "");
      if (!feasibility.feasible) {
        console.log(`   ⏭️ OMITIDO: ${feasibility.reason} -> Sugerido: ${feasibility.suggested_approach}`);
        
        // Registrar en log de omitidos
        skippedLog.push({
          id: target.id,
          reason: feasibility.reason,
          approach: feasibility.suggested_approach
        });
        skippedIds.add(target.id);
        await fs.writeFile(skippedLogPath, JSON.stringify(skippedLog, null, 2));
        
        continue;
      }

      // 2. Generar Código
      console.log("   ✅ Viable. Generando código de prueba...");
      const descForCode = target.description + (target.ai_context ? `\n\nCONTEXT: ${target.ai_context}` : "");
      const codeData = await this.generateCode(target.id, descForCode);
      if (!codeData.vulnerable_code || !codeData.safe_code) continue;

      const vulnPath = path.join(TEMP_DIR, `${target.id}_vuln.js`);
      const safePath = path.join(TEMP_DIR, `${target.id}_safe.js`);
      await fs.writeFile(vulnPath, codeData.vulnerable_code);
      await fs.writeFile(safePath, codeData.safe_code);

      // 3. Loop Generación Regla
      let lastFeedback = "";
      let success = false;
      const MAX_RETRIES = 3;

      // Recuperar feedback histórico si existe
      const prevFail = failedLog.find((f: any) => f.id === target.id);
      if (prevFail) {
        console.log("   🔄 Reintentando CVE previamente fallido con contexto histórico...");
        lastFeedback = `HISTORICAL FAILURE ANALYSIS:\nLast reason: ${prevFail.reason}\nFailed Rule:\n${prevFail.failed_rule}`;
      }

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`   Generating rule (Attempt ${attempt})...`);
        const ruleYaml = await this.generateRule(target.id, target.description, codeData.vulnerable_code, lastFeedback, target.ai_context || "");
        
        const rulePath = path.join(TEMP_DIR, `${target.id}.yaml`);
        await fs.writeFile(rulePath, ruleYaml);

        const validation = await this.validateRule(rulePath, vulnPath, safePath);

        if (validation.valid) {
          console.log("   ✅ Regla validada exitosamente!");
          const finalPath = path.join(RULES_DIR, `${target.id}.yaml`);
          await fs.writeFile(finalPath, ruleYaml);
          success = true;
          
          // Limpiar de log de fallos
          failedLog = failedLog.filter((f: any) => f.id !== target.id);
          break;
        } else {
          console.log(`   ⚠️ Fallo: ${validation.reason}`);
          lastFeedback = validation.reason;
        }
      }

      if (!success) {
        console.log(`   ❌ Fallo definitivo tras ${MAX_RETRIES} intentos.`);
        // Upsert en log de fallos
        const failEntry = {
          id: target.id,
          reason: lastFeedback,
          attempts: MAX_RETRIES,
          failed_rule: await fs.readFile(path.join(TEMP_DIR, `${target.id}.yaml`), 'utf-8').catch(() => "")
        };
        const existingIdx = failedLog.findIndex((f: any) => f.id === target.id);
        if (existingIdx >= 0) failedLog[existingIdx] = failEntry;
        else failedLog.push(failEntry);
      }
      
      // Persistir log de fallos tras cada iteración
      await fs.writeFile(failedLogPath, JSON.stringify(failedLog, null, 2));
    }
  }
}
