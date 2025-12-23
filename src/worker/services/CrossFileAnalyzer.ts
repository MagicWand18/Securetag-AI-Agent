import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';

// --- Interfaces ---

export interface SemgrepFinding {
    check_id: string;
    path: string;
    start: { line: number; col: number };
    end: { line: number; col: number };
    extra: {
        message: string;
        severity: string;
        metadata: {
            type?: 'source' | 'sink' | 'call';
            tags?: string[];
            category?: string;
        };
        lines: string;
        metavars?: Record<string, { start: any; end: any; abstract_content: string }>;
    };
}

export interface SemgrepResult {
    results: SemgrepFinding[];
}

export interface TopologyNode {
    id: string; // unique id (file:line)
    type: 'source' | 'sink' | 'call';
    file: string;
    line: number;
    code: string;
    metadata: any;
    // Enriched fields
    serviceName?: string; // e.g., "userService"
    methodName?: string;  // e.g., "create" (for calls and sources)
    enclosingMethod?: string; // The method this node lives in
}

export interface VulnerabilityReport {
    title: string;
    description: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    file: string; // The source (Controller)
    line: number;
    flow: {
        source: TopologyNode;
        call: TopologyNode;
        sink: TopologyNode;
    };
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// --- Service ---

export class CrossFileAnalyzer {
    
    /**
     * Main entry point to analyze Semgrep results for cross-file flows.
     */
    async analyze(semgrepOutput: SemgrepResult, projectRoot: string): Promise<VulnerabilityReport[]> {
        logger.info('Starting Cross-File Analysis...');
        
        // 1. Extract and Enrich Nodes
        const nodes = await this.extractNodes(semgrepOutput.results, projectRoot);
        logger.info(`Extracted ${nodes.length} topology nodes.`);

        // 2. Correlate Nodes
        const reports = this.correlateNodes(nodes);
        
        logger.info(`Cross-File Analysis complete. Found ${reports.length} vulnerabilities.`);
        return reports;
    }

    private async extractNodes(findings: SemgrepFinding[], projectRoot: string): Promise<TopologyNode[]> {
        const nodes: TopologyNode[] = [];

        for (const f of findings) {
            // Only process our topology rules
            if (!f.extra.metadata.type) continue;

            // Robust code snippet extraction (Semgrep CLI sometimes returns garbage in extra.lines)
            let codeSnippet = f.extra.lines;
            if (codeSnippet === 'requires login' || !codeSnippet) {
                codeSnippet = await this.readCodeSnippet(f.path, f.start.line, f.end.line, projectRoot) || f.extra.lines;
            }

            const node: TopologyNode = {
                id: `${f.path}:${f.start.line}`,
                type: f.extra.metadata.type,
                file: f.path,
                line: f.start.line,
                code: codeSnippet,
                metadata: f.extra.metadata,
            };

            // Enrich based on type
            if (node.type === 'call') {
                // Try to extract service and method from metavars
                // Pattern: this.$SERVICE.$METHOD(...)
                if (f.extra.metavars && Object.keys(f.extra.metavars).length > 0) {
                    node.serviceName = f.extra.metavars['$SERVICE']?.abstract_content;
                    node.methodName = f.extra.metavars['$METHOD']?.abstract_content;
                } else {
                    // Fallback: Parse from message (Workaround for Semgrep CLI issues)
                    // Message format: "Service call detected: $SERVICE.$METHOD"
                    const match = f.extra.message.match(/Service call detected: (.*?)\.(.*)/);
                    if (match) {
                        node.serviceName = match[1];
                        node.methodName = match[2];
                    }
                }
            }
            
            // For Sinks, we need to know which method they are inside
            if (node.type === 'sink') {
                node.enclosingMethod = await this.findEnclosingMethod(f.path, f.start.line, projectRoot);
            }
            
            // For Sources (Controller methods), we are inside the method itself
            if (node.type === 'source') {
                if (f.extra.metavars && f.extra.metavars['$METHOD']) {
                     node.methodName = f.extra.metavars['$METHOD']?.abstract_content;
                } else {
                    // Fallback: Parse from message
                    // Message format: "Potential Controller Source detected: $METHOD"
                    const match = f.extra.message.match(/Source detected: (.*)/);
                    if (match) {
                        node.methodName = match[1];
                    }
                }
            }

            nodes.push(node);
        }

        return nodes;
    }

    private correlateNodes(nodes: TopologyNode[]): VulnerabilityReport[] {
        const sources = nodes.filter(n => n.type === 'source');
        const calls = nodes.filter(n => n.type === 'call');
        const sinks = nodes.filter(n => n.type === 'sink');

        logger.info(`Correlating: Sources=${sources.length}, Calls=${calls.length}, Sinks=${sinks.length}`);

        const reports: VulnerabilityReport[] = [];

        for (const source of sources) {
            // Find calls within the same method in the Controller
            const relevantCalls = calls.filter(c => 
                c.file === source.file && 
                (c.enclosingMethod === source.methodName || !c.enclosingMethod) // Allow if method detection failed, but prefer match
            );

            logger.info(`Source in ${source.file} (method ${source.methodName}) has ${relevantCalls.length} relevant calls.`);

            for (const call of relevantCalls) {
                if (!call.serviceName || !call.methodName) continue;

                // Resolve Service file
                const serviceFile = this.resolveServiceFile(call.serviceName, sinks);
                logger.info(`Call to ${call.serviceName} resolved to: ${serviceFile}`);
                
                if (serviceFile) {
                    // Find sinks in the Service file matching the called method
                    const matchingSinks = sinks.filter(s => 
                        path.basename(s.file) === serviceFile && 
                        s.enclosingMethod === call.methodName
                    );

                    logger.info(`Found ${matchingSinks.length} matching sinks in ${serviceFile} for method ${call.methodName}`);

                    for (const sink of matchingSinks) {
                        reports.push({
                            title: `Cross-File ${sink.metadata.category || 'Vulnerability'}`,
                            description: `Data flows from Controller (${source.methodName}) to Service (${call.serviceName}.${call.methodName}) reaching a sink.`,
                            severity: 'HIGH',
                            category: sink.metadata.category || 'unknown',
                            file: source.file,
                            line: source.line,
                            flow: { source, call, sink },
                            confidence: 'HIGH'
                        });
                    }
                }
            }
        }
        return reports;
    }

    /**
     * Resolves a variable name like 'userService' to a likely file suffix like 'UserService.ts'
     */
    private resolveServiceFile(serviceVar: string, allSinks: TopologyNode[]): string | null {
        // 1. Remove 'this.' if present (already handled by extraction usually)
        // 2. Capitalize first letter: userService -> UserService
        // 3. Search in sink files for one that matches
        
        const candidateFiles = Array.from(new Set(allSinks.map(s => s.file)));
        const cleanVar = serviceVar.replace(/^this\./, '');

        // Potential names to search for
        const candidates = [
            cleanVar, // userService
            cleanVar.charAt(0).toUpperCase() + cleanVar.slice(1), // UserService
            cleanVar.replace(/Service$/, '.service'), // user.service
            cleanVar.replace(/Service$/, 's.service'), // users.service (plural attempt)
        ];

        for (const file of candidateFiles) {
            const basename = path.basename(file);
            for (const candidate of candidates) {
                // Check if file ends with candidate + extension (case insensitive)
                const validExtensions = ['.ts', '.js', '.py', '.java', '.cs', '.php', '.go', '.rb'];
                const lowerBasename = basename.toLowerCase();
                const lowerCandidate = candidate.toLowerCase();
                
                for (const ext of validExtensions) {
                    if (lowerBasename.includes(lowerCandidate + ext)) {
                        return basename;
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Reads specific lines from a file.
     */
    private async readCodeSnippet(filePath: string, startLine: number, endLine: number, projectRoot: string): Promise<string | undefined> {
        try {
            let fullPath = filePath;
            if (!path.isAbsolute(filePath)) {
                fullPath = path.join(projectRoot, filePath);
            }
            if (!fs.existsSync(fullPath)) return undefined;

            const content = await fs.promises.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            // Lines are 1-based, array is 0-based
            return lines.slice(startLine - 1, endLine).join('\n');
        } catch (error) {
            logger.error(`Error reading code snippet from ${filePath}: ${error}`);
            return undefined;
        }
    }

    /**
     * Reads file and finds the method name enclosing the line.
     * Simple RegExp based implementation.
     */
    private async findEnclosingMethod(filePath: string, lineNo: number, projectRoot: string): Promise<string | undefined> {
        try {
            // Note: filePath from Semgrep is usually relative to scan root, but we might have absolute paths.
            // If it's relative, join with projectRoot.
            let fullPath = filePath;
            if (!path.isAbsolute(filePath)) {
                fullPath = path.join(projectRoot, filePath);
            }
            
            if (!fs.existsSync(fullPath)) {
                logger.warn(`File not found for method extraction: ${fullPath}`);
                return undefined;
            }

            const content = await fs.promises.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            
            // Search backwards from lineNo
            for (let i = lineNo - 1; i >= 0; i--) {
                const line = lines[i].trim();
                
                // Match: public create(...) {
                // Match: async create(...) {
                // Match: create(...) {
                // Match: create = (...) => {
                
                const methodMatch = line.match(/(?:public|private|protected|async)?\s*([a-zA-Z0-9_]+)\s*\(.*?\)\s*\{/);
                if (methodMatch) {
                    // Ignore 'if', 'for', 'switch', 'catch', 'while'
                    const name = methodMatch[1];
                    if (!['if', 'for', 'switch', 'catch', 'while', 'constructor'].includes(name)) {
                        return name;
                    }
                }
            }
            return undefined;
        } catch (error) {
            logger.error(`Error reading file ${filePath}: ${error}`);
            return undefined;
        }
    }
}
