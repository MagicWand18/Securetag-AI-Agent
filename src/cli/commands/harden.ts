import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { HardeningChecker } from '../../agent/tools/hardening.js';
import { SecurityReporter } from '../../agent/tools/reporter.js';
import { CyberAgent } from '../../agent/core.js';
import { config, validateConfigForProvider } from '../../utils/config.js';
import { AVAILABLE_MODELS, getModelByKey, getModelById } from '../../utils/models.js';
import chalk from 'chalk';

export function createHardenCommand(): Command {
  const command = new Command('harden');

  command
    .description('Revisar la hardenización del sistema y obtener recomendaciones de seguridad')
    .option('-c, --check', 'Revisar el estado actual de la hardenización')
    .option('-r, --recommendations', 'Obtener recomendaciones de hardenización')
    .option('--model <model>', `Modelo de IA a utilizar: ${Object.keys(AVAILABLE_MODELS).join(', ')}`)
    .option('--json <file>', 'Exportar resultados a archivo JSON')
    .option('--md <file>', 'Exportar resultados a archivo Markdown')
    .action(async (options) => {
      ui.section('Hardening del sistema');

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

      const checker = new HardeningChecker();
      const reporter = new SecurityReporter();
      const startTime = new Date();

      try {
        if (options.recommendations) {
          const spinner = ui.spinner('Obteniendo recomendaciones de hardenización...');
          const result = await checker.getRecommendations();
          spinner.succeed('Recomendaciones generadas');

          if (result.success && result.data) {
            ui.info(`\nPlataforma: ${result.data.platform}\n`);

            console.log(chalk.bold.cyan('Recomendaciones Generales:'));
            result.data.general.forEach((rec: string, index: number) => {
              console.log(`  ${index + 1}. ${rec}`);
            });

            console.log('\n' + chalk.bold.cyan('Recomendaciones Específicas de la Plataforma:'));
            result.data.platformSpecific.forEach((rec: string, index: number) => {
              console.log(`  ${index + 1}. ${rec}`);
            });
          }
        } else {
          // Default: check hardening
          const spinner = ui.spinner('Revisando hardenización del sistema...');
          const result = await checker.checkHardening();
          spinner.succeed('Revisión de hardenización completada');

          if (result.success && result.data.findings) {
            const scanResult = reporter.createScanResult(result.data.findings, startTime);
            reporter.displayReport(scanResult);

            // Get AI recommendations
            const agent = new CyberAgent({
              mode: 'desktopsecurity',
              apiKey: config.anthropicApiKey,
              googleApiKey: config.googleApiKey,
              model: modelId,
            });

            const aiSpinner = ui.spinner('Obteniendo recomendaciones de seguridad con IA...');
            const analysis = await agent.analyze(
              'Con base en estos hallazgos de hardening, proporciona recomendaciones accionables y priorizadas para mejorar la seguridad del sistema. Enfócate primero en los problemas más críticos.',
              result.data.findings
            );
            aiSpinner.succeed('Recomendaciones de seguridad con IA listas');

            console.log('\n' + ui.formatAIResponse(analysis));

            if (options.json) {
              reporter.exportJSON(scanResult, options.json);
            }
            if (options.md) {
              reporter.exportMarkdown(scanResult, options.md);
            }
          }
        }
      } catch (error) {
        ui.error(`Revisión de hardenización fallida: ${error}`);
        process.exit(1);
      }
    });

  return command;
}