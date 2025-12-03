import { ExternalToolManager } from '../agent/tools/ExternalToolManager.js'
import { dbQuery, ensureTenant, updateTaskState } from '../utils/db.js'
import { HeartbeatManager } from './HeartbeatManager.js'
import { LLMClient } from './LLMClient.js'
import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { logger } from '../utils/logger.js'

export class TaskExecutor {
    private heartbeatManager: HeartbeatManager
    private llmClient: LLMClient
    private taskTimeouts: Map<string, number> = new Map([
        ['codeaudit', 300000], // 5 minutes
        ['web', 60000]         // 1 minute
    ])

    constructor(workerId?: string) {
        this.heartbeatManager = new HeartbeatManager(workerId)
        this.llmClient = new LLMClient()
    }

    async execute(job: any): Promise<any> {
        const tenant = process.env.TENANT_ID || 'default'
        const started = Date.now()
        const taskId = job.id || job.taskId

        try {
            // Start heartbeat
            await this.heartbeatManager.start(taskId)

            // Get timeout for this task type
            const timeout = this.getTimeout(job.type)

            // Execute with timeout
            const result = await this.executeWithTimeout(
                async () => {
                    if (job.type === 'codeaudit') {
                        return await this.executeSemgrep(job, tenant, started)
                    } else {
                        return await this.executeHttpx(job, tenant, started)
                    }
                },
                timeout,
                taskId
            )

            // Stop heartbeat with success status
            await this.heartbeatManager.stop('completed')
            return result

        } catch (err: any) {
            logger.error(`Task execution failed: ${err.message}`)

            // Determine failure type
            const isTimeout = err.message.includes('timeout')
            const status = isTimeout ? 'timeout' : 'failed'

            // Update task state
            await updateTaskState(taskId, status)

            // Stop heartbeat with failure status
            await this.heartbeatManager.stop(status as any)

            return {
                ok: false,
                status,
                taskId,
                tenant,
                error: err.message,
                durationMs: Date.now() - started
            }
        }
    }

    private getTimeout(taskType: string): number {
        // Check for env var override
        const envKey = `TASK_TIMEOUT_${taskType.toUpperCase()}`
        const envTimeout = process.env[envKey]
        if (envTimeout) {
            return parseInt(envTimeout, 10)
        }

        return this.taskTimeouts.get(taskType) || 300000 // Default 5 minutes
    }

    private async executeWithTimeout<T>(
        fn: () => Promise<T>,
        timeoutMs: number,
        taskId: string
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Task ${taskId} exceeded timeout of ${timeoutMs}ms`))
            }, timeoutMs)

            fn()
                .then((result) => {
                    clearTimeout(timer)
                    resolve(result)
                })
                .catch((err) => {
                    clearTimeout(timer)
                    reject(err)
                })
        })
    }

    private async executeSemgrep(job: any, tenant: string, started: number): Promise<any> {
        const av = await ExternalToolManager.isAvailable('semgrep')
        if (!av) throw new Error('semgrep not available')

        const zipPath = job.zipPath
        const workDir = job.workDir

        await new Promise<void>((resolve, reject) => {
            fs.mkdirSync(workDir, { recursive: true })
            const p = execFile('unzip', ['-q', '-o', zipPath, '-d', workDir])
            p.on('exit', (code) => {
                if (code === 0) resolve()
                else reject(new Error(`unzip failed with code ${code}`))
            })
            p.on('error', reject)
        })

        const prof = (job.profile && job.profile.trim().toLowerCase() === 'auto') ? 'auto' : 'auto'
        const args = ['scan', '--json', '--quiet', '--config', prof, '--exclude', '__MACOSX/**', '--exclude', '**/._*', '--exclude', '**/.DS_Store', workDir]

        const result = await ExternalToolManager.execute('semgrep', args, { timeout: 300000 })
        const finished = Date.now()

        // DB Operations
        const tenantId = await ensureTenant(tenant)
        const taskId = job.id || job.taskId

        await this.ensureTaskExists(taskId, tenantId, 'codeaudit', job)

        const resDir = process.env.RESULTS_DIR || `/var/securetag/${tenant}/results`
        const outDir = path.join(resDir, taskId)
        fs.mkdirSync(outDir, { recursive: true })
        const semgrepFile = path.join(outDir, 'semgrep.json')
        fs.writeFileSync(semgrepFile, (result.stdout || '').toString())

        await dbQuery('INSERT INTO securetag.tool_execution(tenant_id, task_id, tool, args_json, exit_code, started_at, finished_at, stdout_ref, stderr_ref, metrics_json) VALUES($1,$2,$3,$4,$5, to_timestamp($6/1000.0), to_timestamp($7/1000.0), $8, $9, $10)',
            [tenantId, taskId, 'semgrep', JSON.stringify({ command: 'semgrep', flags: args, target: workDir }), result.exitCode || 1, started, finished, semgrepFile, '', JSON.stringify({ durationMs: finished - started })])

        // Parse findings
        let findingsCount = 0
        let summary = { info: 0, low: 0, medium: 0, high: 0, critical: 0 }

        try {
            const payload = result.stdout ? JSON.parse(result.stdout) : null
            const items: any[] = payload && Array.isArray(payload.results) ? payload.results : []

            for (let i = 0; i < items.length; i++) {
                const it: any = items[i]
                const sevRaw = (it.extra && it.extra.severity) || ''
                const sevUpper = sevRaw.toUpperCase()
                let sev = 'low'
                if (sevUpper === 'INFO') sev = 'info'
                else if (sevUpper === 'WARNING') sev = 'medium'
                else if (sevUpper === 'ERROR') sev = 'high'
                else if (sevUpper === 'CRITICAL') sev = 'critical'
                summary = { ...summary, [sev]: (summary as any)[sev] + 1 }

                const ruleId = it.check_id || ''
                const ruleName = (it.extra && it.extra.message) || ruleId
                const filePath = it.path || ''
                const line = (it.start && it.start.line) || null
                const fingerprint = (it.extra && it.extra.fingerprint) || `${ruleId}:${filePath}:${line}`
                const cwe = it.extra && it.extra.metadata && it.extra.metadata.cwe ? String(it.extra.metadata.cwe) : null
                const cve = it.extra && it.extra.metadata && it.extra.metadata.cve ? String(it.extra.metadata.cve) : null
                const codeSnippet = (it.extra && it.extra.lines) || null

                // LLM Analysis
                let analysis = null
                // Analyze ALL findings regardless of severity
                try {
                    analysis = await this.llmClient.analyzeFinding({
                        rule_id: ruleId,
                        rule_name: ruleName,
                        file_path: filePath,
                        line: line,
                        code_snippet: codeSnippet,
                        severity: sev
                    })
                } catch (err: any) {
                    logger.error(`Failed to analyze finding ${fingerprint}`, err)
                    // Optionally log to a DB table for errors if needed, 
                    // for now we rely on the worker logs and the fact that analysis is null.
                }

                await dbQuery('INSERT INTO securetag.finding(tenant_id, task_id, source_tool, rule_id, rule_name, severity, category, cwe, cve, file_path, line, fingerprint, evidence_ref, created_at, analysis_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now(), $14)',
                    [tenantId, taskId, 'semgrep', ruleId, ruleName, sev, 'code', cwe, cve, filePath, line, fingerprint, `${semgrepFile}#${i}`, analysis ? JSON.stringify(analysis) : null])
                findingsCount++
            }
        } catch (err) {
            logger.error(`Failed to parse semgrep results: ${err}`)
        }

        await dbQuery('INSERT INTO securetag.scan_result(tenant_id, task_id, summary_json, storage_path, created_at) VALUES($1,$2,$3,$4, now()) ON CONFLICT (task_id) DO UPDATE SET summary_json=EXCLUDED.summary_json, storage_path=EXCLUDED.storage_path',
            [tenantId, taskId, JSON.stringify({ findingsCount, severity: summary }), semgrepFile])

        // Update task state to completed
        await updateTaskState(taskId, 'completed')

        return {
            ok: result.exitCode === 0,
            status: result.exitCode === 0 ? 'completed' : 'failed',
            taskId,
            tool: 'semgrep',
            tenant,
            durationMs: Date.now() - started,
            stdout: result.stdout
        }
    }

    private async executeHttpx(job: any, tenant: string, started: number): Promise<any> {
        const ok = await ExternalToolManager.isAvailable('httpx')
        if (!ok) throw new Error('httpx not available')

        const args = ['-version']
        const result = await ExternalToolManager.execute('httpx', args, { timeout: 30000 })
        const finished = Date.now()

        const tenantId = await ensureTenant(tenant)
        const taskId = job.id || job.taskId

        await this.ensureTaskExists(taskId, tenantId, job.type || 'web', job)

        await dbQuery('INSERT INTO securetag.tool_execution(tenant_id, task_id, tool, args_json, exit_code, started_at, finished_at, stdout_ref, stderr_ref, metrics_json) VALUES($1,$2,$3,$4,$5, to_timestamp($6/1000.0), to_timestamp($7/1000.0), $8, $9, $10)',
            [tenantId, taskId, 'httpx', JSON.stringify({ command: 'httpx', flags: args }), result.exitCode || 1, started, finished, '', '', JSON.stringify({ durationMs: finished - started })])

        // Update task state to completed
        await updateTaskState(taskId, 'completed')

        return {
            ok: result.exitCode === 0,
            status: 'completed',
            taskId,
            tool: 'httpx',
            tenant,
            durationMs: finished - started,
            stdout: result.stdout.split('\n').slice(0, 5)
        }
    }

    private async ensureTaskExists(taskId: string, tenantId: string, type: string, job: any) {
        const exists = await dbQuery('SELECT 1 FROM securetag.task WHERE id=$1 LIMIT 1', [taskId])
        if (!exists.rows.length) {
            await dbQuery('INSERT INTO securetag.task(id, tenant_id, type, status, payload_json, retries, priority, created_at, started_at) VALUES($1,$2,$3,$4,$5,$6,$7, now(), now())',
                [taskId, tenantId, type, 'running', JSON.stringify(job), 0, 0])
        }
    }
}
