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
        const systemPrompt = `Eres un ingeniero de seguridad senior. Analiza el siguiente hallazgo de análisis estático.
            Determina si es un hallazgo verdadero o falso. Proporciona una razón y una recomendación de remedio.

            Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON válido con el siguiente formato exacto:
            {
            "triage": "True Positive",
            "reasoning": "Explicación detallada de por qué es vulnerable...",
            "recommendation": "Pasos específicos para corregir...",
            "severity_adjustment": "high"
            }

            Valores permitidos para "triage": "True Positive", "False Positive", "Needs Review".
            Valores permitidos para "severity_adjustment": "low", "medium", "high", "critical", null.

            IMPORTANTE: NO uses bloques de código markdown (\`\`\`json). NO incluyas texto introductorio. Responde SOLO con el JSON crudo.`

        const payload = { input: { prompt: `${systemPrompt}\n\n${prompt}` } }

        try {
            console.log('DEBUG: Sending request to RunPod')
            const res = await this.client.post('/runsync', payload)
            console.log('DEBUG: RunPod runsync response status:', res.status)
            const output = res.data && res.data.output ? res.data.output : null
            
            if (output) {
                console.log('DEBUG: RunPod sync output received')
                return this.extractAndParse(output)
            }

            if (!output) {
                console.log('DEBUG: RunPod sync output empty, trying async /run')
                const submit = await this.client.post('/run', payload)
                const jobId = submit.data && submit.data.id ? submit.data.id : null
                console.log('DEBUG: RunPod job submitted, ID:', jobId)
                
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
                    console.log(`DEBUG: RunPod job ${jobId} status: ${status}`)
                    
                    if (status === 'COMPLETED') {
                        const o = statusResponse.data.output
                        console.log('DEBUG: RunPod job completed, output:', JSON.stringify(o))
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
            console.error('DEBUG: RunPod error details:', err.response ? err.response.data : err.message)
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

        console.log('DEBUG: RunPod RAW content:', content) // Log raw content for debugging

        return this.parseResponse(content)
    }

    private buildPrompt(finding: any): string {
        return JSON.stringify({
            rule_id: finding.rule_id,
            rule_message: finding.rule_name,
            file_path: finding.file_path,
            line: finding.line,
            code_snippet: finding.code_snippet || 'Not available',
            severity: finding.severity,
            autofix_suggestion: finding.autofix_suggestion || 'None'
        }, null, 2)
    }

    private parseResponse(content: string): AnalysisResult | null {
        // Helper to validate and normalize the parsed object
        const normalize = (parsed: any): AnalysisResult => {
            return {
                triage: parsed.triage || 'Needs Review',
                reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : JSON.stringify(parsed.reasoning),
                recommendation: typeof parsed.recommendation === 'string' ? parsed.recommendation : JSON.stringify(parsed.recommendation),
                severity_adjustment: parsed.severity_adjustment?.score ? (parsed.severity_adjustment.score >= 8 ? 'critical' : 'high') : (typeof parsed.severity_adjustment === 'string' ? parsed.severity_adjustment : undefined)
            }
        }

        // Strategy 1: Try to find JSON code blocks and parse them
        // We iterate over ALL code blocks because the model might output the code snippet first in a block
        const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g
        let match
        while ((match = codeBlockRegex.exec(content)) !== null) {
            try {
                const candidate = match[1].trim()
                // Basic check if it looks like an object
                if (candidate.startsWith('{') && candidate.endsWith('}')) {
                    const parsed = JSON.parse(candidate)
                    return normalize(parsed)
                }
            } catch (e) {
                // Continue to next block
            }
        }

        // Strategy 2: If no valid JSON block found (or parsing failed), try to find the first '{' and last '}' in the WHOLE string
        try {
            let jsonStr = content.trim()
            // Remove markdown code block markers if present at start/end but regex missed them
            jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '')
            
            const firstOpen = jsonStr.indexOf('{')
            const lastClose = jsonStr.lastIndexOf('}')
            if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
                const candidate = jsonStr.substring(firstOpen, lastClose + 1)
                const parsed = JSON.parse(candidate)
                return normalize(parsed)
            }
        } catch (err) {
            // Fall through to failure
        }

        logger.warn(`Failed to parse LLM response: ${content}`)
        
        // Fallback: Return a structured result indicating parsing failure but preserving the content
        return {
            triage: 'Needs Review',
            reasoning: `Raw LLM Response (Parsing Failed): ${content}`,
            recommendation: 'Review the finding manually. The AI response could not be parsed as JSON.',
            severity_adjustment: undefined
        }
    }
}
