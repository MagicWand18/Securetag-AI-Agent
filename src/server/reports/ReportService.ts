import { dbQuery } from '../../utils/db.js';

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  findingsCount: number;
  children?: FileNode[];
}

export interface ReportData {
  meta: {
    generatedAt: Date;
    scanId: string;
  };
  project: {
    name: string;
    alias: string;
  };
  client: {
    name: string;
    title?: string;
    organization?: string;
  };
  metrics: {
    totalFindings: number;
    newFindings: number;
    fixedFindings: number;
    severityCounts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
    filesScanned: number;
    rulesExecuted: number;
  };
  sourceTree: FileNode[];
  findings: Array<{
    id: string;
    ruleName: string;
    cwe: string;
    cve: string;
    severity: string;
    filePath: string;
    line: number;
    codeSnippet: string;
    analysis: {
      triage: string;
      reasoning: string;
      recommendation?: string;
    };
  }>;
}

export interface GlobalReportData {
  project: {
    name: string;
    alias: string;
    description?: string;
  };
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalScans: number;
    currentRiskScore: number;
    openFindings: number;
    fixedFindings: number;
  };
  trends: Array<{
    date: Date;
    scanId: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  topVulnerabilities: Array<{
    ruleName: string;
    count: number;
    severity: string;
  }>;
}

export class ReportService {
  /**
   * Recopila toda la información necesaria para generar un reporte.
   * Realiza múltiples queries en paralelo para eficiencia.
   */
  static async getReportData(taskId: string, userContext?: any): Promise<ReportData> {
    // 1. Obtener Task y Proyecto
    const taskQuery = `
      SELECT 
        t.id, t.created_at, t.new_findings_count, t.fixed_findings_count,
        p.name as project_name, p.alias as project_alias,
        sr.summary_json
      FROM securetag.task t
      LEFT JOIN securetag.project p ON t.project_id = p.id
      LEFT JOIN securetag.scan_result sr ON t.id = sr.task_id
      WHERE t.id = $1
    `;
    
    // 2. Obtener Hallazgos (Solo los relevantes, ordenados por severidad)
    const findingsQuery = `
      SELECT 
        id, rule_id, rule_name, severity, cwe, cve, file_path, line, code_snippet, analysis_json
      FROM securetag.finding
      WHERE task_id = $1
      ORDER BY 
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END ASC
    `;

    // Ejecutar queries
    const taskResult = await dbQuery<any>(taskQuery, [taskId]);
    const findingsResult = await dbQuery<any>(findingsQuery, [taskId]);

    const task = taskResult.rows[0];
    if (!task) throw new Error(`Task not found: ${taskId}`);

    const summary = task.summary_json || {};
    const severity = summary.severity || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

    return {
      meta: {
        generatedAt: new Date(),
        scanId: task.id,
      },
      project: {
        name: task.project_name || task.project_alias || 'Unnamed Project',
        alias: task.project_alias || 'default',
      },
      client: {
        name: userContext?.name || 'Valued Client',
        title: userContext?.title || 'Security Stakeholder',
        organization: userContext?.organization || 'Organization',
      },
      metrics: {
        totalFindings: summary.findingsCount || findingsResult.rows.length,
        newFindings: task.new_findings_count || 0,
        fixedFindings: task.fixed_findings_count || 0,
        severityCounts: severity,
        filesScanned: summary.files_scanned_count || 0,
        rulesExecuted: summary.rules_executed_count || 0,
      },
      sourceTree: this.buildSourceTree(findingsResult.rows, task.project_name || 'Project Root'),
      findings: findingsResult.rows.map((f: any) => ({
        id: f.id,
        ruleName: f.rule_name || f.rule_id || 'Unknown Vulnerability',
        cwe: f.cwe || '',
        cve: f.cve || '',
        severity: f.severity || 'info',
        filePath: f.file_path || 'unknown',
        line: f.line || 0,
        codeSnippet: f.code_snippet || '',
        analysis: f.analysis_json || { triage: 'Unknown', reasoning: 'No analysis available.' },
      })),
    };
  }

  static async getGlobalReportData(projectId: string): Promise<GlobalReportData> {
    // 1. Get Project Info
    const projectQuery = `SELECT name, alias, description FROM securetag.project WHERE id = $1`;
    const projectRes = await dbQuery<any>(projectQuery, [projectId]);
    const project = projectRes.rows[0];
    if (!project) throw new Error(`Project not found: ${projectId}`);

    // 2. Get All Scans (Tasks) for Trends
    const tasksQuery = `
      SELECT 
        t.id, t.created_at, t.net_risk_score, t.new_findings_count, t.fixed_findings_count,
        sr.summary_json
      FROM securetag.task t
      LEFT JOIN securetag.scan_result sr ON t.id = sr.task_id
      WHERE t.project_id = $1 AND t.status = 'completed'
      ORDER BY t.created_at ASC
    `;
    const tasksRes = await dbQuery<any>(tasksQuery, [projectId]);
    const tasks = tasksRes.rows;

    // 3. Get Top Vulnerabilities (from latest scan)
    let topVulns: any[] = [];
    if (tasks.length > 0) {
      const latestTaskId = tasks[tasks.length - 1].id;
      const vulnsQuery = `
        SELECT rule_name, severity, COUNT(*) as count
        FROM securetag.finding
        WHERE task_id = $1
        GROUP BY rule_name, severity
        ORDER BY count DESC
        LIMIT 10
      `;
      const vulnsRes = await dbQuery<any>(vulnsQuery, [latestTaskId]);
      topVulns = vulnsRes.rows;
    }

    // 4. Calculate Metrics
    const latestTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;
    const firstTask = tasks.length > 0 ? tasks[0] : null;
    
    // Aggregates
    const totalFixed = tasks.reduce((acc: number, t: any) => acc + (t.fixed_findings_count || 0), 0);
    const currentOpen = latestTask?.summary_json?.findingsCount || 0;

    return {
      project: {
        name: project.name,
        alias: project.alias,
        description: project.description
      },
      period: {
        start: firstTask ? new Date(firstTask.created_at) : new Date(),
        end: latestTask ? new Date(latestTask.created_at) : new Date()
      },
      metrics: {
        totalScans: tasks.length,
        currentRiskScore: latestTask ? (latestTask.net_risk_score || 0) : 100,
        openFindings: currentOpen,
        fixedFindings: totalFixed
      },
      trends: tasks.map((t: any) => {
        const sev = t.summary_json?.severity || {};
        return {
          date: new Date(t.created_at),
          scanId: t.id,
          critical: sev.critical || 0,
          high: sev.high || 0,
          medium: sev.medium || 0,
          low: sev.low || 0
        };
      }),
      topVulnerabilities: topVulns.map((v: any) => ({
        ruleName: v.rule_name,
        count: parseInt(v.count),
        severity: v.severity
      }))
    };
  }

  private static buildSourceTree(findings: any[], rootName: string = 'Project Root'): FileNode[] {
    const rootChildren: FileNode[] = [];
    
    for (const f of findings) {
      const parts = (f.file_path || '').split('/');
      let currentLevel = rootChildren;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;
        
        const isFile = i === parts.length - 1;
        
        let node = currentLevel.find(n => n.name === part);
        
        if (!node) {
          node = {
            name: part,
            type: isFile ? 'file' : 'directory',
            findingsCount: 0,
            children: isFile ? undefined : []
          };
          currentLevel.push(node);
        }
        
        node.findingsCount++;
        
        if (!isFile && node.children) {
          currentLevel = node.children;
        }
      }
    }

    // Wrap everything in a root node
    const rootNode: FileNode = {
      name: rootName,
      type: 'directory',
      findingsCount: findings.length,
      children: rootChildren
    };
    
    return [rootNode];
  }
}
