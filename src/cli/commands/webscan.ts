import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { CyberAgent } from '../../agent/core.js';
import { WebScanner } from '../../agent/tools/web/WebScanner.js';
import { config, validateConfigForProvider } from '../../utils/config.js';
import { getModelByKey, getModelById } from '../../utils/models.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import { WebScanResult } from '../../agent/types.js';
// MCP tools removed - no working packages found

/**
 * Save scan results to the /scans directory as markdown
 */
async function saveScanResults(result: WebScanResult, analysis?: string): Promise<string> {
  // Create scans directory if it doesn't exist
  const scansDir = path.join(process.cwd(), 'scans');
  await fs.mkdir(scansDir, { recursive: true });

  // Generate filename from hostname and timestamp
  const hostname = result.target.hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${hostname}_${timestamp}.md`;
  const filepath = path.join(scansDir, filename);

  // Format markdown content
  const markdown = formatScanMarkdown(result, analysis);

  // Write to file
  await fs.writeFile(filepath, markdown, 'utf-8');

  return filepath;
}

/**
 * Format scan results as markdown
 */
function formatScanMarkdown(result: WebScanResult, analysis?: string): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Reporte de Escaneo de Seguridad Web`);
  lines.push(`\n**Objetivo:** ${result.target.url}`);
  lines.push(`**Fecha de Escaneo:** ${new Date(result.scanTime).toLocaleString()}`);
  lines.push(`**Duración:** ${result.duration}ms`);
  lines.push(`**Protocolo:** ${result.target.protocol.toUpperCase()}`);
  if (result.technology?.server) {
    lines.push(`**Servidor:** ${result.technology.server}`);
  }
  lines.push('');

  // Summary
  lines.push(`## Resumen`);
  lines.push('');
  lines.push(`| Severidad | Conteo |`);
  lines.push(`|----------|-------|`);
  lines.push(`| 🔴 Crítico | ${result.summary.critical} |`);
  lines.push(`| 🟠 Alto | ${result.summary.high} |`);
  lines.push(`| 🟡 Medio | ${result.summary.medium} |`);
  lines.push(`| 🟢 Bajo | ${result.summary.low} |`);
  lines.push(`| 🔵 Información | ${result.summary.info} |`);
  lines.push(`| **Total** | **${result.summary.total}** |`);
  lines.push('');

  // Findings
  if (result.findings.length > 0) {
    lines.push(`## Hallazgos`);
    lines.push('');

    // Group by severity
    const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    for (const severity of severityOrder) {
      const findings = result.findings.filter(f => f.severity === severity);
      if (findings.length === 0) continue;

      const emoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
        info: '🔵'
      }[severity];

      lines.push(`### ${emoji} ${severity.toUpperCase()}`);
      lines.push('');

      findings.forEach((finding, index) => {
        lines.push(`#### ${index + 1}. ${finding.title}`);
        lines.push('');
        lines.push(`**Descripción:** ${finding.description}`);
        lines.push('');
        if (finding.remediation) {
          lines.push(`**Remediación:** ${finding.remediation}`);
          lines.push('');
        }
        if (finding.references && finding.references.length > 0) {
          lines.push(`**Referencias:**`);
          finding.references.forEach(ref => {
            lines.push(`- ${ref}`);
          });
          lines.push('');
        }
        lines.push(`**Categoría:** ${finding.category}`);
        lines.push('');
        lines.push('---');
        lines.push('');
      });
    }
  } else {
    lines.push(`## Hallazgos`);
    lines.push('');
    lines.push(`✅ Sin hallazgos de seguridad encontrados!`);
    lines.push('');
  }

  // AI Analysis
  if (analysis) {
    const cleaned = ui.sanitizeAIText(analysis);
    lines.push(`## Análisis de Seguridad con IA`);
    lines.push('');
    lines.push(cleaned);
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*Reporte generado por Securetag AI en ${new Date().toLocaleString()}*`);

  return lines.join('\n');
}

export function createWebScanCommand(): Command {
  const command = new Command('webscan');

  command
    .description('Escanear aplicaciones web para vulnerabilidades de seguridad')
    .argument('<url>', 'URL objetivo para escanear')
    .option('-q, --quick', 'Escaneo rápido (solo encabezados)')
    .option('-f, --full', 'Escaneo completo de vulnerabilidades')
    .option('--ctf', 'Modo desafío CTF')
    .option('--skip-auth', 'Saltar comprobaciones de autorización (solo para sitios que own)')
    .option('--model <model>', 'Modelo IA a usar para el análisis')
    .option('--timeout <ms>', 'Timeout de solicitud en milisegundos', '10000')
    .option('--nuclei', 'Ejecutar escaneo de vulnerabilidades con Nuclei (5000+ plantillas)')
    .option('--sslscan', 'Ejecutar análisis de seguridad SSL/TLS')
    .option('--sqlmap', 'Probar vulnerabilidades de inyección SQL')
    .option('--with-mcp', 'Ejecutar todas las herramientas de seguridad MCP disponibles')
    .action(async (url: string, options) => {
      // Determine provider from selected/default model
      const defaultModelId = config.model;
      const provider = getModelByKey(options.model || '')?.provider || getModelById(defaultModelId)?.model.provider || 'ollama';
      const validation = validateConfigForProvider(provider);
      if (!validation.valid) {
        ui.error('Error de configuración:');
        validation.errors.forEach(err => ui.error(`  ${err}`));
        process.exit(1);
      }

      // Get model
      let modelId = config.model;
      if (options.model) {
        const modelConfig = getModelByKey(options.model);
        if (!modelConfig) {
          ui.error(`Modelo inválido: ${options.model}`);
          process.exit(1);
        }
        modelId = modelConfig.id;
      }

      const scanner = new WebScanner();

      try {
        console.log('');
        ui.section(`Escaneo de Seguridad Web: ${url}`);
        console.log('');

        // Progress callback
        const onProgress = (message: string) => {
          console.log(message);
        };

        // Perform scan based on options
        let result;
        if (options.full) {
          result = await scanner.fullScan(url, {
            timeout: parseInt(options.timeout),
            ctfMode: options.ctf,
            skipAuth: options.skipAuth,
            onProgress,
          });
          ui.success('✓ Escaneo completo completado\n');
        } else {
          result = await scanner.quickScan(url, {
            timeout: parseInt(options.timeout),
            ctfMode: options.ctf,
            skipAuth: options.skipAuth,
            onProgress,
          });
          ui.success('✓ Escaneo rápido completado\n');
        }

        // Display results
        console.log('');
        ui.section('Resultados del escaneo');
        console.log(`Objetivo: ${result.target.url}`);
        console.log(`Protocolo: ${result.target.protocol.toUpperCase()}`);
        if (result.technology?.server) {
          console.log(`Servidor: ${result.technology.server}`);
        }
        console.log('');

        // Display findings summary
        console.log('Resumen de hallazgos:');
        console.log(`  Total: ${result.summary.total}`);
        console.log(`  🔴 Crítico: ${result.summary.critical}`);
        console.log(`  🟠 Alto: ${result.summary.high}`);
        console.log(`  🟡 Medio: ${result.summary.medium}`);
        console.log(`  🟢 Bajo: ${result.summary.low}`);
        console.log(`  🔵 Info: ${result.summary.info}`);
        console.log('');

        // Display findings
        if (result.findings.length > 0) {
          result.findings.slice(0, 10).forEach(finding => {
            ui.finding(finding.severity, finding.title, finding.description);
          });

          if (result.findings.length > 10) {
            console.log(`\n... y ${result.findings.length - 10} más hallazgos`);
          }
        } else {
          ui.success('No se encontraron problemas de seguridad!');
        }

        // MCP Security Tool Scans removed - no working MCP packages found

        // AI Analysis
        let analysis: string | undefined;
        if (result.findings.length > 0) {
          const agent = new CyberAgent({
            mode: 'webpentest',
            apiKey: config.anthropicApiKey,
            googleApiKey: config.googleApiKey,
            model: modelId,
          });

          const spinner = ui.spinner('🧠 Analizando hallazgos con IA...');

          // Combine all findings for AI analysis
          const analysisData = {
            builtInFindings: result.findings,
            target: result.target,
          };

          analysis = await agent.analyze(
            'Analiza estos hallazgos de seguridad web del escáner integrado. Prioriza los problemas, explica su impacto y proporciona remediaciones accionables. Enfócate primero en las vulnerabilidades más críticas.',
            analysisData
          );
          spinner.succeed('✓ Análisis con IA completado');

          console.log('\n' + ui.formatAIResponse(analysis) + '\n');
        }

        // Save scan results
        const savedPath = await saveScanResults(result, analysis);
        ui.success(`📁 Resultados del escaneo guardados en: ${savedPath}`);

      } catch (error: any) {
        ui.error(`Error en el escaneo web: ${error.message}`);
        process.exit(1);
      }
    });

  return command;
}