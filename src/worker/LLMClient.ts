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
            console.log('DEBUG: analyzeFinding called for', finding.rule_id)
            if (this.isRunPod) {
                console.log('DEBUG: Using RunPod analysis')
                return await this.analyzeWithRunPod(finding)
            } else {
                console.log('DEBUG: Using Ollama analysis')
                return await this.analyzeWithOllama(finding)
            }
        } catch (err: any) {
            logger.error('LLM analysis failed', err)
            console.error('DEBUG: LLM analysis error:', err)
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

        const payload = { input: { prompt: `${systemPrompt}\n\n${prompt}` } }

        try {
            const res = await this.client.post('/runsync', payload)
            const output = res.data && res.data.output ? res.data.output : null

            if (!output) {
                const submit = await this.client.post('/run', payload)
                const jobId = submit.data && submit.data.id ? submit.data.id : null
                if (!jobId) {
                    logger.warn('RunPod did not return a job ID')
                    return null
                }

                const maxAttempts = 20
                const pollInterval = 3000
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    await new Promise(resolve => setTimeout(resolve, pollInterval))
                    const statusResponse = await this.client.get(`/status/${jobId}`)
                    const status = statusResponse.data && statusResponse.data.status
                    if (status === 'COMPLETED') {
                        const o = statusResponse.data.output
                        return this.extractAndParse(o)
                    } else if (status === 'FAILED') {
                        logger.warn(`RunPod job ${jobId} failed`)
                        return null
                    }
                }
                logger.warn('RunPod job timed out without completion')
                return null
            }

            return this.extractAndParse(output)
        } catch (err: any) {
            logger.error('RunPod runsync call failed', err)
            return null
        }
    }

    private extractAndParse(output: any): AnalysisResult | null {
        const first = Array.isArray(output) ? output[0] : output
        let content: string | undefined

        if (first && typeof first === 'object') {
            if (first.choices && first.choices[0] && typeof first.choices[0].text === 'string') {
                content = first.choices[0].text
            } else if (typeof first.response === 'string') {
                content = first.response
            } else if (typeof first.generated_text === 'string') {
                content = first.generated_text
            } else if (typeof first.output === 'string') {
                content = first.output
            }
        } else if (typeof first === 'string') {
            content = first
        }

        if (!content) {
            logger.warn('RunPod output format not recognized')
            return null
        }

        return this.parseResponse(content)
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
            // Clean up content to handle Markdown code blocks
            let jsonStr = content.trim()
            
            // Extract JSON from markdown code blocks if present
            const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/
            const match = jsonStr.match(codeBlockRegex)
            if (match && match[1]) {
                jsonStr = match[1].trim()
            } else {
                // If no code blocks, try to find the first '{' and last '}'
                const firstOpen = jsonStr.indexOf('{')
                const lastClose = jsonStr.lastIndexOf('}')
                if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
                    jsonStr = jsonStr.substring(firstOpen, lastClose + 1)
                }
            }

            const parsed = JSON.parse(jsonStr)
            return {
                triage: parsed.triage || 'Needs Review',
                reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : JSON.stringify(parsed.reasoning),
                recommendation: typeof parsed.recommendation === 'string' ? parsed.recommendation : JSON.stringify(parsed.recommendation),
                severity_adjustment: parsed.severity_adjustment?.score ? (parsed.severity_adjustment.score >= 8 ? 'critical' : 'high') : (typeof parsed.severity_adjustment === 'string' ? parsed.severity_adjustment : undefined)
            }
        } catch (err) {
            logger.warn(`Failed to parse LLM response: ${content}`)
            return null
        }
    }
}
