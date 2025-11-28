import { Command } from 'commander';
import { PcapAnalyzer, DisplayFilter } from '../../agent/tools/PcapAnalyzer.js';
import { PcapReporter } from '../../agent/tools/PcapReporter.js';
import { CyberAgent } from '../../agent/core.js';
import { config } from '../../utils/config.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';
import { getModelByKey } from '../../utils/models.js';
import { IOCExtractor } from '../../utils/ioc.js';
import { MitreMapper } from '../../utils/mitre.js';
import { EvidenceManager, EvidenceReport } from '../../utils/evidence.js';

/**
 * Create pcap analysis command
 */
export function createPcapCommand(): Command {
  const cmd = new Command('pcap');

  cmd
    .description('Analizar archivos de captura de red (.pcap, .pcapng)')
    .argument('<file>', 'Ruta al archivo pcap')
    .option('-m, --mode <mode>', 'Modo de análisis: rápido, completo o búsqueda de amenazas', 'rápido')
    .option('--model <model>', 'Modelo de IA a usar (clave de modelo)', 'sonnet-4.5')
    .option('-f, --filter <filter>', 'Filtro de visualización (ej. "tcp", "udp", "dns")')
    .option('--src <ip>', 'Filtrar por dirección IP de origen')
    .option('--dst <ip>', 'Filtrar por dirección IP de destino')
    .option('--port <port>', 'Filtrar por puerto (fuente o destino)', parseInt)
    .option('--sport <port>', 'Filtrar por puerto de origen', parseInt)
    .option('--dport <port>', 'Filtrar por puerto de destino', parseInt)
    .option('--packets', 'Mostrar lista de paquetes (máximo 50 paquetes)')
    .option('--max-packets <n>', 'Número máximo de paquetes a analizar', parseInt)
    .option('--stats-only', 'Mostrar solo estadísticas sin análisis AI')
    .option('--extract-iocs', 'Extraer y mostrar IOCs (IPs, dominios, etc.)')
    .option('--mitre', 'Mapear hallazgos a técnicas MITRE ATT&CK')
    .option('--preserve-evidence', 'Generar metadatos de evidencia con hashes')
    .option('--case-number <number>', 'Número de caso para seguimiento de evidencia')
    .option('--analyst <name>', 'Nombre del analista para cadena de custodia')
    .option('--export-json <file>', 'Exportar análisis a archivo JSON')
    .option('--export-md <file>', 'Exportar informe a archivo Markdown')
    .option('--export-csv <file>', 'Exportar paquetes a archivo CSV')
    .option('--export-iocs <file>', 'Exportar IOCs en formato STIX 2.1')
    .action(async (file: string, options: any) => {
      try {
        ui.banner();

        const mode = options.mode.toLowerCase();
        if (!['quick', 'full', 'threat-hunt'].includes(mode)) {
          ui.error('Modo invalido. Escoge uno de los siguientes: quick, full, or threat-hunt');
          process.exit(1);
        }

        // Build display filter
        const displayFilter: DisplayFilter = {};
        if (options.filter) displayFilter.protocol = options.filter;
        if (options.src) displayFilter.sourceIp = options.src;
        if (options.dst) displayFilter.destIp = options.dst;
        if (options.port) displayFilter.port = options.port;
        if (options.sport) displayFilter.sourcePort = options.sport;
        if (options.dport) displayFilter.destPort = options.dport;

        const hasFilter = Object.keys(displayFilter).length > 0;

        // Show analysis mode
        const modeEmoji = mode === 'quick' ? '⚡' :
                         mode === 'full' ? '🔍' : '🎯';
        ui.section(`${modeEmoji} ${mode.toUpperCase()} Modo de Análisis`);
        console.log('');

        if (hasFilter) {
          ui.info('Filtros de Visualización Aplicados:');
          if (displayFilter.protocol) console.log(`  Protocolo: ${displayFilter.protocol}`);
          if (displayFilter.sourceIp) console.log(`  IP Origen: ${displayFilter.sourceIp}`);
          if (displayFilter.destIp) console.log(`  IP Destino: ${displayFilter.destIp}`);
          if (displayFilter.port) console.log(`  Puerto: ${displayFilter.port}`);
          if (displayFilter.sourcePort) console.log(`  Puerto Origen: ${displayFilter.sourcePort}`);
          if (displayFilter.destPort) console.log(`  Puerto Destino: ${displayFilter.destPort}`);
          console.log('');
        }

        // Analyze pcap
        const spinner = ui.spinner('Analizando archivo pcap...').start();
        const analyzer = new PcapAnalyzer();
        const reporter = new PcapReporter();

        const analysis = await analyzer.analyze(file, {
          displayFilter: hasFilter ? displayFilter : undefined,
          includePackets: options.packets || options.exportCsv,
          maxPackets: options.maxPackets,
          statisticsOnly: options.statsOnly,
        });

        spinner.succeed('Archivo pcap analizado con éxito');
        console.log('');

        // Display results
        reporter.displaySummary(analysis);

        // Display packets if requested
        if (options.packets && analysis.packets) {
          reporter.displayPackets(analysis.packets);
        }

        // AI analysis
        if (!options.statsOnly) {
          const model = getModelByKey(options.model);
          if (!model) {
            ui.error(`Modelo '${options.model}' no encontrado`);
            process.exit(1);
          }

          ui.section(`🧠 Análisis con IA (${model.name})`);
          console.log('');

          const aiSpinner = ui.spinner('Analizando tráfico de red...').start();

          const agent = new CyberAgent({
            apiKey: config.anthropicApiKey,
            googleApiKey: config.googleApiKey,
            model: model.id,
            mode: 'blueteam', // Use blueteam mode for traffic analysis
          });

          // Prepare analysis data
          const analysisPrompt = buildAnalysisPrompt(analysis, mode);

          const response = await agent.analyze(analysisPrompt, 'análisis de tráfico de red');

          aiSpinner.stop();
          console.log(ui.formatAIResponse(response));
          console.log('');
        }

        // IOC Extraction
        if (options.extractIocs) {
          ui.section('🔍 Extracción de Indicadores de Compromiso (IOC)');
          console.log('');

          const iocExtractor = new IOCExtractor();

          // Extract IOCs from DNS queries
          for (const query of analysis.dnsQueries) {
            iocExtractor.extractFromText(query.query, 'DNS Query');
          }

          // Extract IOCs from HTTP requests
          for (const req of analysis.httpRequests) {
            iocExtractor.extractFromText(`${req.host}${req.path}`, 'HTTP Request');
            if (req.userAgent) {
              iocExtractor.extractFromText(req.userAgent, 'User-Agent');
            }
          }

          // Extract IOCs from alerts
          for (const alert of analysis.alerts) {
            iocExtractor.extractFromText(alert, 'Alert');
          }

          const iocReport = iocExtractor.getReport();

          if (iocReport.totalCount > 0) {
            console.log(`Se encontraron ${iocReport.totalCount} IOC únicos:\n`);

            if (iocReport.ips.length > 0) {
              ui.info(`Direcciones IP (${iocReport.ips.length}):`);
              for (const ioc of iocReport.ips.slice(0, 20)) {
                console.log(`  ${ioc.value} (seen ${ioc.count}x) - ${ioc.context || 'N/A'}`);
              }
              console.log('');
            }

            if (iocReport.domains.length > 0) {
              ui.info(`Dominios (${iocReport.domains.length}):`);
              for (const ioc of iocReport.domains.slice(0, 20)) {
                console.log(`  ${ioc.value} (seen ${ioc.count}x) - ${ioc.context || 'N/A'}`);
              }
              console.log('');
            }

            if (iocReport.urls.length > 0) {
              ui.info(`URLs (${iocReport.urls.length}):`);
              for (const ioc of iocReport.urls.slice(0, 10)) {
                console.log(`  ${ioc.value}`);
              }
              console.log('');
            }

            if (options.exportIocs) {
              const stix = iocExtractor.exportSTIX();
              await require('fs').promises.writeFile(options.exportIocs, stix);
              ui.success(`IOC únicos exportados en formato STIX 2.1 a ${options.exportIocs}`);
              console.log('');
            }
          } else {
            console.log('No IOCs extraídos del tráfico.\n');
          }
        }

        // MITRE ATT&CK Mapping
        if (options.mitre) {
          ui.section('🎯 Mapeo de Técnicas MITRE ATT&CK');
          console.log('');

          const mapper = new MitreMapper();
          const allMappings = [];

          // Map alerts to techniques
          for (const alert of analysis.alerts) {
            const mappings = mapper.mapFinding('Alerta de Red', alert);
            allMappings.push(...mappings);
          }

          // Map suspicious domains/traffic patterns
          if (analysis.dnsQueries.length > 100) {
            const mappings = mapper.mapFinding(
              'Alerta de Actividad DNS Alta',
              `${analysis.dnsQueries.length} consultas DNS detectadas`,
              'reconnaissance'
            );
            allMappings.push(...mappings);
          }

          if (allMappings.length > 0) {
            // Remove duplicates
            const uniqueMappings = allMappings.filter(
              (m, i, arr) => arr.findIndex(x => x.technique.id === m.technique.id) === i
            );

            console.log(MitreMapper.formatMappings(uniqueMappings));
          } else {
            console.log('No técnicas MITRE ATT&CK mapeadas para este tráfico.\n');
          }
        }

        // Evidence Preservation
        if (options.preserveEvidence) {
          ui.section('📋 Preservación de Evidencia');
          console.log('');

          const evidenceSpinner = ui.spinner('Calculando hashes criptográficos...').start();

          const evidence = await EvidenceManager.createEvidence(file, {
            collectionMethod: 'Securetag AI - Análisis de PCAP',
            collectedBy: options.analyst || process.env.USER || 'Unknown',
            caseNumber: options.caseNumber,
            description: `Análisis de captura de tráfico de red - Modo ${mode}`,
          });

          // Add analysis entry to chain of custody
          EvidenceManager.addChainOfCustodyEntry(evidence, {
            action: 'analyzed',
            performedBy: options.analyst || process.env.USER || 'Securetag AI',
            notes: `PCAP analizado en modo ${mode} - ${analysis.packetCount} paquetes`,
            hashVerified: true,
          });

          evidenceSpinner.succeed('Metadatos de evidencia generados');

          console.log(EvidenceManager.formatMetadata(evidence));

          // Export evidence metadata
          const evidenceFile = `${file}.evidence.json`;
          await EvidenceManager.exportMetadata(evidence, evidenceFile);
          ui.success(`Metadatos de evidencia guardados en ${evidenceFile}`);
          console.log('');
        }

        // Export results
        if (options.exportJson) {
          await reporter.exportJson(analysis, options.exportJson);
        }
        if (options.exportMd) {
          await reporter.exportMarkdown(analysis, options.exportMd);
        }
        if (options.exportCsv && analysis.packets) {
          await reporter.exportCsv(analysis.packets, options.exportCsv);
        }

        ui.success('Análisis completado!');
      } catch (error: any) {
        logger.error('Análisis de PCAP fallido:', error);
        ui.error(`Análisis fallido: ${error.message}`);
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Build analysis prompt based on mode
 */
function buildAnalysisPrompt(analysis: any, mode: string): string {
  let prompt = `Analiza el siguiente tráfico de red capturado:\n\n`;
  prompt += `Archivo: ${analysis.filename}\n`;
  prompt += `Paquetes: ${analysis.packetCount.toLocaleString()}\n`;
  prompt += `Duración: ${formatDuration(analysis.captureDuration)}\n\n`;

  // Protocol statistics
  prompt += `Distribución de protocolos:\n`;
  for (const stat of analysis.protocolStats.slice(0, 10)) {
    prompt += `- ${stat.protocol}: ${stat.packets} paquetes (${stat.percentage.toFixed(1)}%)\n`;
  }
  prompt += `\n`;

  // Top conversations
  if (analysis.conversations.length > 0) {
    prompt += `Top Conversaciones:\n`;
    for (const conv of analysis.conversations.slice(0, 10)) {
      prompt += `- ${conv.protocol} ${conv.sourceAddr}:${conv.sourcePort} ↔ `;
      prompt += `${conv.destAddr}:${conv.destPort} (${conv.packets} paquetes)\n`;
    }
    prompt += `\n`;
  }

  // DNS queries
  if (analysis.dnsQueries.length > 0) {
    const uniqueQueries = new Map<string, number>();
    for (const query of analysis.dnsQueries) {
      uniqueQueries.set(query.query, (uniqueQueries.get(query.query) || 0) + 1);
    }
    prompt += `Consultas DNS (${analysis.dnsQueries.length} total, ${uniqueQueries.size} únicas):\n`;
    const sortedQueries = Array.from(uniqueQueries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    for (const [query, count] of sortedQueries) {
      prompt += `- ${query} (${count}x)\n`;
    }
    prompt += `\n`;
  }

  // HTTP requests
  if (analysis.httpRequests.length > 0) {
    prompt += `Solicitudes HTTP (${analysis.httpRequests.length} total):\n`;
    for (const req of analysis.httpRequests.slice(0, 10)) {
      prompt += `- ${req.method} ${req.host}${req.path}\n`;
    }
    prompt += `\n`;
  }

  // Alerts
  if (analysis.alerts.length > 0) {
    prompt += `⚠️ Alertas Detectadas:\n`;
    for (const alert of analysis.alerts) {
      prompt += `- ${alert}\n`;
    }
    prompt += `\n`;
  }

  // Mode-specific instructions
  if (mode === 'quick') {
    prompt += `Proporciona un resumen conciso del tráfico de red, destacando:\n`;
    prompt += `1. Patrones de tráfico general\n`;
    prompt += `2. Actividad sospechosa o inusual\n`;
    prompt += `3. Concerns de seguridad (si los hay)\n`;
  } else if (mode === 'full') {
    prompt += `Proporciona un análisis detallado incluyendo:\n`;
    prompt += `1. Desglose detallado del tráfico por protocolo\n`;
    prompt += `2. Patrones de comunicación y flujos\n`;
    prompt += `3. Posibles problemas de seguridad o anomalías\n`;
    prompt += `4. Análisis de actividad DNS y HTTP\n`;
    prompt += `5. Recomendaciones para investigaciones futuras\n`;
  } else if (mode === 'threat-hunt') {
    prompt += `Realiza un análisis de búsqueda de amenazas centrado en:\n`;
    prompt += `1. Indicadores de compromiso (IOCs)\n`;
    prompt += `2. Patrones de comandos y control (C2)\n`;
    prompt += `3. Intentos de exfiltración de datos\n`;
    prompt += `4. Indicadores de movimiento lateral\n`;
    prompt += `5. Uso sospechoso de puertos o anomalías de protocolos\n`;
    prompt += `6. Patrones de comunicación de malware\n`;
    prompt += `7. Recomendaciones para respuesta a incidentes\n`;
  }

  return prompt;
}

/**
 * Format duration to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}