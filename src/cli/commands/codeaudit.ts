import { Command } from 'commander';
import { ExternalToolManager } from '../../agent/tools/ExternalToolManager.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';
import { SecurityFinding } from '../../agent/types.js';

function mapSeverity(s: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  const t = s.toLowerCase();
  if (t === 'error' || t === 'critical') return 'critical';
  if (t === 'warning' || t === 'high') return 'high';
  if (t === 'medium') return 'medium';
  if (t === 'low') return 'low';
  return 'info';
}

function formatFindings(json: any): SecurityFinding[] {
  const results = Array.isArray(json?.results) ? json.results : [];
  const now = new Date();
  return results.map((r: any, idx: number) => {
    const severity = mapSeverity(r?.extra?.severity || 'info');
    const title = r?.extra?.message || r?.check_id || 'Semgrep finding';
    const path = r?.path || r?.extra?.path || '';
    const start = r?.start ? `${r.start.line}:${r.start.col}` : '';
    const end = r?.end ? `${r.end.line}:${r.end.col}` : '';
    const references: string[] = [];
    const docs = r?.extra?.metadata?.references || r?.extra?.references || [];
    if (Array.isArray(docs)) {
      for (const d of docs) references.push(String(d));
    }
    const remediation = r?.extra?.fix || r?.extra?.metadata?.remediation;
    const category = r?.extra?.metadata?.category || r?.extra?.metadata?.owasp || 'code-security';
    return {
      id: `SG-${idx + 1}`,
      severity,
      title,
      description: `${path}${start ? `:${start}` : ''}${end ? `-${end}` : ''}`,
      remediation,
      references,
      category: String(category),
      timestamp: now,
    };
  });
}

export function createCodeAuditCommand(): Command {
  const command = new Command('codeaudit');

  command
    .description('Analiza repositorios/proyectos con Semgrep (análisis estático)')
    .argument('<path>', 'Ruta del proyecto o código a analizar')
    .option('--config <cfg>', 'Configuración de Semgrep: auto o ruta a archivo', 'auto')
    .option('--severity <level>', 'Filtro de severidad mínima: info|low|medium|high|critical|all')
    .option('--json', 'Salida JSON en crudo de Semgrep')
    .option('--output <file>', 'Guardar resultados en archivo')
    .addHelpText('after',
      `\nUso:\n` +
      `  securetag-ai codeaudit <ruta> [opciones]\n\n` +
      `Opciones clave:\n` +
      `  --config auto|<ruta>    Configuración de reglas de Semgrep (por defecto: auto)\n` +
      `  --severity <nivel>      Filtro de severidad mínima. Valores: info, low, medium, high, critical, all\n` +
      `                         - all: no aplica filtro (incluye INFO, WARNING y ERROR)\n` +
      `                         - low→INFO, medium→WARNING, high|critical→ERROR\n` +
      `  --json                  Muestra la salida JSON cruda de Semgrep\n` +
      `  --output <archivo>      Guarda la salida JSON en archivo\n\n` +
      `Ejemplos:\n` +
      `  securetag-ai codeaudit . --config auto\n` +
      `  securetag-ai codeaudit ./app --severity all\n` +
      `  securetag-ai codeaudit . --severity high\n` +
      `  securetag-ai codeaudit . --json --output semgrep.json\n`
    )
    .action(async (path: string, options) => {
      try {
        ui.banner();
        console.log(ui.section('🧠 Code Security Audit (Semgrep)\n'));

        const spinner = ui.spinner('Verificando disponibilidad de Semgrep...');

        await ExternalToolManager.scan();
        const available = await ExternalToolManager.isAvailable('semgrep');
        const tool = await ExternalToolManager.getTool('semgrep');
        spinner.stop();

        if (!available || !tool) {
          console.log(ui.error('❌ Semgrep no está instalado'));
          if (tool?.installInstructions) {
            console.log(ui.info(`\n📦 Instalar: ${tool.installInstructions}`));
          }
          process.exit(1);
        }

        const args: string[] = [];
        args.push('--json');
        args.push('--quiet');
        if (options.config) {
          if (options.config === 'auto') args.push('--config', 'auto');
          else args.push('--config', options.config);
        }
        if (options.severity && String(options.severity).toLowerCase() !== 'all') {
          const sev = String(options.severity).toLowerCase();
          let semgrepSev: 'ERROR' | 'WARNING' | 'INFO';
          switch (sev) {
            case 'critical':
            case 'high':
            case 'error':
              semgrepSev = 'ERROR';
              break;
            case 'medium':
            case 'warning':
              semgrepSev = 'WARNING';
              break;
            case 'low':
            case 'info':
            default:
              semgrepSev = 'INFO';
          }
          args.push('--severity', semgrepSev);
        }
        args.push(path);

        const runSpinner = ui.spinner('Ejecutando Semgrep...');
        const result = await ExternalToolManager.execute('semgrep', args, { maxBuffer: 20 * 1024 * 1024 });
        runSpinner.stop();

        let parsed: any = {};
        try {
          parsed = JSON.parse(result.stdout || '{}');
        } catch (e) {
          logger.error('No se pudo parsear la salida JSON de Semgrep:', e);
        }

        if (options.json) {
          console.log(JSON.stringify(parsed, null, 2));
        } else {
          const findings = formatFindings(parsed);
          const summary = {
            total: findings.length,
            critical: findings.filter(f => f.severity === 'critical').length,
            high: findings.filter(f => f.severity === 'high').length,
            medium: findings.filter(f => f.severity === 'medium').length,
            low: findings.filter(f => f.severity === 'low').length,
            info: findings.filter(f => f.severity === 'info').length,
          };

          console.log('Findings Summary:');
          console.log(`  Total: ${summary.total}`);
          console.log(`  🔴 Critical: ${summary.critical}`);
          console.log(`  🟠 High: ${summary.high}`);
          console.log(`  🟡 Medium: ${summary.medium}`);
          console.log(`  🟢 Low: ${summary.low}`);
          console.log(`  🔵 Info: ${summary.info}`);
          console.log('');

          findings.slice(0, 20).forEach(f => {
            ui.finding(f.severity, f.title, f.description);
          });

          if (summary.total > 20) {
            console.log(`\n... y ${summary.total - 20} hallazgos más`);
          }
        }

        if (options.output) {
          const fs = await import('fs/promises');
          const content = options.json ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed, null, 2);
          await fs.writeFile(options.output, content);
          console.log(ui.success(`\n💾 Resultados guardados en ${options.output}`));
        }

      } catch (error: any) {
        logger.error('Code audit failed:', error);
        console.log(ui.error(`\n❌ Audit failed: ${error.message}`));
        process.exit(1);
      }
    });

  return command;
}