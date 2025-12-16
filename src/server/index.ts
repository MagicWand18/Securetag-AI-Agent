import crypto from 'crypto'
import http from 'http'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { codeauditIndex, codeauditLatest, codeauditDetail } from './routes/codeaudit.js'
import { serveDocs } from './routes/docs.js'
import { dbQuery, ensureTenant } from '../utils/db.js'
import validator from 'validator'
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js'
import { addSecurityHeaders, checkRateLimit, banEntity, getClientIP, isBanned } from './security.js'
import { isZipFile, checkVirusTotal } from './validation.js'

const port = parseInt(process.env.PORT || '8080', 10)

// Helper function to check DB connection
async function checkDbConnection(): Promise<boolean> {
  try {
    await dbQuery('SELECT 1')
    return true
  } catch {
    return false
  }
}

function send(res: http.ServerResponse, code: number, body: any) {
  const data = JSON.stringify(body)
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.end(data)
}
function sendHtml(res: http.ServerResponse, code: number, html: string) {
  res.statusCode = code
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(html)
}
function escapeHtml(s: any) {
  const str = String(s || '')
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const server = http.createServer(async (req, res) => {
  // 1. Apply Security Headers to ALL responses
  addSecurityHeaders(res)

  const url = req.url || '/'
  const method = req.method || 'GET'

  // 2. Global Rate Limiting (skip healthchecks)
  if (!url.startsWith('/healthz')) {
    const ip = getClientIP(req)
    if (isBanned(ip)) {
      return send(res, 403, { ok: false, error: 'Access denied. IP address temporarily banned due to suspicious activity.' })
    }
    if (!checkRateLimit(req)) {
      return send(res, 429, { ok: false, error: 'Too Many Requests' })
    }
  }

  if ((method === 'GET' || method === 'HEAD') && url === '/healthz') {
    return send(res, 200, { ok: true })
  }
  if ((method === 'GET' || method === 'HEAD') && url === '/healthz/db') {
    const isConnected = await checkDbConnection()
    if (isConnected) {
      return send(res, 200, { ok: true, db: 'connected' })
    } else {
      return send(res, 503, { ok: false, db: 'disconnected', error: 'Database connection failed' })
    }
  }
  if (method === 'POST' && url === '/scans/web') {
    // Authenticate request
    const authReq = req as AuthenticatedRequest
    const isAuthenticated = await authenticate(authReq, res)
    if (!isAuthenticated) return

    // Check DB connection before accepting task
    const isDbConnected = await checkDbConnection()
    if (!isDbConnected) {
      return send(res, 503, { ok: false, error: 'Database unavailable' })
    }
    const chunks: Buffer[] = []
    req.on('data', c => chunks.push(Buffer.from(c)))
    req.on('end', async () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        const body = raw ? JSON.parse(raw) : {}
        const taskId = uuidv4()
        const payload = {
          ok: true,
          taskId,
          status: 'queued',
          type: 'web',
          url: body.url,
          options: body.options || {}
        }
        if (!validator.isURL(body.url)) {
          return send(res, 400, { ok: false, error: 'Invalid URL' })
        }
        const tenantId = authReq.tenantId!
        try {
          await dbQuery('INSERT INTO securetag.task(id, tenant_id, type, status, payload_json, retries, priority, created_at) VALUES($1,$2,$3,$4,$5,$6,$7, now())', [taskId, tenantId, 'web', 'queued', JSON.stringify({ url: body.url, options: payload.options }), 0, 0])
        } catch {
          return send(res, 503, { ok: false })
        }
        console.log(JSON.stringify({ event: 'enqueue', taskId, type: 'web', url: body.url }))
        return send(res, 202, payload)
      } catch (e: any) {
        return send(res, 400, { ok: false, error: String(e && e.message || e) })
      }
    })
    return
  }
  if (method === 'POST' && url === '/codeaudit/upload') {
    // Strict Rate Limiting for Uploads
    if (!checkRateLimit(req, true)) {
      return send(res, 429, { ok: false, error: 'Upload limit exceeded. Please wait.' })
    }

    // Authenticate request
    const authReq = req as AuthenticatedRequest
    const isAuthenticated = await authenticate(authReq, res)
    if (!isAuthenticated) return

    // Check DB connection before accepting upload
    const isDbConnected = await checkDbConnection()
    if (!isDbConnected) {
      return send(res, 503, { ok: false, error: 'Database unavailable' })
    }
    const tenantId = authReq.tenantId!
    const uploads = process.env.UPLOADS_DIR || `/var/securetag/${authReq.tenantName}/uploads`
    const work = process.env.WORK_DIR || `/var/securetag/${authReq.tenantName}/work`
    const ct = req.headers['content-type'] || ''
    if (!ct.includes('multipart/form-data')) return send(res, 400, { ok: false })
    const boundary = ct.split('boundary=')[1]
    if (!boundary) return send(res, 400, { ok: false })
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', c => {
      chunks.push(Buffer.from(c))
      size += c.length
      if (size > 50 * 1024 * 1024) req.destroy()
    })
    req.on('end', async () => {
      try {
        const buf = Buffer.concat(chunks)
        const parts = buf.toString('binary').split('--' + boundary)
        let fileName = ''
        let fileData: Buffer | null = null
        let profile = ''
        let projectAlias = ''
        for (const p of parts) {
          const idx = p.indexOf('\r\n\r\n')
          if (idx === -1) continue
          const header = p.slice(0, idx)
          const content = p.slice(idx + 4)
          if (header.includes('name="file"')) {
            const m = header.match(/filename="([^"]+)"/)
            fileName = m ? m[1] : 'upload.zip'
            const endIdx = content.lastIndexOf('\r\n')
            const raw = content.slice(0, endIdx >= 0 ? endIdx : undefined)
            fileData = Buffer.from(raw, 'binary')
          } else if (header.includes('name="profile"')) {
            const endIdx = content.lastIndexOf('\r\n')
            profile = content.slice(0, endIdx >= 0 ? endIdx : undefined)
          } else if (header.includes('name="project_alias"')) {
            const endIdx = content.lastIndexOf('\r\n')
            projectAlias = content.slice(0, endIdx >= 0 ? endIdx : undefined).trim()
          }
        }
        if (!fileData) return send(res, 400, { ok: false })

        // 1. Validate Magic Bytes (Must be ZIP)
        if (!isZipFile(fileData)) {
          console.warn('[Security] Rejected upload: Invalid Magic Bytes (Not a ZIP)')
          return send(res, 400, { ok: false, error: 'Invalid file format. Only ZIP files are allowed.' })
        }

        // 2. VirusTotal Scan (Optional)
        const vtResult = await checkVirusTotal(fileData, process.env.VIRUSTOTAL_API_KEY)
        
        // Audit Log for Scan
        const clientIP = getClientIP(req)
        if (vtResult.safe) {
            // Log clean scan (optional, maybe only on verbose)
            dbQuery(
                `INSERT INTO securetag.security_event(id, tenant_id, event_type, file_hash, file_name, provider, status, reason, ip_address, user_agent) 
                 VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [uuidv4(), tenantId, 'file_scan', crypto.createHash('sha256').update(fileData).digest('hex'), fileName, 'virustotal', 'clean', 'Passed security check', clientIP, req.headers['user-agent']]
            ).catch(console.error)
        } else {
             // Log BLOCK event
             const eventId = uuidv4()
             await dbQuery(
                `INSERT INTO securetag.security_event(id, tenant_id, event_type, file_hash, file_name, provider, status, reason, ip_address, user_agent) 
                 VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [eventId, tenantId, 'file_blocked', crypto.createHash('sha256').update(fileData).digest('hex'), fileName, 'virustotal', 'malicious', vtResult.reason, clientIP, req.headers['user-agent']]
            )
            
            // Ban Entities (IP, API Key, Tenant)
            const reason = `Uploaded malicious file: ${fileName} (Event: ${eventId})`
            await banEntity('ip', clientIP, reason)
            
            // Also ban API Key if configured
            const apiKey = req.headers['x-api-key'] as string
            if (apiKey) {
                const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
                await banEntity('api_key', keyHash, reason)
            }

            // Also ban Tenant if configured
            if (tenantId) {
                await banEntity('tenant', tenantId, reason)
            }
            
            return send(res, 400, { ok: false, error: `Security check failed: ${vtResult.reason}` })
        }

        const taskId = uuidv4()
        const upDir = uploads
        const wkDir = path.join(work, taskId)
        fs.mkdirSync(upDir, { recursive: true })
        fs.mkdirSync(wkDir, { recursive: true })
        const zipPath = path.join(upDir, `${taskId}.zip`)
        fs.writeFileSync(zipPath, fileData)

        let projectId: string | null = null
        let previousTaskId: string | null = null
        let isRetest = false

        if (projectAlias) {
          try {
            // Upsert project
            let pq = await dbQuery<any>('SELECT id FROM securetag.project WHERE tenant_id=$1 AND alias=$2', [tenantId, projectAlias])
            if (pq.rows.length > 0) {
              projectId = pq.rows[0].id
            } else {
              const newId = uuidv4()
              await dbQuery('INSERT INTO securetag.project(id, tenant_id, alias, name) VALUES($1, $2, $3, $4) ON CONFLICT (tenant_id, alias) WHERE alias IS NOT NULL DO NOTHING', [newId, tenantId, projectAlias, projectAlias])
              pq = await dbQuery<any>('SELECT id FROM securetag.project WHERE tenant_id=$1 AND alias=$2', [tenantId, projectAlias])
              if (pq.rows.length > 0) projectId = pq.rows[0].id
            }

            if (projectId) {
              const prevQ = await dbQuery<any>('SELECT id FROM securetag.task WHERE project_id=$1 AND status=$2 AND type=$3 ORDER BY created_at DESC LIMIT 1', [projectId, 'completed', 'codeaudit'])
              if (prevQ.rows.length > 0) {
                previousTaskId = prevQ.rows[0].id
                isRetest = true
              }
            }
          } catch (err) {
            console.error('Error handling project alias:', err)
          }
        }

        try {
          await dbQuery('INSERT INTO securetag.task(id, tenant_id, type, status, payload_json, retries, priority, created_at, project_id, previous_task_id, is_retest) VALUES($1,$2,$3,$4,$5,$6,$7, now(), $8, $9, $10)',
            [taskId, tenantId, 'codeaudit', 'queued', JSON.stringify({ zipPath, workDir: wkDir, profile, previousTaskId }), 0, 0, projectId, previousTaskId, isRetest])
          await dbQuery('INSERT INTO securetag.codeaudit_upload(tenant_id, project_id, task_id, file_name, storage_path, size_bytes, created_at) VALUES($1,$2,$3,$4,$5,$6, now())', [tenantId, projectId, taskId, fileName, zipPath, size])
        } catch {
          return send(res, 503, { ok: false })
        }
        return send(res, 202, { ok: true, taskId, status: 'queued', projectId, isRetest })
      } catch (e: any) {
        return send(res, 400, { ok: false })
      }
    })
    return
  }
  if (method === 'POST' && url === '/queue/next') {
    // Authenticate request
    const authReq = req as AuthenticatedRequest
    const isAuthenticated = await authenticate(authReq, res)
    if (!isAuthenticated) return

    try {
      const tenantId = authReq.tenantId!
      const q = await dbQuery<any>('SELECT id, type, payload_json FROM securetag.task WHERE tenant_id=$1 AND status=$2 ORDER BY created_at LIMIT 1', [tenantId, 'queued'])
      if (!q.rows.length) return send(res, 204, { ok: true })
      const t = q.rows[0]
      await dbQuery('UPDATE securetag.task SET status=$1, started_at=now() WHERE id=$2', ['running', t.id])
      const obj = { id: t.id, type: t.type, status: 'running', retries: 0, startedAt: Date.now(), ...t.payload_json }
      return send(res, 200, { ok: true, task: obj })
    } catch {
      return send(res, 503, { ok: false })
    }
  }
  if (method === 'POST' && url === '/queue/result') {
    // Authenticate request
    const authReq = req as AuthenticatedRequest
    const isAuthenticated = await authenticate(authReq, res)
    if (!isAuthenticated) return

    const chunks: Buffer[] = []
    req.on('data', c => chunks.push(Buffer.from(c)))
    req.on('end', async () => {
      try {
        const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
        const tenantId = authReq.tenantId!
        const status = body.ok ? 'completed' : 'failed'
        await dbQuery('UPDATE securetag.task SET status=$1, finished_at=now() WHERE id=$2', [status, body.taskId])

        // Save result to scan_result table
        if (body.taskId) {
          try {
            // Check if result already exists (idempotency)
            const existing = await dbQuery('SELECT 1 FROM securetag.scan_result WHERE task_id=$1', [body.taskId])
            if (existing.rows.length === 0) {
              await dbQuery(
                'INSERT INTO securetag.scan_result(tenant_id, task_id, summary_json, created_at) VALUES($1, $2, $3, now())',
                [tenantId, body.taskId, JSON.stringify(body)]
              )
            }
          } catch (err) {
            console.error('Error saving scan result:', err)
          }
        }

        return send(res, 200, { ok: true })
      } catch (e: any) {
        return send(res, 400, { ok: false, error: String(e && e.message || e) })
      }
    })
    return
  }
  if (method === 'GET' && url?.startsWith('/scans/')) {
    // Authenticate request
    const authReq = req as AuthenticatedRequest
    const isAuthenticated = await authenticate(authReq, res)
    if (!isAuthenticated) return

    const tenantId = authReq.tenantId!
    const id = url.split('/').pop() || ''
    try {
      const tq = await dbQuery<any>('SELECT status, retries FROM securetag.task WHERE id=$1 AND tenant_id=$2 LIMIT 1', [id, tenantId])
      if (!tq.rows.length) {
        return send(res, 404, { ok: false })
      }
      const task = tq.rows[0]
      const status = task.status
      if (status === 'completed') {
        const rq = await dbQuery<any>('SELECT summary_json FROM securetag.scan_result WHERE task_id=$1 LIMIT 1', [id])
        const result = rq.rows.length ? rq.rows[0].summary_json : null
        return send(res, 200, { ok: true, status, taskId: id, result })
      }
      return send(res, 202, { ok: true, status, taskId: id, retries: task.retries || 0 })
    } catch {
      return send(res, 503, { ok: false })
    }
  }

  if (method === 'GET' && url === '/projects') {
    const authReq = req as AuthenticatedRequest
    const isAuthenticated = await authenticate(authReq, res)
    if (!isAuthenticated) return

    const tenantId = authReq.tenantId!
    try {
      const q = await dbQuery<any>('SELECT id, alias, name, description, created_at FROM securetag.project WHERE tenant_id=$1 ORDER BY created_at DESC', [tenantId])
      return send(res, 200, { ok: true, projects: q.rows })
    } catch {
      return send(res, 503, { ok: false })
    }
  }

  if (method === 'GET' && url.startsWith('/projects/')) {
    const authReq = req as AuthenticatedRequest
    const isAuthenticated = await authenticate(authReq, res)
    if (!isAuthenticated) return
    const tenantId = authReq.tenantId!

    const parts = url.split('/')
    // /projects/{id}/history
    if (parts.length >= 4 && parts[3] === 'history') {
      const idOrAlias = parts[2]
      try {
        let projectId = ''
        // Simple UUID validation regex
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrAlias)) {
          projectId = idOrAlias
        } else {
          const pq = await dbQuery<any>('SELECT id FROM securetag.project WHERE tenant_id=$1 AND alias=$2', [tenantId, idOrAlias])
          if (pq.rows.length) projectId = pq.rows[0].id
        }

        if (!projectId) return send(res, 404, { ok: false, error: 'Project not found' })

        const tq = await dbQuery<any>('SELECT id as "taskId", status, created_at, finished_at, is_retest, previous_task_id FROM securetag.task WHERE project_id=$1 ORDER BY created_at DESC', [projectId])
        return send(res, 200, { ok: true, projectId, history: tq.rows })
      } catch {
        return send(res, 503, { ok: false })
      }
    }
  }

  if (serveDocs(req, res)) return
  if (codeauditIndex(req, res)) return
  if (codeauditLatest(req, res)) return
  if (await codeauditDetail(req, res)) return
  return send(res, 404, { ok: false })
})

server.listen(port, () => {
  console.log(JSON.stringify({ event: 'server_start', port }))
})