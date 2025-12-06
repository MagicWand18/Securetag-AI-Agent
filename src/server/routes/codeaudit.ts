import http from 'http'
import fs from 'fs'
import path from 'path'
import { dbQuery, ensureTenant } from '../../utils/db.js'
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.js'



function escapeHtml(s: any) {
  const str = String(s || '')
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
function safeUrl(u: any) {
  const s = String(u || '')
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return '#'
}
function humanBytes(n: any) {
  const x = Number(n || 0)
  if (!isFinite(x) || x <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(x) / Math.log(1024)))
  const v = x / Math.pow(1024, i)
  return `${v.toFixed(1)} ${units[i]}`
}
function maskValue(key: string, value: string) {
  const k = key.toLowerCase()
  if (k.includes('secret') || k.includes('token') || k.includes('password') || k.includes('key')) return '***'
  if (/^[A-Za-z0-9]{32,}$/.test(value)) return '***'
  if (value.length > 256) return '***'
  return value
}
function bucketLabelEs(bucket: string) {
  const b = String(bucket || '').toLowerCase()
  if (b === 'critical') return 'Crítica'
  if (b === 'high') return 'Alta'
  if (b === 'medium') return 'Media'
  if (b === 'low') return 'Baja'
  return 'Info'
}
function levelToBucket(level: any) {
  const s = String(level || '').toUpperCase()
  if (s === 'CRITICAL') return 'critical'
  if (s === 'HIGH') return 'high'
  if (s === 'MEDIUM') return 'medium'
  if (s === 'LOW') return 'low'
  if (s === 'INFO') return 'info'
  return 'info'
}
function shortenPath(p: string) {
  const s = String(p || '')
  const i = s.indexOf('/juice-shop-master/')
  if (i >= 0) return s.slice(i + 1)
  const j = s.indexOf('/work/')
  if (j >= 0) {
    const rest = s.slice(j)
    const ix = rest.indexOf('/')
    if (ix >= 0) return rest.slice(ix + 1)
    return rest
  }
  const parts = s.split('/')
  if (parts.length > 3) return parts.slice(parts.length - 3).join('/')
  return s
}
function getProjectName(paths: any[]): string {
  for (const p of (paths || [])) {
    const s = String(p || '')
    const m = s.match(/\/work\/[^/]+\/([^/]+)\//)
    if (m && m[1]) return m[1]
  }
  return 'project'
}
type DirNode = { name: string, dirs: Map<string, DirNode>, files: Set<string> }
function makeNode(name: string): DirNode { return { name, dirs: new Map(), files: new Set() } }
function insertPath(root: DirNode, rel: string) {
  const parts = rel.split('/').filter(Boolean)
  if (!parts.length) return
  // first part should be project name; skip it for insertion under root
  if (parts[0] === root.name) parts.shift()
  let cur = root
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i]
    const isFile = i === parts.length - 1
    if (isFile) {
      cur.files.add(seg)
    } else {
      if (!cur.dirs.has(seg)) cur.dirs.set(seg, makeNode(seg))
      cur = cur.dirs.get(seg) as DirNode
    }
  }
}
function renderTree(node: DirNode, open = false): string {
  const dirs = Array.from(node.dirs.values()).sort((a, b) => a.name.localeCompare(b.name))
  const files = Array.from(node.files.values()).sort()
  const childrenHtml = [
    ...dirs.map(d => renderTree(d)),
    files.length ? (`<ul>` + files.map(f => `<li class="file">${escapeHtml(f)}</li>`).join('') + `</ul>`) : ''
  ].join('')
  return `<details${open ? ' open' : ''}><summary class="folder">${escapeHtml(node.name)}</summary>${childrenHtml}</details>`
}
function truncateSnippet(s: string, max = 1200) {
  if (!s) return ''
  const str = String(s)
  if (str.length <= max) return str
  return str.slice(0, max) + '...'
}
function flatTimes(prefix: string, obj: any): string[] {
  const out: string[] = []
  if (!obj || typeof obj !== 'object') return out
  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k]
    if (v == null) continue
    if (typeof v === 'object') {
      out.push(...flatTimes(`${prefix}${k}.`, v))
    } else {
      out.push(`${prefix}${escapeHtml(k)}: <strong>${escapeHtml(String(v))}</strong> ms`)
    }
  }
  return out
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

export function codeauditIndex(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const method = req.method || 'GET'
  const url = req.url || '/'
  if (!(method === 'GET' && url.startsWith('/codeaudit/index'))) return false
  const tenant = process.env.TENANT_ID || 'default'

  ensureTenant(tenant).then(async (tenantId) => {
    try {
      const q = await dbQuery<any>('SELECT id, status, created_at, finished_at, payload_json FROM securetag.task WHERE tenant_id=$1 AND type=$2 ORDER BY created_at DESC', [tenantId, 'codeaudit'])
      const list = q.rows
      const rows = list.map((t: any, idx: number) => {
        const id = escapeHtml(t.id)
        const status = escapeHtml(t.status)
        const start = t.started_at ? new Date(t.started_at).getTime() : 0
        const end = t.finished_at ? new Date(t.finished_at).getTime() : 0
        const dur = (start && end) ? String(end - start) : ''
        const when = String(t.finished_at || t.created_at || '')
        return `<tr><td>${idx + 1}</td><td><a href="/codeaudit/${id}.html">${id}</a></td><td>${status}</td><td>${dur}</td><td>${when}</td></tr>`
      }).join('')
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Code Audit Index</title><style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}th{background:#f4f4f4;text-align:left}</style></head><body><h1>Listado de auditorías de código</h1><p>Tenant: <code>${escapeHtml(tenant)}</code></p><p><a href="/codeaudit/latest">Último ID (JSON)</a> · <a href="/codeaudit/latest?format=html">Último (HTML)</a></p><table><thead><tr><th>#</th><th>Task ID</th><th>Estado</th><th>Duración (ms)</th><th>Fecha</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Sin tareas</td></tr>'}</tbody></table></body></html>`
      sendHtml(res, 200, html)
    } catch (e) {
      send(res, 503, { ok: false })
    }
  })
  return true
}

export function codeauditLatest(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const method = req.method || 'GET'
  const url = req.url || '/'
  if (!(method === 'GET' && url === '/codeaudit/latest')) return false
  const tenant = process.env.TENANT_ID || 'default'
  const htmlReq = (req.headers['accept'] || '').includes('text/html') || (req.url || '').includes('format=html')

  ensureTenant(tenant).then(async (tenantId) => {
    try {
      const q = await dbQuery<any>('SELECT id FROM securetag.task WHERE tenant_id=$1 AND type=$2 AND status=$3 ORDER BY finished_at DESC LIMIT 1', [tenantId, 'codeaudit', 'completed'])
      if (!q.rows.length) { send(res, 404, { ok: false }); return }
      const t = q.rows[0]
      if (!htmlReq) { send(res, 200, { ok: true, taskId: t.id }); return }
      res.statusCode = 302
      res.setHeader('Location', `/codeaudit/${t.id}.html`)
      res.end()
    } catch (e) {
      send(res, 503, { ok: false })
    }
  })
  return true
}

export async function codeauditDetail(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
  const method = req.method || 'GET'
  const url = req.url || '/'
  if (!(method === 'GET' && url.startsWith('/codeaudit/'))) return false
  
  let id = url.split('/').pop() || ''
  const htmlReq = (req.headers['accept'] || '').includes('text/html') || url.includes('format=html') || id.endsWith('.html')
  if (id.endsWith('.html')) id = id.replace(/\.html$/, '')

  // Determine Tenant ID
  let tenantId = ''
  // 1. Try authentication via header (if provided)
  if (req.headers['x-api-key']) {
    const authReq = req as AuthenticatedRequest
    // authenticate writes 401 to res if fails, so we need to be careful.
    // But here we want to allow fallback if auth fails? No, if key provided but invalid -> 401.
    // If no key -> fallback to default tenant.
    const isAuthenticated = await authenticate(authReq, res)
    if (!isAuthenticated) return true // Response already sent
    tenantId = authReq.tenantId!
  } else {
    // 2. Fallback to environment variable
    const tenant = process.env.TENANT_ID || 'default'
    try {
      tenantId = await ensureTenant(tenant)
    } catch (e) {
      console.error('ensureTenant failed:', e)
      // If ensureTenant fails, we can't proceed
    }
  }

  if (!tenantId) {
     // Should have been handled by ensureTenant catch or authenticate
     send(res, 500, { ok: false, error: 'Tenant identification failed' })
     return true
  }

  let dbTask: any = null
  try {
    const tq = await dbQuery<any>('SELECT id, status, started_at, finished_at FROM securetag.task WHERE id=$1 AND tenant_id=$2 AND type=$3 LIMIT 1', [id, tenantId, 'codeaudit'])
    dbTask = tq.rows.length ? tq.rows[0] : null
  } catch (e) { 
    console.error('Error fetching task:', e)
  }
  if (dbTask) {
    if (!htmlReq) {
      if (dbTask.status === 'completed') {
        let summary: any = {}
        let findings: any[] = []
        let diff: any = null
        try {
          const sr = await dbQuery<any>('SELECT summary_json FROM securetag.scan_result WHERE task_id=$1 LIMIT 1', [id])
          summary = sr.rows.length ? (sr.rows[0].summary_json || {}) : {}
        } catch { }
        try {
          const f = await dbQuery<any>('SELECT rule_id, rule_name, severity, cwe, cve, file_path, line, fingerprint, analysis_json FROM securetag.finding WHERE task_id=$1 ORDER BY created_at DESC', [id])
          findings = f.rows
        } catch { }

        // Logic for Retest Diffing
        try {
          // Check if this task is a retest
          const tq = await dbQuery<any>('SELECT is_retest, previous_task_id FROM securetag.task WHERE id=$1', [id])
          const taskInfo = tq.rows[0]
          if (taskInfo && taskInfo.is_retest && taskInfo.previous_task_id) {
            // Fetch findings from previous task
            const pf = await dbQuery<any>('SELECT fingerprint FROM securetag.finding WHERE task_id=$1', [taskInfo.previous_task_id])
            const prevFingerprints = new Set(pf.rows.map((r: any) => r.fingerprint).filter(Boolean))
            const currentFingerprints = new Set(findings.map((f: any) => f.fingerprint).filter(Boolean))

            let fixedCount = 0
            let newCount = 0
            let residualCount = 0

            // Determine status for current findings
            for (const finding of findings) {
               if (finding.fingerprint) {
                 if (prevFingerprints.has(finding.fingerprint)) {
                   finding.retest_status = 'residual'
                   residualCount++
                 } else {
                   finding.retest_status = 'new'
                   newCount++
                 }
               }
            }

            // Count fixed (in previous but not in current)
            for (const fp of prevFingerprints) {
              if (!currentFingerprints.has(fp)) {
                fixedCount++
              }
            }
            
            diff = {
              fixed: fixedCount,
              new: newCount,
              residual: residualCount,
              previousTaskId: taskInfo.previous_task_id
            }
          }
        } catch (e) {
          console.error('Error calculating diff:', e)
        }

        // Sanitize response for client (remove internal fields)
        const sanitizedFindings = findings.map((f: any) => {
            // Clean file path (just in case DB has absolute path)
            let cleanPath = f.file_path || ''
            const workIdx = cleanPath.indexOf('/work/')
            if (workIdx >= 0) {
                const afterWork = cleanPath.slice(workIdx + 6)
                const slashIdx = afterWork.indexOf('/')
                if (slashIdx >= 0) cleanPath = afterWork.slice(slashIdx + 1)
            }

            return {
                rule_name: f.rule_name,
                severity: f.severity,
                cwe: f.cwe,
                cve: f.cve,
                file_path: cleanPath,
                line: f.line,
                analysis_json: f.analysis_json,
                retest_status: f.retest_status
            }
        })

        send(res, 200, { ok: true, status: dbTask.status, taskId: id, result: { summary, findings: sanitizedFindings, diff } })
        return true
      }
      send(res, 202, { ok: true, status: dbTask.status, taskId: id })
      return true
    }
    if (dbTask.status !== 'completed') {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Code Audit</title><style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}th{background:#f4f4f4;text-align:left}code{background:#f6f8fa;padding:2px 4px;border-radius:4px}</style></head><body><h1>Auditoría de código</h1><p>Estado: ${escapeHtml(dbTask.status)}</p><p>Task ID: <code>${escapeHtml(id)}</code></p></body></html>`
      sendHtml(res, 200, html)
      return true
    }
    let rowsDb: any[] = []
    let summaryJson: any = null
    try {
      const f = await dbQuery<any>('SELECT rule_id, rule_name, severity, cwe, cve, file_path, line, fingerprint FROM securetag.finding WHERE task_id=$1 ORDER BY created_at DESC', [id])
      rowsDb = f.rows
      if (rowsDb.length === 0) {
        const sr = await dbQuery<any>('SELECT summary_json FROM securetag.scan_result WHERE task_id=$1 LIMIT 1', [id])
        if (sr.rows.length > 0) summaryJson = sr.rows[0].summary_json
      }
    } catch { }

    let items: any[] = []
    let rulesCount = 0
    let sg: any = {}

    if (rowsDb.length > 0) {
      items = rowsDb.map((row: any) => {
        const sev = String(row.severity || '').toLowerCase()
        const sevMap = sev === 'high' || sev === 'critical' ? 'ERROR' : (sev === 'medium' ? 'WARNING' : 'INFO')
        const impact = sev === 'critical' ? 'CRITICAL' : ''
        
        // Clean path to be relative (remove internal work/taskId structure)
        let cleanPath = row.file_path || ''
        const workIdx = cleanPath.indexOf('/work/')
        if (workIdx >= 0) {
          const afterWork = cleanPath.slice(workIdx + 6) // skip '/work/'
          const slashIdx = afterWork.indexOf('/')
          if (slashIdx >= 0) {
            cleanPath = afterWork.slice(slashIdx + 1) // skip taskId
          }
        }

        return {
          path: cleanPath,
          start: { line: row.line || null },
          // Hiding internal rule_id as requested
          // check_id: row.rule_id || '', 
          extra: {
            message: row.rule_name || row.rule_id || '',
            severity: sevMap,
            metadata: { cwe: row.cwe || '', cve: row.cve || '', impact, likelihood: '', references: [] },
            // Hiding internal fingerprint as requested
            // fingerprint: row.fingerprint || '',
            validation_state: ''
          }
        }
      })
      const scanned = Array.from(new Set(items.map((it: any) => String(it.path || '').trim()).filter(Boolean)))
      rulesCount = Array.from(new Set(items.map((it: any) => String(it.extra?.message || '')).filter(Boolean))).length
    } else if (summaryJson) {
      // Fallback to summary_json if findings table is empty
      sg = summaryJson
      // Try to parse stdout if it exists and is a string (legacy format)
      if (typeof sg.stdout === 'string') {
        try { sg = JSON.parse(sg.stdout) } catch { }
      }

      items = Array.isArray(sg.results) ? sg.results : []
      rulesCount = Array.isArray(sg?.time?.rules) ? sg.time.rules.length : 0
      if (!rulesCount) rulesCount = Array.isArray(sg?.profiling_results) ? sg.profiling_results.length : 0
      if (!rulesCount) {
        const uniq = new Set(items.map((it: any) => String(it?.check_id || '')))
        rulesCount = uniq.size + (Array.isArray(sg?.skipped_rules) ? sg.skipped_rules.length : 0)
      }
    }

    const scanned = Array.from(new Set(items.map((it: any) => String(it.path || '').trim()).filter(Boolean)))
    const filesCount = scanned.length
    const errors: any[] = sg?.errors || [] // Only available if from summary_json

    const summary = { total: items.length, critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    for (const it of items) {
      const sevRaw = String(it?.extra?.severity || '').toUpperCase()
      const impact = String(it?.extra?.metadata?.impact || '').toUpperCase()
      const likelihood = String(it?.extra?.metadata?.likelihood || '').toUpperCase()
      const top25 = Boolean(it?.extra?.metadata?.cwe2022_top25 || it?.extra?.metadata?.cwe2022Top25 || it?.extra?.metadata?.cwe2021_top25 || it?.extra?.metadata?.cwe2021Top25 || it?.extra?.metadata?.cwe2021_top_25 || it?.extra?.metadata?.cwe2022_top_25)
      let bucket = 'info'
      if (sevRaw === 'ERROR') bucket = 'high'
      else if (sevRaw === 'WARNING') bucket = 'medium'
      else if (sevRaw === 'INFO') bucket = 'low'
      if (impact === 'CRITICAL' || (impact === 'HIGH' && likelihood === 'HIGH') || top25) bucket = 'critical'
      if (bucket === 'critical') summary.critical++
      else if (bucket === 'high') summary.high++
      else if (bucket === 'medium') summary.medium++
      else if (bucket === 'low') summary.low++
      else summary.info++
        ; (it as any).__bucket = bucket
    }
    const rows = items.map((it: any, idx: number) => {
      const s = String((it as any).__bucket || 'info')
      const pathStr = escapeHtml(it?.path || '')
      const line = it?.start?.line ? String(it.start.line) : ''
      const msg = escapeHtml(it?.extra?.message || it?.check_id || '')
      const vclassRaw = it?.extra?.metadata?.vulnerability_class
      const cls = Array.isArray(vclassRaw) ? escapeHtml(vclassRaw.map((x: any) => String(x)).join(', ')) : escapeHtml(String(vclassRaw || ''))
      const sevHtml = `<span class="badge severity-${escapeHtml(s)}">${escapeHtml(bucketLabelEs(s))}</span>`
      const cveRaw = it?.extra?.metadata?.cve || it?.extra?.metadata?.cve_id || it?.extra?.metadata?.cve_ids || ''
      const cveStr = Array.isArray(cveRaw) ? cveRaw.map((x: any) => String(x)).join(', ') : String(cveRaw || '')
      const cweRaw = it?.extra?.metadata?.cwe || it?.extra?.metadata?.cwe_id || ''
      const cweStr = Array.isArray(cweRaw) ? cweRaw.map((x: any) => String(x)).join(', ') : String(cweRaw || '')
      const confRaw = String(it?.extra?.metadata?.confidence || '')
      const likRaw = String(it?.extra?.metadata?.likelihood || '')
      const impRaw = String(it?.extra?.metadata?.impact || '')
      const confB = levelToBucket(confRaw)
      const likB = levelToBucket(likRaw)
      const impB = levelToBucket(impRaw)
      const conf = `<span class="badge severity-${escapeHtml(confB)}">${escapeHtml(bucketLabelEs(confB))}</span>`
      const lik = `<span class="badge severity-${escapeHtml(likB)}">${escapeHtml(bucketLabelEs(likB))}</span>`
      const imp = `<span class="badge severity-${escapeHtml(impB)}">${escapeHtml(bucketLabelEs(impB))}</span>`
      const refsList: string[] = []
      const metaRefs = Array.isArray(it?.extra?.metadata?.references) ? it.extra.metadata.references : []
      for (const u of metaRefs) { if (u) refsList.push(String(u)) }
      if (cweStr) {
        const ids = cweStr.split(/[\,\s]+/).map(s => s.replace(/^CWE-?/i, '').trim()).filter(Boolean)
        for (const idc of ids) refsList.push(`https://cwe.mitre.org/data/definitions/${encodeURIComponent(idc)}.html`)
      }
      const owaspRaw = it?.extra?.metadata?.owasp || it?.extra?.metadata?.owasp_top_10 || ''
      const owaspList = Array.isArray(owaspRaw) ? owaspRaw.map((x: any) => String(x)) : (String(owaspRaw || '') ? [String(owaspRaw)] : [])
      for (const _ of owaspList) refsList.push('https://owasp.org/Top10/')
      const refsDedup = Array.from(new Set(refsList.filter(Boolean)))
      const refsHtml = refsDedup.length ? refsDedup.map(u => `<a href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${escapeHtml(u)}</a>`).join('<br/>') : ''
      const row1h = `<tr><td rowspan="4">${idx + 1}</td><th>Archivo</th><th>Mensaje</th><th>Clase</th><th>Severidad</th><th>CVE</th></tr>`
      const row2d = `<tr><td>${escapeHtml(shortenPath(pathStr))}${line ? ':' + escapeHtml(line) : ''}</td><td>${msg}</td><td>${cls}</td><td class="center">${sevHtml}</td><td>${escapeHtml(cveStr)}</td></tr>`
      const row3h = `<tr><th>CWE</th><th>Confianza</th><th>Probabilidad</th><th>Impacto</th><th>Referencias</th></tr>`
      const row4d = `<tr><td>${escapeHtml(cweStr)}</td><td class="center">${conf}</td><td class="center">${lik}</td><td class="center">${imp}</td><td>${refsHtml}</td></tr>`
      return row1h + row2d + row3h + row4d
    }).join('')

    const perfPieces: string[] = []
    if (sg?.time?.ran) perfPieces.push(`Tiempo de ejecución: <strong>${escapeHtml(String(sg.time.ran))}</strong>`)
    perfPieces.push(`Reglas: <strong>${escapeHtml(String(rulesCount))}</strong>`)
    const performanceHtml = perfPieces.join('<br/>')
    const errorsHtml = errors.length ? (`<table style="width:100%;border-collapse:collapse"><thead><tr><th>Código</th><th>Nivel</th><th>Tipo</th><th>Mensaje</th><th>Path</th></tr></thead><tbody>` + errors.map((e: any) => {
      const code = escapeHtml(String(e?.code || ''))
      const level = escapeHtml(String(e?.level || ''))
      const type = escapeHtml(String(e?.type || ''))
      const msg = escapeHtml(String(e?.message || ''))
      const p = escapeHtml(String(e?.path || ''))
      return `<tr><td>${code}</td><td>${level}</td><td>${type}</td><td>${msg}</td><td>${p}</td></tr>`
    }).join('') + `</tbody></table>`) : 'Sin errores'
    const tplPath = path.join(process.cwd(), 'src/server/views/codeaudit.html')
    let tpl = ''
    try { tpl = fs.readFileSync(tplPath, 'utf8') } catch { tpl = '' }
    if (!tpl) { sendHtml(res, 200, `<html><body>Plantilla no encontrada</body></html>`); return true }
    const html = tpl
      .replace(/\{\{STATUS\}\}/g, escapeHtml(dbTask.status))
      .replace(/\{\{TASK_ID\}\}/g, escapeHtml(id))
      .replace(/\{\{VERSION\}\}/g, escapeHtml(String(sg?.version || '')))
      .replace(/\{\{TENANT\}\}/g, escapeHtml(String(tenantId)))
      .replace(/\{\{DURATION_S\}\}/g, escapeHtml(String(((Number(0)) / 1000).toFixed(2))))
      .replace(/\{\{TOTAL\}\}/g, String(summary.total))
      .replace(/\{\{CRITICAL\}\}/g, String(summary.critical))
      .replace(/\{\{HIGH\}\}/g, String(summary.high))
      .replace(/\{\{MEDIUM\}\}/g, String(summary.medium))
      .replace(/\{\{LOW\}\}/g, String(summary.low))
      .replace(/\{\{INFO\}\}/g, String(summary.info))
      .replace(/\{\{FILES_COUNT\}\}/g, String(filesCount))
      .replace(/\{\{RULES_COUNT\}\}/g, String(rulesCount))
      .replace(/\{\{ROWS\}\}/g, rows || '<tr><td colspan="9">Sin hallazgos</td></tr>')
      .replace(/\{\{FILES_TREE\}\}/g, (() => {
        const project = getProjectName(scanned)
        const root = makeNode(project)
        for (const p of scanned) {
          const s = String(p || '')
          const idx = s.indexOf(`/${project}/`)
          const rel = idx >= 0 ? s.slice(idx + 1) : s
          insertPath(root, rel)
        }
        return renderTree(root)
      })())
    sendHtml(res, 200, html)
    return true
  }

  // Fallback if task not found in DB (should not happen if we are DB only, but for safety)
  send(res, 404, { ok: false })
  return true
}