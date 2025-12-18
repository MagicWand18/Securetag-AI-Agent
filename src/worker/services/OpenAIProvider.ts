import OpenAI from 'openai';
import { AIProvider, AIAnalysisResult } from './AIProvider.js';
import { logger } from '../../utils/logger.js';

export class OpenAIProvider implements AIProvider {
    name = 'openai';
    modelName: string;
    private client: OpenAI;

    constructor(apiKey: string, model: string, orgId?: string) {
        this.modelName = model;
        this.client = new OpenAI({
            apiKey: apiKey,
            organization: orgId,
        });
    }
    // @ts-ignore - Parameters are part of the interface contract
    async analyzeFinding(finding: any, projectContext: any, promptTemplate: string): Promise<AIAnalysisResult> {
        try {
            // Check for reasoning models that require temperature 1 (or default)
            const isReasoningModel = this.modelName.startsWith('o1') || 
                                   this.modelName.startsWith('o3') || 
                                   this.modelName.includes('gpt-5');
            
            const temperature = isReasoningModel ? 1 : 0.2;

            const completion = await this.client.chat.completions.create({
                model: this.modelName,
                messages: [
                    {
                        role: 'system',
                        content: `Eres un ingeniero de seguridad senior. Analiza el siguiente hallazgo de análisis estático.
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

            IMPORTANTE: NO uses bloques de código markdown (\`\`\`json). NO incluyas texto introductorio. Responde SOLO con el JSON crudo.`
                    },
                    {
                        role: 'user',
                        content: promptTemplate
                    }
                ],
                temperature: temperature,
                response_format: { type: 'json_object' } 
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error('Empty response from OpenAI');

            const parsed = JSON.parse(content);
            
            return {
                triage: parsed.triage || 'Needs Review',
                reasoning: parsed.reasoning || 'No reasoning provided',
                recommendation: parsed.recommendation || 'No recommendation provided',
                severity_adjustment: parsed.severity_adjustment,
                confidence_score: 0.9, // Placeholder
                raw_response: content
            };

        } catch (error: any) {
            logger.error(`OpenAI analysis failed: ${error.message}`);
            throw error;
        }
    }

    async generateContent(systemPrompt: string, userPrompt: string, jsonMode: boolean = false): Promise<string> {
        try {
            const isReasoningModel = this.modelName.startsWith('o1') || 
                                   this.modelName.startsWith('o3') || 
                                   this.modelName.includes('gpt-5');
            
            const temperature = isReasoningModel ? 1 : 0.2;

            const completion = await this.client.chat.completions.create({
                model: this.modelName,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: temperature,
                response_format: jsonMode ? { type: 'json_object' } : undefined
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error('Empty response from OpenAI');

            return content;
        } catch (error: any) {
            logger.error(`OpenAI generation failed: ${error.message}`);
            throw error;
        }
    }
}
