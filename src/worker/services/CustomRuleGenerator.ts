import { ProjectContext } from '../ContextAnalyzer.js';
import { ExternalToolManager } from '../../agent/tools/ExternalToolManager.js';
import { AIProvider } from './AIProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { CreditsManager } from './CreditsManager.js';
import { logger } from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execFileAsync = util.promisify(execFile);

export interface GeneratedRule {
    id: string;
    rule_content: string; // YAML
    language: string;
    description: string;
    cwe: string;
    stack_context: string;
    ai_metadata: any;
}

interface VulnerabilityTarget {
    cwe: string;
    description: string;
}

export interface GenerationStats {
    attempts: number;
    successes: number;
    failures: number;
    total_cost: number;
    model: string;
}

export interface GenerationResult {
    rules: GeneratedRule[];
    stats: GenerationStats;
}

export class CustomRuleGenerator {
    private creditsManager: CreditsManager;

    constructor() {
        this.creditsManager = new CreditsManager();
    }

    private getProvider(modelConfig: string = 'standard'): AIProvider | null {
        // Map model config to providers
        // standard: GPT-4o-mini (fast, cheap)
        // pro: GPT-4o (balanced)
        // max: Claude Opus / o1 (slow, expensive, high reasoning)
        
        const openaiKey = process.env.AI_PROVIDER_OPENAI_KEY || process.env.OPENAI_API_KEY;
        const anthropicKey = process.env.AI_PROVIDER_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;

        if (modelConfig === 'max') {
             // Prefer Anthropic Opus or OpenAI o1
             if (anthropicKey) return new AnthropicProvider(anthropicKey, process.env.AI_MODEL_ANTHROPIC_MAX || 'claude-3-opus-20240229');
             if (openaiKey) return new OpenAIProvider(openaiKey, process.env.AI_MODEL_OPENAI_MAX || 'o1-preview');
        } else if (modelConfig === 'pro') {
             if (openaiKey) return new OpenAIProvider(openaiKey, process.env.AI_MODEL_OPENAI_PRO || 'gpt-4o');
             if (anthropicKey) return new AnthropicProvider(anthropicKey, process.env.AI_MODEL_ANTHROPIC_PRO || 'claude-3-sonnet-20240229');
        } else {
             // Standard (default)
             if (openaiKey) return new OpenAIProvider(openaiKey, process.env.AI_MODEL_OPENAI_STANDARD || 'gpt-4o-mini');
             if (anthropicKey) return new AnthropicProvider(anthropicKey, process.env.AI_MODEL_ANTHROPIC_STANDARD || 'claude-3-haiku-20240307');
        }
        return null;
    }

    async generateRules(
        tenantId: string, 
        context: ProjectContext, 
        qty: number, 
        workDir: string,
        modelConfig: string = 'standard'
    ): Promise<GenerationResult> {
        const provider = this.getProvider(modelConfig);
        if (!provider) {
            logger.error(`No AI provider available for CustomRuleGenerator (model: ${modelConfig})`);
            return { rules: [], stats: { attempts: 0, successes: 0, failures: 0, total_cost: 0, model: modelConfig } };
        }

        const validRules: GeneratedRule[] = [];
        const stats: GenerationStats = {
            attempts: 0,
            successes: 0,
            failures: 0,
            total_cost: 0,
            model: modelConfig
        };

        const tempDir = path.join(workDir, '.custom_rules_gen');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        logger.info(`Starting custom rule generation for tenant ${tenantId}. Target: ${qty} rules.`);

        // Determine Success Fee based on model
        let successFee = 2; // Standard
        if (modelConfig === 'pro') successFee = 4;
        if (modelConfig === 'max') successFee = 9;

        // 0. Discovery Phase (Select Targets)
        const existingRulesHint = await this.getExistingRulesHint(context.stack.languages);
        logger.info(`Found existing rules for context: ${existingRulesHint.substring(0, 100)}...`);
        const targets = await this.discoverTargets(provider, context, qty, existingRulesHint);
        logger.info(`Discovered ${targets.length} vulnerability targets for custom rules.`);

        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            
            // 1. Processing Fee (1 credit)
            stats.attempts++;
            const feePaid = await this.creditsManager.deductCredits(tenantId, 1, 'Custom Rule Generation Attempt');
            if (!feePaid) {
                logger.warn(`Stopped rule generation for tenant ${tenantId}: Insufficient credits.`);
                stats.failures++; // Count as failure to proceed
                break;
            }
            stats.total_cost += 1;

            try {
                // 2. Generate Rule Flow (Code -> Rule -> Validate)
                const rule = await this.generateRuleForTarget(provider, context, tempDir, target, i);
                
                if (rule) {
                    // 3. Success Fee
                    const successPaid = await this.creditsManager.deductCredits(tenantId, successFee, 'Custom Rule Success Fee');
                    
                    if (successPaid) {
                        validRules.push(rule);
                        stats.successes++;
                        stats.total_cost += successFee;
                        logger.info(`Rule generated and validated successfully: ${rule.cwe}`);
                    } else {
                        logger.warn(`Rule generated but user ran out of credits for Success Fee. Discarding.`);
                        stats.failures++;
                    }
                } else {
                    stats.failures++;
                }
            } catch (err) {
                logger.error(`Error generating rule for ${target.cwe}:`, err);
                stats.failures++;
            }
        }

        // Cleanup
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {}

        return { rules: validRules, stats };
    }

    private async getExistingRulesHint(languages: string[]): Promise<string> {
        const rulesDir = '/opt/securetag/rules';
        let hints: string[] = [];
        
        // Normalize languages (handle "JavaScript/TypeScript" case)
        const normalizedLanguages = languages.flatMap(l => l.split('/').map(s => s.trim().toLowerCase()));

        for (const lang of normalizedLanguages) {
            const langDir = path.join(rulesDir, lang);
            if (fs.existsSync(langDir)) {
                try {
                    // Find all .yaml files
                    const { stdout } = await execFileAsync('find', [langDir, '-name', '*.yaml']);
                    const files = stdout.split('\n')
                        .map(f => path.basename(f, '.yaml'))
                        .filter(f => f)
                        .slice(0, 50); // Limit to 50 to avoid token overflow
                    hints.push(...files);
                } catch (e) {
                    // Ignore errors
                }
            }
        }
        
        // Also add generic rules hint if empty
        if (hints.length === 0) return "Standard SAST rules for XSS, SQLi, Injection, etc.";
        
        return hints.join(', ');
    }

    private async discoverTargets(provider: AIProvider, context: ProjectContext, qty: number, existingRulesHint: string): Promise<VulnerabilityTarget[]> {
        const languages = context.stack.languages.join(', ');
        const frameworks = context.stack.frameworks.join(', ');
        const dependencies = context.dependencies.slice(0, 50).join(', ');

        const systemPrompt = `Eres un experto en seguridad de aplicaciones y arquitectura de software.`;
        const userPrompt = `Analiza el siguiente stack tecnológico:
Lenguajes: ${languages}
Frameworks: ${frameworks}
Dependencias Clave: ${dependencies}

REGLAS EXISTENTES (YA CUBIERTAS):
${existingRulesHint}

Tu tarea es identificar ${qty} vulnerabilidades específicas, críticas y NO triviales que podrían afectar a una aplicación construida con este stack.
EVITA generar reglas para vulnerabilidades que ya estén cubiertas por la lista anterior, a menos que sea un caso de borde o una variante específica del framework.
Céntrate en vulnerabilidades lógicas o específicas de los frameworks detectados (ej. Inyección SQL en TypeORM, XSS en React, Deserialización en Java, etc.).

Devuelve UNICAMENTE un objeto JSON con la clave "vulnerabilities" que contenga un array de objetos:
{
  "vulnerabilities": [
    {
      "cwe": "CWE-XXX",
      "description": "Descripción breve de la vulnerabilidad en este contexto"
    }
  ]
}`;

        try {
            logger.info('Sending prompt to AI for Discovery...');
            const response = await provider.generateContent(systemPrompt, userPrompt, true);
            logger.info(`AI Discovery Response: ${response.substring(0, 200)}...`);
            
            let data: VulnerabilityTarget[] = [];
            try {
                // Try parsing
                const parsed = JSON.parse(response);
                if (parsed.vulnerabilities && Array.isArray(parsed.vulnerabilities)) {
                    data = parsed.vulnerabilities;
                } else if (Array.isArray(parsed)) {
                    data = parsed;
                } else if (parsed.cwe) {
                    data = [parsed as VulnerabilityTarget];
                }
            } catch (e) {
                // Regex fallback
                const match = response.match(/\[[\s\S]*\]/);
                if (match) {
                    try {
                        data = JSON.parse(match[0]);
                    } catch (e2) {}
                }
            }
            return Array.isArray(data) ? data.slice(0, qty) : [];
        } catch (e) {
            logger.error('Failed to discover targets', e);
            return [];
        }
    }

    private async generateRuleForTarget(
        provider: AIProvider, 
        context: ProjectContext, 
        tempDir: string, 
        target: VulnerabilityTarget,
        index: number
    ): Promise<GeneratedRule | null> {
        const attemptId = crypto.randomUUID().slice(0, 8);
        const maxRetries = 2;
        let attempts = 0;
        let lastError = '';

        // Step 1: Generate Code
        const codePrompt = `Actúa como un experto en seguridad de aplicaciones.
Objetivo: Generar ejemplos de código ${context.stack.languages.join('/')} para probar reglas de detección SAST.

Vulnerabilidad: ${target.cwe} - ${target.description}

Genera un JSON con dos campos:
1. 'vulnerable_code': Un snippet de código realista que contenga esta vulnerabilidad. Debe ser simple pero funcional.
2. 'safe_code': Un snippet similar que realice la misma función pero de forma SEGURA (corregido).

Formato de respuesta esperado (JSON puro):
{
    "vulnerable_code": "...",
    "safe_code": "..."
}
IMPORTANTE: El código debe ser sintácticamente válido para ${context.stack.languages[0] || 'Javascript'}.`;

        let codeData: { vulnerable_code: string, safe_code: string } | null = null;
        try {
            const codeResponse = await provider.generateContent("Eres un generador de código seguro.", codePrompt, true);
            try {
                codeData = JSON.parse(codeResponse);
            } catch (e) {
                const match = codeResponse.match(/\{[\s\S]*\}/);
                if (match) codeData = JSON.parse(match[0]);
            }
        } catch (e) {
            logger.error(`Failed to generate code for ${target.cwe}`, e);
            return null;
        }

        if (!codeData || !codeData.vulnerable_code || !codeData.safe_code) {
            logger.warn(`Invalid code generation response for ${target.cwe}`);
            return null;
        }

        // Detect extension
        const ext = this.getExtension(context.stack.languages[0] || 'js');
        const unsafePath = path.join(tempDir, `unsafe_${attemptId}.${ext}`);
        const safePath = path.join(tempDir, `safe_${attemptId}.${ext}`);
        fs.writeFileSync(unsafePath, codeData.vulnerable_code);
        fs.writeFileSync(safePath, codeData.safe_code);

        // Step 2: Generate Rule (Loop)
        while (attempts <= maxRetries) {
            try {
                const feedbackPrompt = attempts > 0 ? `
❌ INTENTO ANTERIOR FALLIDO:
${lastError}

Por favor, ajusta la regla para corregir este error.
- Si falló en detectar el código vulnerable: Haz el patrón más genérico o revisa la sintaxis.
- Si detectó el código seguro (falso positivo): Haz el patrón más específico o añade exclusiones (pattern-not).` : "";

                const rulePrompt = `Actúa como un experto en ingeniería de detección de Semgrep.
Objetivo: Crear una regla Semgrep para detectar ${target.cwe}.

Código Vulnerable de referencia:
\`\`\`${ext}
${codeData.vulnerable_code}
\`\`\`

${feedbackPrompt}

Requisitos de la regla:
1. ID de la regla: \`synthetic-${target.cwe.toLowerCase().replace(/[^a-z0-9]/g, '')}-${attemptId}\`
2. Lenguaje: ${context.stack.languages.map(l => l.toLowerCase()).join(', ')}
3. Mensaje: Debe explicar por qué es peligroso citando el CVE y el contexto de explotación.
4. Severidad: ERROR
5. Patrón: Debe hacer match con el código vulnerable proporcionado, pero ser lo suficientemente genérico para variantes similares.
6. Metadata: DEBE incluir los siguientes campos OBLIGATORIOS:
   - cwe: "${target.cwe}: ${target.description}"
   - owasp: "A01:2021 - Broken Access Control" (O la categoría OWASP Top 10 apropiada)
   - category: "security"
   - technology:
     ${context.stack.frameworks.map(f => `- ${f.toLowerCase()}`).join('\n     ')}
   - likelihood: "HIGH" | "MEDIUM" | "LOW"
   - impact: "HIGH" | "MEDIUM" | "LOW"
   - confidence: "HIGH" | "MEDIUM" | "LOW"

RESTRICCIONES TÉCNICAS (MUY IMPORTANTE PARA EVITAR WARNINGS):
- NO uses 'pattern-sources' ni 'pattern-sinks' a menos que especifiques 'mode: taint'. Por defecto usa 'mode: search' (implícito) y usa 'patterns' o 'pattern-either'.
- 'metavariables' DEBE estar dentro de un bloque 'pattern-inside' o similar, nunca al nivel raíz de 'patterns'.
- NO uses campos obsoletos como 'message-format'.
- Si usas 'fix:', asegúrate de que el código de reemplazo sea sintácticamente válido y completo. Si no puedes garantizarlo, NO incluyas 'fix'.

Devuelve SOLO el contenido YAML de la regla. NO incluyas bloques markdown \`\`\`yaml.`;

                const ruleResponse = await provider.generateContent("Eres un experto en Semgrep.", rulePrompt, false);
                let ruleYaml = ruleResponse.trim();
                // Strip markdown if present
                if (ruleYaml.startsWith('```yaml')) {
                    ruleYaml = ruleYaml.replace('```yaml', '').replace(/```$/, '');
                } else if (ruleYaml.startsWith('```')) {
                    ruleYaml = ruleYaml.replace('```', '').replace(/```$/, '');
                }

                const rulePath = path.join(tempDir, `rule_${attemptId}.yaml`);
                fs.writeFileSync(rulePath, ruleYaml);

                // Step 3: Validate
                const isUnsafeDetected = await this.runSemgrep(rulePath, unsafePath);
                const isSafeDetected = await this.runSemgrep(rulePath, safePath);

                if (isUnsafeDetected && !isSafeDetected) {
                    return {
                        id: crypto.randomUUID(),
                        rule_content: ruleYaml,
                        language: context.stack.languages[0] || 'unknown',
                        description: target.description,
                        cwe: target.cwe,
                        stack_context: `${context.stack.frameworks.join(', ')}`,
                        ai_metadata: { provider: provider.name, model: provider.modelName, attempts }
                    };
                } else {
                    lastError = `Validation Failed: Unsafe Detected=${isUnsafeDetected}, Safe Detected=${isSafeDetected}. (Target: Unsafe=True, Safe=False)`;
                    logger.warn(`Rule generation attempt ${attempts + 1} for ${target.cwe} failed: ${lastError}`);
                }

            } catch (err: any) {
                lastError = `Exception: ${err.message}`;
                logger.error(`Rule generation exception for ${target.cwe}:`, err);
            }
            attempts++;
        }

        return null;
    }

    private getExtension(lang: string): string {
        const l = lang.toLowerCase();
        if (l.includes('python')) return 'py';
        if (l.includes('java')) return 'java';
        if (l.includes('script') || l.includes('js') || l.includes('node')) return 'js';
        if (l.includes('go')) return 'go';
        if (l.includes('php')) return 'php';
        return 'txt';
    }

    private async runSemgrep(rulePath: string, targetPath: string): Promise<boolean> {
        try {
            const args = ['scan', '--config', rulePath, '--json', '--quiet', targetPath];
            const { stdout } = await execFileAsync('semgrep', args, { timeout: 10000 });
            
            const result = JSON.parse(stdout);
            return result.results && result.results.length > 0;
        } catch (err) {
            // Semgrep returns non-zero exit code if findings are found (sometimes) or if error
            // Check stderr/stdout
            try {
                 // Sometimes execFile throws but stdout has valid JSON if findings were found
                 // But wait, semgrep exit code depends on configuration.
                 // We need to handle this carefully.
                 // For now, assume if it throws it failed execution unless we can parse stdout.
                 if ((err as any).stdout) {
                     const result = JSON.parse((err as any).stdout);
                     return result.results && result.results.length > 0;
                 }
            } catch (e) {}

            logger.warn(`Semgrep execution failed: ${err}`);
            return false;
        }
    }
}
