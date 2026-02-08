
import http from 'http'
import { dbQuery, ensureTenant } from '../../utils/db.js'
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.js'
import { ExternalAIService } from '../../worker/services/ExternalAIService.js'
import { LLMClient } from '../../worker/LLMClient.js'
import { logger } from '../../utils/logger.js'

function send(res: http.ServerResponse, code: number, body: any) {
  const data = JSON.stringify(body)
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.end(data)
}

function getJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

export async function handleFindingRoutes(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
  const url = req.url || '/'
  const method = req.method || 'GET'

  // Match POST /api/v1/findings/double-check
  // We'll support both /api/v1... and just /findings/double-check for internal consistency if needed, 
  // but strictly following user request: /api/v1/findings/double-check
  if (method === 'POST' && (url === '/api/v1/findings/double-check' || url === '/findings/double-check')) {
    
    // 1. Authenticate
    const authReq = req as AuthenticatedRequest
    const isAuthenticated = await authenticate(authReq, res)
    if (!isAuthenticated) return true // authenticate sends 401

    const tenantId = authReq.tenantId
    if (!tenantId) {
        send(res, 401, { ok: false, error: 'Tenant context missing' })
        return true
    }

    try {
        const body = await getJsonBody(req)
        const { finding_id, model } = body

        if (!finding_id) {
            send(res, 400, { ok: false, error: 'Missing finding_id' })
            return true
        }

        // 2. Fetch Finding
        const q = await dbQuery<any>(
            `SELECT id, rule_id, rule_name, file_path, line, severity, 
                    code_snippet, context_snippet, snippet_fix, 
                    analysis_json 
             FROM securetag.finding 
             WHERE id = $1 AND tenant_id = $2`,
            [finding_id, tenantId]
        )

        if (q.rows.length === 0) {
            send(res, 404, { ok: false, error: 'Finding not found' })
            return true
        }

        const finding = q.rows[0]

        if (!finding.code_snippet) {
             send(res, 400, { ok: false, error: 'Code evidence not available for this finding. Please re-scan to capture evidence.' })
             return true
        }

        // Optional: Check if already checked? 
        // For now, allow re-check (maybe user wants to try a better model or retry)
        // But warning: it costs credits.

        // 3. Prepare AI Service
        const externalAIService = new ExternalAIService()
        const llmClient = new LLMClient()

        // 4. Prepare Context
        // We use context_snippet from DB as the "project context" if available, 
        // or just the code_snippet.
        // We don't have the full repo structure anymore, so we pass a minimal context.
        const projectContext = {
            stack: [], // We might store stack in task/project metadata, but for now empty
            critical_files: [],
            structure: finding.context_snippet || 'Not available'
        }

        // TODO: Retrieve User Context from Project/Task if possible.
        // For now, undefined.
        const safeUserContext = undefined

        // 5. Build Prompt
        // Map finding fields to what buildPrompt expects
        const findingForPrompt = {
            rule_id: finding.rule_id,
            rule_name: finding.rule_name,
            file_path: finding.file_path,
            line: finding.line,
            code_snippet: finding.code_snippet, // This is crucial
            severity: finding.severity,
            autofix_suggestion: finding.snippet_fix
        }

        const prompt = llmClient.buildPrompt(findingForPrompt, projectContext as any, safeUserContext)

        // 6. Perform Double Check
        // Determine level based on model requested.
        // We use the same logic as the frontend: standard=1, pro=2, max=3
        let level = 'standard'
        if (model === 'pro') level = 'pro'
        if (model === 'max') level = 'max'

        const config = {
            level: level as any, // 'standard' | 'pro' | 'max'
            model_used: model
        }

        const result = await externalAIService.performDoubleCheck(
            {
                ...findingForPrompt,
                // Add extra fields needed by performDoubleCheck if any
            },
            projectContext,
            prompt,
            tenantId,
            config
        )

        if (!result) {
             // Likely insufficient credits or provider error
             // performDoubleCheck logs errors.
             // If it returns null, it failed.
             send(res, 402, { ok: false, error: 'Analysis failed or insufficient credits' })
             return true
        }

        // 7. Update Finding in DB
        // Merge with existing analysis_json if any
        let existingAnalysis = finding.analysis_json || {}
        if (typeof existingAnalysis === 'string') existingAnalysis = JSON.parse(existingAnalysis)
        
        const newAnalysis = {
            ...existingAnalysis,
            double_check: result,
            double_check_model: model || 'default',
            double_check_at: new Date().toISOString()
        }

        await dbQuery(
            `UPDATE securetag.finding 
             SET analysis_json = $1 
             WHERE id = $2`,
            [JSON.stringify(newAnalysis), finding_id]
        )

        send(res, 200, { ok: true, result })

    } catch (e) {
        logger.error('Error in double-check endpoint:', e)
        send(res, 500, { ok: false, error: 'Internal Server Error' })
    }

    return true
  }

  return false
}
