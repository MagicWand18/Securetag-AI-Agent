import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { CyberAgent } from '../../agent/core.js';
import { DesktopScanner } from '../../agent/tools/scanner.js';
import { SecurityReporter } from '../../agent/tools/reporter.js';
import { config, validateConfigForProvider } from '../../utils/config.js';
import { SecurityFinding } from '../../agent/types.js';
import { AVAILABLE_MODELS, getModelByKey, getModelById } from '../../utils/models.js';
// NmapMCP removed - package does not exist

export function createScanCommand(): Command {
  const command = new Command('scan');

  command
    .description('Realizar un escaneo de seguridad en el sistema')
    .option('-q, --quick', 'Realizar comprobación de seguridad rápida')
    .option('-f, --full', 'Realizar escaneo de sistema completo')
    .option('-n, --network', 'Escanear conexiones de red')
    .option('--nmap', 'Usar Nmap para un escaneo de red profesional')
    .option('--target <target>', 'Objetivo IP/hostname/CIDR para el escaneo Nmap (predeterminado: red local)')
    .option('--ports <ports>', 'Puertos a escanear con Nmap (predeterminado: top-1000)')
    .option('--nmap-aggressive', 'Habilitar escaneo agresivo Nmap con la bandera -A')
    .option('--model <model>', `Modelo de IA a usar: ${Object.keys(AVAILABLE_MODELS).join(', ')}`)
    .option('--json <file>', 'Exportar resultados a archivo JSON')
    .option('--md <file>', 'Exportar resultados a archivo Markdown')
    .action(async (options) => {
      ui.section('Escaneo de Seguridad');

      // Get model
      let modelId = config.model;
      if (options.model) {
        const modelConfig = getModelByKey(options.model);
        if (!modelConfig) {
          ui.error(`Modelo inválido: ${options.model}`);
          ui.info(`Modelos válidos: ${Object.keys(AVAILABLE_MODELS).join(', ')}`);
          process.exit(1);
        }
        modelId = modelConfig.id;
      }

      const provider = getModelById(modelId)?.model.provider || getModelByKey(options.model || '')?.provider || 'ollama';
      const validation = validateConfigForProvider(provider);
      if (!validation.valid) {
        ui.error('Error de configuración:');
        validation.errors.forEach(err => ui.error(`  ${err}`));
        process.exit(1);
      }

      const scanner = new DesktopScanner();
      const reporter = new SecurityReporter();
      const startTime = new Date();

      try {
        let spinner;
        let result;

        if (options.quick) {
          spinner = ui.spinner('Realizando comprobación de seguridad rápida...');
          result = await scanner.quickCheck();
          spinner.succeed('Comprobación rápida completada');

          if (result.success && result.data.findings) {
            const scanResult = reporter.createScanResult(result.data.findings, startTime);
            reporter.displayReport(scanResult);

            if (options.json) {
              reporter.exportJSON(scanResult, options.json);
            }
            if (options.md) {
              reporter.exportMarkdown(scanResult, options.md);
            }
          }
        } else if (options.network) {
          spinner = ui.spinner('Escaneando conexiones de red...');
          result = await scanner.scanNetwork();
          spinner.succeed('Escaneo de red completado');

          if (result.success) {
            ui.info(`Se encontraron ${result.data.connections.length} conexiones de red`);

            // Nmap Professional Scanning - removed (package does not exist)
            if (options.nmap) {
              ui.warning('Herramienta de escaneo Nmap MCP no está disponible - no se encontró paquete funcional');
            }

            // Analyze with AI
            const agent = new CyberAgent({
              mode: 'desktopsecurity',
              apiKey: config.anthropicApiKey,
              googleApiKey: config.googleApiKey,
              model: modelId,
            });

            spinner = ui.spinner('Analizando conexiones de red con IA...');

            const analysisData = result.data;
            const analysisPrompt = 'Analiza estas conexiones de red en busca de problemas de seguridad. Identifica conexiones sospechosas, puertos inusuales y posibles riesgos.';

            const analysis = await agent.analyze(analysisPrompt, analysisData);
            spinner.succeed('Análisis de conexiones de red completado');

            console.log('\n' + ui.formatAIResponse(analysis));
          }
        } else {
          // Full system scan
          spinner = ui.spinner('Realizando escaneo completo del sistema...');
          result = await scanner.scanSystem();
          spinner.succeed('Escaneo del sistema completado');

          if (result.success) {
            ui.info('Se recopilaron datos de escaneo. Analizando con IA...');

            // Analyze with AI
            const agent = new CyberAgent({
              mode: 'desktopsecurity',
              apiKey: config.anthropicApiKey,
              googleApiKey: config.googleApiKey,
              model: modelId,
            });

            spinner = ui.spinner('Analizando seguridad del sistema con IA...');
            const analysis = await agent.analyze(
              'Realiza un análisis de seguridad integral del sistema. Identifica vulnerabilidades, desconfiguraciones y riesgos potenciales. Proporciona recomendaciones específicas y accionables.',
              result.data
            );
            spinner.succeed('Análisis de seguridad del sistema completado');

            console.log('\n' + ui.formatAIResponse(analysis));

            // Parse findings (if we want structured output)
            // For now, just show the AI response
          }
        }

        if (!result.success) {
          ui.error(result.error || 'Error en el escaneo');
          process.exit(1);
        }

      } catch (error) {
        ui.error(`Error en el escaneo: ${error}`);
        process.exit(1);
      }
    });

  return command;
}