import { describe, it, expect } from 'vitest';
import path from 'path';
import { CrossFileAnalyzer, SemgrepResult } from '../../src/worker/services/CrossFileAnalyzer.js';

describe('CrossFileAnalyzer', () => {
    const analyzer = new CrossFileAnalyzer();
    const projectRoot = process.cwd(); 

    it('should correlate Controller -> Service -> Sink flow', async () => {
        // Mock Semgrep Output matching test/fixtures/mvc files
        const mockSemgrepResult: SemgrepResult = {
            results: [
                // Source: UsersController.create
                {
                    check_id: 'source-controller',
                    path: 'test/fixtures/mvc/users.controller.ts',
                    start: { line: 10, col: 3 }, // Adjusted line to match @Post
                    end: { line: 10, col: 10 },
                    extra: {
                        message: 'Source',
                        severity: 'INFO',
                        lines: '@Post()\ncreate(@Body() createUserDto: any)',
                        metadata: { type: 'source' },
                        metavars: {
                            '$METHOD': { start: {}, end: {}, abstract_content: 'create' }
                        }
                    }
                },
                // Call: UsersController calls userService.create
                {
                    check_id: 'call-service',
                    path: 'test/fixtures/mvc/users.controller.ts',
                    start: { line: 12, col: 5 },
                    end: { line: 12, col: 40 },
                    extra: {
                        message: 'Call',
                        severity: 'INFO',
                        lines: 'this.userService.create(createUserDto)',
                        metadata: { type: 'call' },
                        metavars: {
                            '$SERVICE': { start: {}, end: {}, abstract_content: 'userService' },
                            '$METHOD': { start: {}, end: {}, abstract_content: 'create' }
                        }
                    }
                },
                // Sink: UserService.create (SQLi)
                {
                    check_id: 'sink-sql',
                    path: 'test/fixtures/mvc/users.service.ts',
                    start: { line: 10, col: 5 }, // inside create()
                    end: { line: 10, col: 50 },
                    extra: {
                        message: 'SQL Sink',
                        severity: 'INFO',
                        lines: 'this.db.query(...)',
                        metadata: { type: 'sink', category: 'sql-injection' }
                    }
                }
            ]
        };

        const reports = await analyzer.analyze(mockSemgrepResult, projectRoot);

        expect(reports).toHaveLength(1);
        const report = reports[0];
        
        expect(report.severity).toBe('HIGH');
        expect(report.category).toBe('sql-injection');
        expect(report.file).toContain('users.controller.ts');
        expect(report.flow.source.methodName).toBe('create');
        expect(report.flow.call.serviceName).toBe('userService');
        expect(report.flow.sink.file).toContain('users.service.ts');
    });

    it('should NOT correlate if sink is in a different method', async () => {
         const mockSemgrepResult: SemgrepResult = {
            results: [
                // Source: Controller calls create
                 {
                    check_id: 'source-controller',
                    path: 'test/fixtures/mvc/users.controller.ts',
                    start: { line: 10, col: 3 }, 
                    end: { line: 10, col: 10 },
                    extra: {
                        message: 'Source',
                        severity: 'INFO',
                        lines: 'create',
                        metadata: { type: 'source' },
                        metavars: { '$METHOD': { start: {}, end: {}, abstract_content: 'create' } }
                    }
                },
                {
                    check_id: 'call-service',
                    path: 'test/fixtures/mvc/users.controller.ts',
                    start: { line: 12, col: 5 },
                    end: { line: 12, col: 40 },
                    extra: {
                        message: 'Call',
                        severity: 'INFO',
                        lines: 'this.userService.create(...)',
                        metadata: { type: 'call' },
                        metavars: {
                            '$SERVICE': { start: {}, end: {}, abstract_content: 'userService' },
                            '$METHOD': { start: {}, end: {}, abstract_content: 'create' }
                        }
                    }
                },
                // Sink: UserService.delete (SQLi) - DIFFERENT METHOD
                {
                    check_id: 'sink-sql',
                    path: 'test/fixtures/mvc/users.service.ts',
                    start: { line: 18, col: 7 }, // inside delete()
                    end: { line: 18, col: 50 },
                    extra: {
                        message: 'SQL Sink',
                        severity: 'INFO',
                        lines: 'this.db.execute(...)',
                        metadata: { type: 'sink', category: 'sql-injection' }
                    }
                }
            ]
        };

        const reports = await analyzer.analyze(mockSemgrepResult, projectRoot);
        expect(reports).toHaveLength(0);
    });
});
