import http from 'http'
import { dbQuery } from '../../utils/db.js'
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.js'

function send(res: http.ServerResponse, code: number, body: any) {
  const data = JSON.stringify(body)
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.end(data)
}

export async function getDashboardStats(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
  const method = req.method || 'GET'
  const url = req.url || '/'
  
  // 1. Route Validation
  if (!(method === 'GET' && url === '/dashboard/stats')) return false

  // 2. Authentication
  const authReq = req as AuthenticatedRequest
  const isAuthenticated = await authenticate(authReq, res)
  if (!isAuthenticated) return true // Response already sent by authenticate

  const tenantId = authReq.tenantId!

  try {
    // 3. Parallel Data Fetching
    const [tenantRes, projectsRes, activeScansRes, latestScansRes, recentScansRes] = await Promise.all([
      // A. Credits
      dbQuery<any>('SELECT credits_balance FROM securetag.tenant WHERE id = $1', [tenantId]),
      
      // B. Total Projects
      dbQuery<any>('SELECT count(*) as count FROM securetag.project WHERE tenant_id = $1', [tenantId]),
      
      // C. Active Scans
      dbQuery<any>(
        `SELECT count(*) as count FROM securetag.task 
         WHERE tenant_id = $1 AND type = 'codeaudit' AND status NOT IN ('completed', 'failed', 'error', 'cancelled')`, 
        [tenantId]
      ),

      // D. Vulnerability Aggregation (Latest scan per project)
      dbQuery<any>(
        `SELECT DISTINCT ON (t.project_id) sr.summary_json
         FROM securetag.scan_result sr
         JOIN securetag.task t ON sr.task_id = t.id
         WHERE t.tenant_id = $1 AND t.type = 'codeaudit'
         ORDER BY t.project_id, sr.created_at DESC`,
        [tenantId]
      ),

      // E. Recent Scans List
      dbQuery<any>(
        `SELECT 
          sr.id, 
          t.id as task_id,
          sr.created_at, 
          sr.summary_json, 
          p.name as project_name, 
          p.alias as project_alias,
          t.status
         FROM securetag.scan_result sr
         JOIN securetag.task t ON sr.task_id = t.id
         LEFT JOIN securetag.project p ON t.project_id = p.id
         WHERE t.tenant_id = $1 AND t.type = 'codeaudit'
         ORDER BY sr.created_at DESC
         LIMIT 5`,
         [tenantId]
      )
    ])

    // 4. Data Processing
    
    // Stats
    const credits = tenantRes.rows[0]?.credits_balance || 0
    const totalProjects = parseInt(projectsRes.rows[0]?.count || '0', 10)
    const activeScans = parseInt(activeScansRes.rows[0]?.count || '0', 10)

    // Severity Calculation
    let totalVulnsCount = 0
    let severityDist = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }

    latestScansRes.rows.forEach((row: any) => {
      const summary = row.summary_json
      if (summary && summary.severity) {
        const s = summary.severity
        const crit = s.critical || 0
        const high = s.high || 0
        const med = s.medium || 0
        const low = s.low || 0
        const info = s.info || 0

        totalVulnsCount += (crit + high + med + low + info)
        severityDist.critical += crit
        severityDist.high += high
        severityDist.medium += med
        severityDist.low += low
        severityDist.info += info
      }
    })

    // Recent Scans Formatting
    const recentScans = recentScansRes.rows.map((row: any) => {
      const s = row.summary_json?.severity || {}
      return {
        id: row.id,
        taskId: row.task_id,
        project: row.project_name || row.project_alias || "Unnamed Project",
        status: row.status === 'completed' ? 'Completed' : row.status,
        date: row.created_at, // Send raw ISO string, let frontend format it
        critical: s.critical || 0,
        high: s.high || 0,
        medium: s.medium || 0,
        low: s.low || 0,
        info: s.info || 0,
        progress: row.status === 'completed' ? 100 : 50,
        eta: row.status === 'completed' ? "-" : "Processing..."
      }
    })

    // 5. Final Response
    send(res, 200, {
      ok: true,
      stats: {
        credits: credits,
        activeScans: activeScans,
        totalVulns: totalVulnsCount,
        totalProjects: totalProjects
      },
      severity: severityDist,
      recentScans: recentScans
    })

  } catch (error: any) {
    console.error('Dashboard Stats Error:', error)
    send(res, 500, { ok: false, error: 'Internal server error processing dashboard stats' })
  }

  return true
}
