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
    private isRunPod: boolean
    private runpodApiKey?: string

    constructor() {
        const host = process.env.OLLAMA_HOST || 'http://ollama:11434'
        this.model = process.env.MODEL || process.env.LLM_MODEL || 'securetag-v1'
        this.isRunPod = host.includes('runpod.ai')
        this.runpodApiKey = process.env.RUNPOD_API_KEY

        this.client = axios.create({
            baseURL: host,
            timeout: this.isRunPod ? 120000 : 30000, // RunPod needs longer timeout for polling
            headers: this.isRunPod && this.runpodApiKey ? {
                'Authorization': `Bearer ${this.runpodApiKey}`
            } : {}
        })
    }

    async analyzeFinding(finding: any): Promise<AnalysisResult | null> {
        try {
            if (this.isRunPod) {
                return await this.analyzeWithRunPod(finding)
            } else {
                return await this.analyzeWithOllama(finding)
            }
        } catch (err: any) {
            logger.warn(`LLM analysis failed for finding ${finding.fingerprint}: ${err.message}`)
            return null
        }
    }

    private async analyzeWithOllama(finding: any): Promise<AnalysisResult | null> {
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
    }

    private async analyzeWithRunPod(finding: any): Promise<AnalysisResult | null> {
        const prompt = this.buildPrompt(finding)
        const systemPrompt = 'Eres un ingeniero de seguridad senior. Analiza el siguiente hallazgo de análisis estático. Determina si es un hallazgo verdadero o falso. Proporciona una razón y una recomendación de remedio. Responde en formato JSON con los campos: triage, reasoning, recommendation, severity_adjustment.'

        // Submit job to RunPod
        const submitResponse = await this.client.post('/run', {
            input: {
                prompt: `${systemPrompt}\n\n${prompt}`
            }
        })

        const jobId = submitResponse.data.id
        if (!jobId) {
            logger.warn('RunPod did not return a job ID')
            return null
        }

        // Poll for result (max 60 seconds)
        const maxAttempts = 20
        const pollInterval = 3000 // 3 seconds

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, pollInterval))

            const statusResponse = await this.client.get(`/status/${jobId}`)
            const status = statusResponse.data.status

            if (status === 'COMPLETED') {
                const output = statusResponse.data.output
                if (output && output.length > 0 && output[0].choices && output[0].choices[0]) {
                    const content = output[0].choices[0].text
                    return this.parseResponse(content)
                }
                return null
            } else if (status === 'FAILED') {
                logger.warn(`RunPod job ${jobId} failed`)
                return null
            }
            // Status is IN_QUEUE or IN_PROGRESS, continue polling
        }

        logger.warn(`RunPod job ${jobId} timed out after ${maxAttempts * pollInterval / 1000}s`)
        return null
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
