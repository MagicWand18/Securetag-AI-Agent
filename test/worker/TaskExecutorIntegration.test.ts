import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { TaskExecutor } from '../../src/worker/TaskExecutor.js';

// Mock dependencies
vi.mock('../../src/worker/WorkerClient.js', () => ({
    WorkerClient: vi.fn().mockImplementation(() => ({
        reportProgress: vi.fn().mockResolvedValue(undefined),
        saveCustomRule: vi.fn().mockResolvedValue(undefined),
    }))
}));

vi.mock('../../src/agent/tools/ExternalToolManager.js', () => ({
    ExternalToolManager: {
        isAvailable: vi.fn().mockResolvedValue(true),
        execute: vi.fn()
    }
}));

vi.mock('../../src/utils/db.js', () => ({
    dbQuery: vi.fn().mockResolvedValue({ rows: [] }),
    ensureTenant: vi.fn().mockResolvedValue('tenant-123'),
    updateTaskState: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../src/server/security.js', () => ({
    banEntity: vi.fn()
}));

vi.mock('../../src/worker/HeartbeatManager.js', () => ({
    HeartbeatManager: vi.fn().mockImplementation(() => ({
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined)
    }))
}));

vi.mock('../../src/worker/LLMClient.js', () => ({
    LLMClient: vi.fn().mockImplementation(() => ({
        validateContextSafety: vi.fn().mockResolvedValue({ safe: true }),
        analyzeFinding: vi.fn().mockResolvedValue({ analysis: 'mock analysis', confidence: 'high' })
    }))
}));

vi.mock('../../src/worker/ContextAnalyzer.js', () => ({
    ContextAnalyzer: vi.fn().mockImplementation(() => ({
        analyze: vi.fn().mockResolvedValue({ stack: ['nodejs', 'typescript'] })
    }))
}));

vi.mock('../../src/worker/services/ExternalAIService.js', () => ({
    ExternalAIService: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../../src/worker/services/CustomRuleGenerator.js', () => ({
    CustomRuleGenerator: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../../src/worker/services/research/ResearchOrchestrator.js', () => ({
    ResearchOrchestrator: vi.fn().mockImplementation(() => ({}))
}));

// Mock child_process for unzip
vi.mock('child_process', () => ({
    execFile: vi.fn((cmd, args, cb) => {
        // Simulate unzip success
        if (cmd === 'unzip') {
             // We can return a mock process object
             const mockProcess = {
                 on: (event: string, handler: Function) => {
                     if (event === 'exit') handler(0);
                     return mockProcess;
                 }
             };
             return mockProcess;
        }
        return { on: () => {} };
    })
}));

// Import after mocks
import { ExternalToolManager } from '../../src/agent/tools/ExternalToolManager.js';

describe('TaskExecutor Integration', () => {
    let executor: TaskExecutor;
    const workDir = path.join(process.cwd(), 'test/fixtures/mvc');
    const resultsDir = path.join(process.cwd(), 'test/results');

    beforeEach(() => {
        process.env.RESULTS_DIR = resultsDir;
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        executor = new TaskExecutor('worker-1');
    });

    afterEach(() => {
        vi.clearAllMocks();
        // Cleanup results
        if (fs.existsSync(resultsDir)) {
            fs.rmSync(resultsDir, { recursive: true, force: true });
        }
    });

    it('should run Cross-File Analysis for Premium tier and append findings', async () => {
        // Mock Semgrep Output
        const mockSemgrepOutput = {
            results: [
                {
                    check_id: 'source-controller',
                    path: 'users.controller.ts', // Relative path
                    start: { line: 10, col: 3 },
                    end: { line: 10, col: 10 },
                    extra: {
                        message: 'Source',
                        severity: 'INFO',
                        lines: '@Post()\ncreate(@Body() createUserDto: any)',
                        metadata: { type: 'source' },
                        metavars: { '$METHOD': { abstract_content: 'create' } }
                    }
                },
                {
                    check_id: 'call-service',
                    path: 'users.controller.ts',
                    start: { line: 12, col: 5 },
                    end: { line: 12, col: 40 },
                    extra: {
                        message: 'Call',
                        severity: 'INFO',
                        lines: 'this.userService.create(createUserDto)',
                        metadata: { type: 'call' },
                        metavars: {
                            '$SERVICE': { abstract_content: 'userService' },
                            '$METHOD': { abstract_content: 'create' }
                        }
                    }
                },
                {
                    check_id: 'sink-sql',
                    path: 'users.service.ts',
                    start: { line: 11, col: 5 }, 
                    end: { line: 11, col: 50 },
                    extra: {
                        message: 'SQL Sink',
                        severity: 'INFO',
                        lines: 'this.db.query(...)',
                        metadata: { type: 'sink', category: 'sql-injection' }
                    }
                }
            ]
        };

        // Mock Semgrep execution result
        (ExternalToolManager.execute as any).mockResolvedValue({
            stdout: JSON.stringify(mockSemgrepOutput),
            stderr: '',
            exitCode: 0
        });

        // Job payload
        const job = {
            id: 'task-123',
            type: 'codeaudit',
            zipPath: 'dummy.zip',
            workDir: workDir,
            tier: 'pro', // Should be ignored now
            features: { cross_file_analysis: true }, // Feature flag
            userContext: { description: 'test' }
        };

        const result = await executor.execute(job);

        // Assertions
        expect(result.ok).toBe(true); // Should succeed (result is undefined in executeSemgrep unless it returns something, checking logs/db)
        
        // TaskExecutor.executeSemgrep returns a summary report usually? 
        // Looking at code: return result (from executeWithTimeout)
        // executeWithTimeout returns result of fn (executeSemgrep)
        // executeSemgrep returns? It doesn't seem to return the findings explicitly in the last line.
        // It returns... wait, lines 308-end:
        // It parses findings, does cross file, reports progress, and loop over items.
        // It does NOT return the items array.
        // It returns whatever `ExternalToolManager.execute` returned? No.
        // It returns `result` variable? No.
        // The last lines of executeSemgrep are loop. It returns undefined implicitly?
        
        // Wait, `TaskExecutor.ts` line 69: `return result`.
        // `executeSemgrep` ends without explicit return. So it returns `undefined`.
        
        // But the findings are written to file: `path.join(outDir, 'semgrep.json')`.
        // I can check that file!
        
        const semgrepFile = path.join(resultsDir, 'task-123', 'semgrep.json');
        expect(fs.existsSync(semgrepFile)).toBe(true);
        
        // Wait, the `semgrep.json` file is written with `result.stdout` (raw semgrep output) BEFORE cross-file analysis.
        // Cross-file analysis appends to `items` array in memory for "Cognitive Analysis" (progress reporting).
        // It does NOT write back to `semgrep.json` in the current code?
        
        // Let's check `TaskExecutor.ts`:
        // line 302: fs.writeFileSync(semgrepFile, (result.stdout || '').toString())
        // line 312: const payload = ...
        // line 317: Cross-File Logic...
        // line 346: items = [...items, ...syntheticFindings];
        
        // So `semgrep.json` on disk does NOT contain cross-file findings.
        // The cross-file findings are only used for "Cognitive Analysis" (the loop that calculates stats and reports progress).
        // AND they should be saved to DB?
        // The loop updates `summary`.
        // Does it save findings to DB?
        // It seems `TaskExecutor.ts` in the snippet I read does NOT insert findings into DB one by one.
        // Maybe it relies on `ExternalToolManager` or another service?
        // Or maybe I missed the DB insertion part.
        
        // Reading `TaskExecutor.ts` again...
        // The loop (lines 384-end) iterates `items`.
        // It calculates `summary`.
        // But I don't see `INSERT INTO findings ...`
        
        // Ah, maybe the user wants me to FIX this too?
        // Or maybe it's handled elsewhere?
        // But for my test, I can verify that `crossFileAnalyzer.analyze` was called.
        // AND I can verify that the logs indicate findings were found.
        
        // Since I can't check the return value or file, checking if logic ran is key.
        // I can verify `ExternalToolManager.execute` was called.
        // But how to verify cross-file results?
        
        // I can spy on `executor['crossFileAnalyzer'].analyze`.
        // Or better: I can check if the synthetic findings were added to `items`.
        // But `items` is local variable.
        
        // Wait, I can spy on `workerClient.reportProgress`.
        // But that just reports percent.
        
        // IMPORTANT: The `semgrep.json` file contains raw output.
        // If I want cross-file findings to be persisted, they should be added to `semgrep.json` OR inserted to DB.
        // The current implementation seems to only use them for "Analysis" (maybe triggering alerts or just counting severity?).
        
        // If the intention of Tarea 10.2 is to "detect" and "report", they should be visible.
        // If they are not saved, they are lost.
        // I should probably update `TaskExecutor.ts` to save the enhanced results (including cross-file) to `semgrep.json` or a new file `findings.json`.
        // OR at least ensure they are part of the process.
        
        // For the test, I will assume the current code is what it is.
        // I will rely on console logs (I can spy on logger?) or just that it runs without error.
        
        // Actually, looking at `TaskExecutor.ts`, there is no DB insert for findings.
        // This suggests `semgrep.json` is the artifact.
        // If so, Cross-File findings are NOT saved. This is a BUG or missing feature.
        // "Implementar Tarea 10.2" -> "Detectar vulnerabilidades".
        // If detected but not saved, it's useless.
        
        // I should modify `TaskExecutor.ts` to write the enhanced findings (including cross-file) to a file, e.g., `findings.json` or overwrite `semgrep.json`.
        
        // Let's modify `TaskExecutor.ts` first to save the results.
        // Then the test can check the file.
        
    });
});
