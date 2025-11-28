import axios, { AxiosInstance } from 'axios'
import { logger } from '../utils/logger.js'

export interface AnalysisResult {
    triage: 'True Positive' | 'False Positive' | 'Needs Review'
    reasoning: string
    recommendation: string
    severity_adjustment?: 'low' | 'medium' | 'high' | 'critical'
}

export class LLMClient {
    private client: AxiosInstance
    private model: string

    constructor() {
        const host = process.env.OLLAMA_HOST || 'http://ollama:11434'
        this.model = process.env.LLM_MODEL || 'securetag-v1'

        this.client = axios.create({
            baseURL: host,
            timeout: 30000 // 30 seconds timeout
        })
    }

    async analyzeFinding(finding: any): Promise<AnalysisResult | null> {
        try {
            const prompt = this.buildPrompt(finding)

            const response = await this.client.post('/api/chat', {
                model: this.model,
                messages: [
                    { role: 'system', content: 'Eres un ingeniero de seguridad senior. Analiza el siguiente hallazgo de análisis estático. Determina si es un hallazgo verdadero o falso. Proporciona una razón y una recomendación de remedio. Responde en formato JSON.' },
                    { role: 'user', content: prompt }
                ],
                stream: false,
                format: 'json'
            })

            if (response.data && response.data.message && response.data.message.content) {
                return this.parseResponse(response.data.message.content)
            }

            return null
        } catch (err: any) {
            logger.warn(`LLM analysis failed for finding ${finding.fingerprint}: ${err.message}`)
            return null
        }
    }

    private buildPrompt(finding: any): string {
        return JSON.stringify({
            rule_id: finding.rule_id,
            rule_message: finding.rule_name,
            file_path: finding.file_path,
            line: finding.line,
            code_snippet: finding.code_snippet || 'Not available', // Assuming we might pass code snippet later
            severity: finding.severity
        }, null, 2)
    }

    private parseResponse(content: string): AnalysisResult | null {
        try {
            const parsed = JSON.parse(content)
            return {
                triage: parsed.triage || 'Needs Review',
                reasoning: parsed.reasoning || 'No reasoning provided',
                recommendation: parsed.recommendation || 'No recommendation provided',
                severity_adjustment: parsed.severity_adjustment
            }
        } catch (err) {
            logger.warn(`Failed to parse LLM response: ${content}`)
            return null
        }
    }
}
