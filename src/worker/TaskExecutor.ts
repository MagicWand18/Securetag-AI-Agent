import { WorkerClient } from './WorkerClient.js'
import { ExternalToolManager } from '../utils/ExternalToolManager.js'
import { dbQuery, ensureTenant, updateTaskState } from '../utils/db.js'
import { banEntity } from '../server/security.js'
import { HeartbeatManager } from './HeartbeatManager.js'
import { LLMClient } from './LLMClient.js'
import { ContextAnalyzer } from './ContextAnalyzer.js'
import { ExternalAIService } from './services/ExternalAIService.js'
import { CustomRuleGenerator } from './services/CustomRuleGenerator.js'
import { CreditsManager } from './services/CreditsManager.js'
import { ResearchOrchestrator } from './services/research/ResearchOrchestrator.js'
import { CrossFileAnalyzer } from './services/CrossFileAnalyzer.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execFile } from 'child_process'
import { logger } from '../utils/logger.js'

export class TaskExecutor {
    private heartbeatManager: HeartbeatManager
    private llmClient: LLMClient
    private contextAnalyzer: ContextAnalyzer
    private workerClient: WorkerClient
    private externalAIService: ExternalAIService
    private crossFileAnalyzer: CrossFileAnalyzer
    private creditsManager: CreditsManager
    private taskTimeouts: Map<string, number> = new Map([
        ['codeaudit', 300000], // 5 minutes
        ['web', 60000],        // 1 minute
        ['research', 14400000]  // 4 hours (Research Pipeline)
    ])

    constructor(workerId?: string) {
        this.heartbeatManager = new HeartbeatManager(workerId)
        this.llmClient = new LLMClient()
        this.contextAnalyzer = new ContextAnalyzer()
        this.workerClient = new WorkerClient()
        this.externalAIService = new ExternalAIService()
        this.crossFileAnalyzer = new CrossFileAnalyzer()
        this.creditsManager = new CreditsManager()
    }

    async execute(job: any): Promise<any> {
        const tenant = job.tenantId || process.env.TENANT_ID || 'default'
        const started = Date.now()
        const taskId = job.id || job.taskId

        logger.info(`Starting execution for task ${taskId} with job data keys: ${Object.keys(job).join(', ')}`)
        logger.info(`Job Payload Debug: custom_rule_model=${job.custom_rule_model}, config=${JSON.stringify(job.custom_rules_config)}`)

        try {
            // Start heartbeat
            await this.heartbeatManager.start(taskId)

            // Get timeout for this task type
            let timeout = this.getTimeout(job.type)

            // Dynamic Timeout Extension for Custom Rules
            // Each rule can take 2-3 minutes (generation + validation + retries)
            if (job.custom_rules || (job.custom_rules_config && job.custom_rules_config.enabled)) {
                const qty = job.custom_rules_qty || (job.custom_rules_config && job.custom_rules_config.qty) || 3;
                const extraTime = qty * 180000; // 3 minutes per rule
                timeout += extraTime;
                logger.info(`Extended timeout by ${extraTime}ms for ${qty} custom rules. New timeout: ${timeout}ms`);
            }

            // Execute with timeout
            const result = await this.executeWithTimeout(
                async (heartbeat) => {
                    if (job.type === 'codeaudit') {
                        return await this.executeSemgrep(job, tenant, started, heartbeat)
                    } else if (job.type === 'research') {
                        return await this.executeResearch(job, tenant, started)
                    } else {
                        throw new Error(`Unknown task type: ${job.type}`)
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

            // Refund credits if task failed and cost is known
            if (job.totalCost && job.totalCost > 0) {
                 logger.info(`Task ${taskId} failed/timeout. Refunding ${job.totalCost} credits to tenant ${tenant}.`);
                 await this.creditsManager.refundCredits(tenant, job.totalCost, `Refund for failed task ${taskId}`);
            }

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

    private async executeResearch(job: any, tenant: string, started: number): Promise<any> {
        logger.info('Starting Automated Research Pipeline...')
        
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is required for research tasks')
        }

        const orchestrator = new ResearchOrchestrator(apiKey)
        await orchestrator.runPipeline()

        return {
            ok: true,
            status: 'completed',
            taskId: job.id || job.taskId,
            tenant,
            data: { message: 'Research Pipeline Completed Successfully' },
            durationMs: Date.now() - started
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
        fn: (heartbeat: () => void) => Promise<T>,
        timeoutMs: number,
        taskId: string
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            let timer: NodeJS.Timeout

            const startTimer = () => {
                if (timer) clearTimeout(timer)
                timer = setTimeout(() => {
                    reject(new Error(`Task ${taskId} exceeded timeout of ${timeoutMs}ms`))
                }, timeoutMs)
            }

            const heartbeat = () => {
                startTimer()
                logger.info(`Task ${taskId} heartbeat received. Timeout reset to ${timeoutMs}ms.`)
            }

            startTimer()

            fn(heartbeat)
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

    private async executeSemgrep(job: any, tenant: string, started: number, heartbeat: () => void): Promise<any> {
        const taskId = job.id || job.taskId
        const tenantId = await ensureTenant(tenant)
        
        // --- PHASE 1: PREPARATION (0-10%) ---
        await this.workerClient.reportProgress(taskId, 5, null)
        
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

        const filesScannedCount = this.countFiles(workDir);
        logger.info(`Scanned ${filesScannedCount} files in ${workDir}`);

        // Debug: List files in workDir
        try {
            const files = fs.readdirSync(workDir);
            logger.info(`[Debug] Files in workDir (${workDir}): ${files.join(', ')}`);
            // Check subdirs if only one
            if (files.length === 1) {
                const sub = path.join(workDir, files[0]);
                if (fs.statSync(sub).isDirectory()) {
                     logger.info(`[Debug] Files in subdir (${files[0]}): ${fs.readdirSync(sub).join(', ')}`);
                }
            }
        } catch (e: any) {
            logger.error(`[Debug] Failed to list workDir: ${e.message}`);
        }

        // Analyze Context (Stack & Structure)
        logger.info(`Analyzing context for ${workDir}`)
        const projectContext = await this.contextAnalyzer.analyze(workDir)
        logger.info(`Context detected: ${JSON.stringify(projectContext.stack)}`)

        await this.workerClient.reportProgress(taskId, 10, null)

        // Validate User Context Safety (Guardrail)
        let safeUserContext = job.userContext
        
        logger.info(`[Debug] Job payload: custom_rule_model=${job.custom_rule_model}, config=${JSON.stringify(job.custom_rules_config)}`);

        if (safeUserContext && safeUserContext.description) {
            logger.info('Validating user context safety...')
            const guardrailResult = await this.llmClient.validateContextSafety(safeUserContext)
            
            // Log security event for audit
            try {
                // tenantId already resolved
                await dbQuery(
                    `INSERT INTO securetag.security_event 
                    (id, tenant_id, event_type, status, reason, details, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    [
                        crypto.randomUUID(),
                        tenantId,
                        'CONTEXT_GUARDRAIL_CHECK',
                        guardrailResult.safe ? 'SAFE' : 'UNSAFE',
                        guardrailResult.reason || 'No reason provided',
                        JSON.stringify({
                            input: safeUserContext.description,
                            raw_output: guardrailResult.rawOutput
                        })
                    ]
                )
            } catch (dbErr) {
                logger.error('Failed to log security event for guardrail check', dbErr)
            }

            if (!guardrailResult.safe) {
                logger.warn('User context contains potential prompt injection. Dropping context.')
                
                // Ban API Key if available
                if (job.apiKeyHash) {
                    logger.warn(`Banning API Key Hash: ${job.apiKeyHash} due to Prompt Injection`)
                    await banEntity('api_key', job.apiKeyHash, `Prompt Injection Detected: ${guardrailResult.reason}`)
                }

                safeUserContext = null // Discard unsafe context
            } else {
                logger.info('User context validated as safe.')
            }
        }

        // --- CUSTOM RULES ENGINE ---
        let customRulesArgs: string[] = [];
        let customRulesStats: any = null;
        let generatedRulesSummary: any[] = [];

        const customRulesEnabled = job.custom_rules || (job.custom_rules_config && job.custom_rules_config.enabled);

        if (customRulesEnabled) {
            logger.info('Custom Rules Engine activated.');
            await this.workerClient.reportProgress(taskId, 15, null);
            
            const qty = job.custom_rules_qty || (job.custom_rules_config && job.custom_rules_config.qty) || 3;
            const modelConfig = job.custom_rule_model || (job.custom_rules_config && job.custom_rules_config.model) || 'standard';
            // Use a temp dir outside of source code
            const customRulesBase = path.join(path.dirname(workDir), `custom_rules_${taskId}`);
            if (!fs.existsSync(customRulesBase)) fs.mkdirSync(customRulesBase, { recursive: true });

            const customRuleGenerator = new CustomRuleGenerator();
            const generationResult = await customRuleGenerator.generateRules(tenantId, projectContext, qty, customRulesBase, modelConfig);
            const generatedRules = generationResult.rules;
            const failedRules = generationResult.failed_rules || [];
            customRulesStats = generationResult.stats;
            
            generatedRulesSummary = [
                ...generatedRules.map(r => ({
                    id: r.id,
                    name: r.description,
                    target: r.cwe,
                    language: r.language,
                    status: 'created'
                })),
                ...failedRules.map(r => ({
                    id: null,
                    name: r.description,
                    target: r.cwe,
                    language: 'unknown',
                    status: 'failed',
                    error: r.reason
                }))
            ];

            if (generatedRules.length > 0) {
                // Save to server
                for (const rule of generatedRules) {
                    await this.workerClient.saveCustomRule({
                        tenant_id: tenantId,
                        rule_content: rule.rule_content,
                        stack_context: JSON.stringify({ stack: rule.stack_context }),
                        ai_metadata: JSON.stringify(rule.ai_metadata)
                    });
                }
                
                // Add to Semgrep args
                // CustomRuleGenerator creates .custom_rules_gen inside the passed dir
                const rulesDir = path.join(customRulesBase, '.custom_rules_gen');
                customRulesArgs = ['--config', rulesDir];
                logger.info(`Added ${generatedRules.length} custom rules to scan.`);
            }
        }

        // --- PHASE 2: SAST EXECUTION (10-30%) ---
        // Use local rules
        const rulesPath = '/opt/securetag/rules'
        
        // Add topology rules dynamically (for Cross-File Analysis)
        const rulesDir = path.join(process.cwd(), 'data/rules');
        const extraRulesArgs: string[] = [];
        
        if (fs.existsSync(rulesDir)) {
            const ruleFiles = fs.readdirSync(rulesDir);
            for (const file of ruleFiles) {
                if (file.startsWith('topology-') && file.endsWith('.yaml')) {
                    const fullPath = path.join(rulesDir, file);
                    extraRulesArgs.push('--config', fullPath);
                    logger.info(`Loaded topology rules from ${fullPath}`);
                }
            }
        }

        const args = ['scan', '--json', '--quiet', '--config', rulesPath, '--no-git-ignore', ...extraRulesArgs, ...customRulesArgs, '--exclude', '__MACOSX/**', '--exclude', '**/._*', '--exclude', '**/.DS_Store', '--exclude', '.pre-commit-config.yaml', '--exclude', '.git', workDir]

        // Metrics Calculation
        let rulesExecutedCount = this.countRules(rulesPath);
        if (customRulesEnabled && generatedRulesSummary.length > 0) {
            rulesExecutedCount += generatedRulesSummary.length;
        }
        // Topology rules are in extraRulesArgs as '--config', 'path'
        for (let i = 0; i < extraRulesArgs.length; i += 2) {
             if (extraRulesArgs[i] === '--config') {
                 try {
                     const content = fs.readFileSync(extraRulesArgs[i+1], 'utf8');
                     const matches = content.match(/-\s+id:/g);
                     if (matches) rulesExecutedCount += matches.length;
                 } catch (e) {}
             }
        }
        logger.info(`Executing ${rulesExecutedCount} rules against ${filesScannedCount} files.`);

        const result = await ExternalToolManager.execute('semgrep', args, { timeout: 300000 })
        const finished = Date.now()

        await this.workerClient.reportProgress(taskId, 30, null)

        // DB Operations
        // tenantId already resolved
        // const taskId = job.id || job.taskId // Already defined above

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
            let items: any[] = payload && Array.isArray(payload.results) ? payload.results : []
            
            // --- CROSS-FILE ANALYSIS (Feature Flag) ---
            // Decoupled Logic: We trust the Server's 'features' flag.
            const enableCrossFile = job.features?.cross_file_analysis === true;
            
            if (enableCrossFile && payload) {
                try {
                    logger.info('Running Cross-File Analysis (Premium Feature)...');
                    const crossFileReports = await this.crossFileAnalyzer.analyze(payload, workDir);
                    
                    if (crossFileReports.length > 0) {
                        logger.info(`Detected ${crossFileReports.length} Cross-File Vulnerabilities.`);
                        
                        // Transform to Semgrep format and append
                        const syntheticFindings = crossFileReports.map(report => ({
                            check_id: `cross-file-${report.category}`,
                            path: report.file,
                            start: { line: report.line, col: 1 },
                            end: { line: report.line, col: 1 },
                            extra: {
                                message: `[Cross-File] ${report.title}`,
                                severity: 'ERROR', // Map HIGH to ERROR
                                lines: `Source: ${report.flow.source.code.trim()} -> Call: ${report.flow.call.code.trim()} -> Sink: ${report.flow.sink.code.trim()}`,
                                metadata: {
                                    category: report.category,
                                    type: 'cross-file',
                                    description: report.description,
                                    flow: report.flow
                                }
                            }
                        }));
                        
                        items = [...items, ...syntheticFindings];
                        
                        // Save enhanced results to disk so they are available for reporting/UI
                        if (payload) {
                            payload.results = items;
                            fs.writeFileSync(semgrepFile, JSON.stringify(payload, null, 2));
                            logger.info(`Updated ${semgrepFile} with ${syntheticFindings.length} cross-file findings.`);
                        }
                    }
                } catch (cfaError: any) {
                    logger.error(`Cross-File Analysis failed: ${cfaError.message}`);
                }
            } else {
                logger.info('Skipping Cross-File Analysis (Free Tier or Disabled).');
            }

            const totalItems = items.length

            // --- PHASE 3: COGNITIVE ANALYSIS (30-90%) ---
            // Calculate progress per item: 60% / totalItems
            // We'll track time to estimate ETA
            const analysisStart = Date.now()
            let analysisProcessed = 0
            
            // Helper to report progress periodically
            const reportAnalysisProgress = async () => {
                const now = Date.now()
                const elapsed = now - analysisStart
                const avgTimePerItem = analysisProcessed > 0 ? elapsed / analysisProcessed : 0
                const remainingItems = totalItems - analysisProcessed
                const etaMs = avgTimePerItem * remainingItems
                const etaSec = Math.ceil(etaMs / 1000)

                // Map current item index to 30-90% range
                // progress = 30 + ( (processed / total) * 60 )
                const percent = 30 + Math.floor((analysisProcessed / totalItems) * 60)
                
                await this.workerClient.reportProgress(taskId, percent, etaSec)
            }

            // Calculate dynamic report interval to avoid flooding
            // We want roughly 40 updates (every 10%) regardless of totalItems
            // Min interval is 1 (for small projects)
            const reportInterval = Math.max(1, Math.floor(totalItems * 0.1))

            for (let i = 0; i < items.length; i++) {
                heartbeat()
                
                // Report progress dynamically based on total volume
                if (i === 0 || i % reportInterval === 0) {
                    await reportAnalysisProgress()
                }

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
                
                // Normalize path to be relative to workDir
                let rawPath = it.path || ''
                // If rawPath starts with workDir, strip it to make it relative
                if (rawPath.startsWith(workDir)) {
                    rawPath = rawPath.slice(workDir.length)
                    if (rawPath.startsWith('/')) rawPath = rawPath.slice(1)
                }
                const filePath = rawPath

                const line = (it.start && it.start.line) || null
                let codeSnippet = (it.extra && it.extra.lines) || null
                
                // Enhanced Context Extraction (Monetized)
                const enableDeepVision = job.features?.deep_code_vision === true;
                let extendedContext = codeSnippet;

                try {
                    const fullAbsPath = path.join(workDir, filePath);
                    if (fs.existsSync(fullAbsPath) && fs.statSync(fullAbsPath).isFile()) {
                        const content = fs.readFileSync(fullAbsPath, 'utf8');
                        const lines = content.split('\n');
                        
                        if (line) {
                            // 1. Standard Snippet (5 lines before/after) for UI Highlighting
                            const lineIndex = line - 1;
                            const snippetStart = Math.max(0, lineIndex - 5);
                            const snippetEnd = Math.min(lines.length, lineIndex + 6); 
                            codeSnippet = lines.slice(snippetStart, snippetEnd).join('\n');

                            // 2. Deep Vision Context (Header + 15 lines before/after)
                            if (enableDeepVision) {
                                // a. Include first 20 lines (Header)
                                const headerLines = lines.slice(0, 20);
                                
                                // b. Include 15 lines before and after
                                const startContext = Math.max(0, lineIndex - 15);
                                const endContext = Math.min(lines.length, lineIndex + 16);
                                
                                const beforeLines = lines.slice(startContext, lineIndex);
                                const targetLine = lines[lineIndex];
                                const afterLines = lines.slice(lineIndex + 1, endContext);

                                extendedContext = `
                                    [CONTEXTO: Primeras 20 líneas del archivo (Imports/Configuración)]
                                    ${headerLines.join('\n')}
                                    ...
                                    [CONTEXTO: 15 líneas ANTES del hallazgo]
                                    ${beforeLines.join('\n')}

                                    [HALLAZGO EN LÍNEA ${line}]
                                    ${targetLine}

                                    [CONTEXTO: 15 líneas DESPUÉS del hallazgo]
                                    ${afterLines.join('\n')}
                                `;
                            } else {
                                extendedContext = codeSnippet;
                            }
                        } else {
                             // If no line number, take first 100 lines for extended context if Deep Vision
                             if (enableDeepVision) {
                                extendedContext = `File: ${filePath} (First 100 lines)\n---\n${lines.slice(0, 100).join('\n')}\n---`;
                             }
                        }
                    }
                } catch (e) {
                    // Ignore read errors, fallback to default snippets
                }

                // Generate stable fingerprint using relative path and content
                // We ignore semgrep's fingerprint as it may depend on absolute paths
                const fpInput = `${ruleId}|${filePath}|${line}|${codeSnippet || ''}`
                const fingerprint = crypto.createHash('sha256').update(fpInput).digest('hex')
                
                const cwe = it.extra && it.extra.metadata && it.extra.metadata.cwe ? String(it.extra.metadata.cwe) : null
                const cve = it.extra && it.extra.metadata && it.extra.metadata.cve ? String(it.extra.metadata.cve) : null
                const autofix = it.fix || (it.extra && it.extra.fix) || null

                // LLM Analysis
                let analysis = null
                // Analyze ALL findings regardless of severity
                try {
                    analysis = await this.llmClient.analyzeFinding({
                        rule_id: ruleId,
                        rule_name: ruleName,
                        file_path: filePath,
                        line: line,
                        code_snippet: extendedContext || codeSnippet, // Use extended context
                        severity: sev,
                        autofix_suggestion: autofix
                    }, projectContext, safeUserContext)

                    /*
                     * LEGACY DOUBLE CHECK: Deshabilitado para transición a modelo On-Demand.
                     * El análisis ahora se solicita explicitamente por el usuario después del escaneo.
                     * Se mantiene el código comentado por referencia hasta completar la migración total.
                     */

                } catch (err: any) {
                    logger.error(`Failed to analyze finding ${fingerprint}`, err)
                    // Optionally log to a DB table for errors if needed, 
                    // for now we rely on the worker logs and the fact that analysis is null.
                }

                await dbQuery('INSERT INTO securetag.finding(tenant_id, task_id, source_tool, rule_id, rule_name, severity, category, cwe, cve, file_path, line, fingerprint, evidence_ref, created_at, analysis_json, code_snippet, context_snippet) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now(), $14, $15, $16)',
                    [tenantId, taskId, 'semgrep', ruleId, ruleName, sev, 'code', cwe, cve, filePath, line, fingerprint, `${semgrepFile}#${i}`, analysis ? JSON.stringify(analysis) : null, codeSnippet || null, extendedContext || null])
                findingsCount++
                analysisProcessed++
            }
        } catch (err) {
            logger.error(`Failed to parse semgrep results: ${err}`)
        }

        // --- PHASE 4: COMPLETION (90-100%) ---
        await this.workerClient.reportProgress(taskId, 95, 0)

        await dbQuery('INSERT INTO securetag.scan_result(tenant_id, task_id, summary_json, storage_path, created_at) VALUES($1,$2,$3,$4, now()) ON CONFLICT (task_id) DO UPDATE SET summary_json=EXCLUDED.summary_json, storage_path=EXCLUDED.storage_path',
            [tenantId, taskId, JSON.stringify({ findingsCount, files_scanned_count: filesScannedCount, rules_executed_count: rulesExecutedCount, severity: summary, custom_rules: { ...customRulesStats, generated_rules: generatedRulesSummary } }), semgrepFile])

        // Update task state to completed
        await this.calculateEvolutionMetrics(taskId, tenantId)
        await updateTaskState(taskId, 'completed')
        
        // Final 100% update (Server will likely do this too when status=completed, but good to be explicit)
        await this.workerClient.reportProgress(taskId, 100, 0)

        return {
                ok: true,
                status: 'completed',
                taskId,
                tenant,
                results: semgrepFile,
                summary,
                files_scanned_count: filesScannedCount,
                rules_executed_count: rulesExecutedCount,
                custom_rules_stats: { ...customRulesStats, generated_rules: generatedRulesSummary },
                durationMs: Date.now() - started
            }
    }

    private async calculateEvolutionMetrics(taskId: string, tenantId: string) {
        try {
            // 1. Get task info (project_id, previous_task_id)
            const tq = await dbQuery<any>('SELECT project_id, previous_task_id FROM securetag.task WHERE id=$1', [taskId]);
            if (!tq.rows.length) return;
            const task = tq.rows[0];

            let previousTaskId = task.previous_task_id;

            // If no explicit previous task, try to find the last completed one for the same project
            if (!previousTaskId && task.project_id) {
                const pq = await dbQuery<any>(
                    'SELECT id FROM securetag.task WHERE project_id=$1 AND status=\'completed\' AND id!=$2 ORDER BY created_at DESC LIMIT 1',
                    [task.project_id, taskId]
                );
                if (pq.rows.length) {
                    previousTaskId = pq.rows[0].id;
                    // Update the current task to link to this previous one (for future reference)
                    await dbQuery('UPDATE securetag.task SET previous_task_id=$1 WHERE id=$2', [previousTaskId, taskId]);
                }
            }

            if (!previousTaskId) return;

            // 2. Fetch findings fingerprints
            const currentQ = await dbQuery<any>('SELECT fingerprint, severity FROM securetag.finding WHERE task_id=$1', [taskId]);
            const prevQ = await dbQuery<any>('SELECT fingerprint FROM securetag.finding WHERE task_id=$1', [previousTaskId]);

            const currentMap = new Map<string, any>();
            currentQ.rows.forEach((f: any) => {
                 if(f.fingerprint) currentMap.set(f.fingerprint, f);
            });
            
            const prevSet = new Set<string>();
            prevQ.rows.forEach((f: any) => {
                if(f.fingerprint) prevSet.add(f.fingerprint);
            });

            // 3. Calculate diffs
            let newCount = 0;
            let fixedCount = 0;
            let recurringCount = 0;
            let netRiskScore = 0;

            // Check Current vs Previous
            for (const [fp, f] of currentMap.entries()) {
                if (prevSet.has(fp)) {
                    recurringCount++;
                } else {
                    newCount++;
                }
                
                // Calculate Risk Score (Simple weight)
                let weight = 0;
                const s = (f.severity || '').toUpperCase();
                if (s === 'CRITICAL') weight = 100;
                else if (s === 'HIGH') weight = 50;
                else if (s === 'MEDIUM') weight = 20;
                else if (s === 'LOW') weight = 5;
                else weight = 1; // Info
                netRiskScore += weight;
            }

            // Check Fixed (In Previous but not in Current)
            for (const fp of prevSet) {
                if (!currentMap.has(fp)) {
                    fixedCount++;
                }
            }

            // 4. Update Task
            await dbQuery(
                'UPDATE securetag.task SET new_findings_count=$1, fixed_findings_count=$2, recurring_findings_count=$3, net_risk_score=$4 WHERE id=$5',
                [newCount, fixedCount, recurringCount, netRiskScore, taskId]
            );
            
            logger.info(`Calculated evolution for task ${taskId}: New=${newCount}, Fixed=${fixedCount}, Recur=${recurringCount}, Risk=${netRiskScore}`);

        } catch (e: any) {
            logger.error(`Failed to calculate evolution metrics for task ${taskId}: ${e.message}`);
        }
    }



    private countFiles(dir: string): number {
        let count = 0;
        try {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const file of files) {
                if (file.isDirectory()) {
                    if (file.name !== '.git' && file.name !== 'node_modules' && file.name !== '__MACOSX') {
                        count += this.countFiles(path.join(dir, file.name));
                    }
                } else {
                    count++;
                }
            }
        } catch (e) {
            // Ignore errors
        }
        return count;
    }

    private countRules(dir: string): number {
        let count = 0;
        try {
            if (!fs.existsSync(dir)) return 0;
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const file of files) {
                if (file.isDirectory()) {
                    count += this.countRules(path.join(dir, file.name));
                } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
                    try {
                        const content = fs.readFileSync(path.join(dir, file.name), 'utf8');
                        const matches = content.match(/-\s+id:/g);
                        if (matches) count += matches.length;
                    } catch (readErr) {
                        // Ignore file read error
                    }
                }
            }
        } catch (e) {
            // Ignore dir read error
        }
        return count;
    }

    private async ensureTaskExists(taskId: string, tenantId: string, type: string, job: any) {
        const exists = await dbQuery('SELECT 1 FROM securetag.task WHERE id=$1 LIMIT 1', [taskId])
        if (!exists.rows.length) {
            await dbQuery('INSERT INTO securetag.task(id, tenant_id, type, status, payload_json, retries, priority, created_at, started_at) VALUES($1,$2,$3,$4,$5,$6,$7, now(), now())',
                [taskId, tenantId, type, 'running', JSON.stringify(job), 0, 0])
        }
    }
}
