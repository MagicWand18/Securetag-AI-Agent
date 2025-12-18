import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIAnalysisResult } from './AIProvider.js';
import { logger } from '../../utils/logger.js';

export class AnthropicProvider implements AIProvider {
    name = 'anthropic';
    modelName: string;
    private client: Anthropic;

    constructor(apiKey: string, model: string) {
        this.modelName = model;
        this.client = new Anthropic({
            apiKey: apiKey,
        });
    }

    // @ts-ignore - Parameters are part of the interface contract
    async analyzeFinding(finding: any, projectContext: any, promptTemplate: string): Promise<AIAnalysisResult> {
        try {
            const message = await this.client.messages.create({
                model: this.modelName,
                max_tokens: 1024,
                system: `Eres un ingeniero de seguridad senior. Analiza el siguiente hallazgo de análisis estático.
            Determina si es un hallazgo verdadero o falso basándote en la evidencia proporcionada. Proporciona una razón y una recomendación de remedio.

            Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON válido con el siguiente formato exacto:
            {
            "triage": "True Positive",
            "reasoning": "Explicación directa y técnica. Si asumes riesgo por falta de contexto, indícalo claramente.",
            "recommendation": "Pasos específicos para corregir...",
            "severity_adjustment": "high"
            }

            Valores permitidos para "triage": "True Positive", "False Positive", "Needs Review".
            Valores permitidos para "severity_adjustment": "low", "medium", "high", "critical", null.

            IMPORTANTE: NO uses bloques de código markdown (\`\`\`json). NO incluyas texto introductorio. Responde SOLO con el JSON crudo.`,
                messages: [
                    {
                        role: 'user',
                        content: promptTemplate
                    }
                ]
            });

            // Handle content block
            const textBlock = message.content[0];
            if (textBlock.type !== 'text') throw new Error('Unexpected response type from Claude');
            
            const content = textBlock.text;
            
            // Claude sometimes adds text before/after JSON even if asked not to, so we parse carefully
            // Using a simple regex to extract JSON object
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found in Claude response');
            
            const parsed = JSON.parse(jsonMatch[0]);

            return {
                triage: parsed.triage || 'Needs Review',
                reasoning: parsed.reasoning || 'No reasoning provided',
                recommendation: parsed.recommendation || 'No recommendation provided',
                severity_adjustment: parsed.severity_adjustment,
                confidence_score: 0.9,
                raw_response: content
            };

        } catch (error: any) {
            logger.error(`Anthropic analysis failed: ${error.message}`);
            throw error;
        }
    }
}
