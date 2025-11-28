/**
 * Website Screenshot Command
 */

import { Command } from 'commander';
import { ScreenshotTool } from '../../agent/tools/ScreenshotTool.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';

export function createScreenshotCommand(): Command {
  const command = new Command('screenshot');

  command
    .description('Captura de pantalla de un sitio web y detecta tecnologías utilizadas')
    .argument('<url>', 'URL del sitio web para capturar')
    .option('-o, --output <file>', 'Ruta de archivo de salida')
    .option('--width <number>', 'Ancho de la ventana del navegador', '1920')
    .option('--height <number>', 'Alto de la ventana del navegador', '1080')
    .option('--no-full-page', 'Capturar solo la vista de la ventana (no toda la página)')
    .option('--no-detect-tech', 'Omite la detección de tecnologías')
    .option('--json', 'Salida de metadatos en formato JSON')
    .action(async (url: string, options) => {
      try {
        ui.banner();
        console.log(ui.section('📸 Captura de Pantalla de Sitio Web\n'));

        // Validate URL
        try {
          new URL(url);
        } catch {
          console.log(ui.error('❌ URL no válida'));
          process.exit(1);
        }

        const width = parseInt(options.width, 10);
        const height = parseInt(options.height, 10);

        if (isNaN(width) || isNaN(height)) {
          console.log(ui.error('❌ Ancho o alto de la ventana no válidos'));
          process.exit(1);
        }

        // Generate output path if not provided
        const outputPath =
          options.output || ScreenshotTool.generateOutputPath(url, './screenshots');

        const spinner = ui.spinner(`Capturando captura de pantalla de ${url}...`);
        spinner.start();

        const result = await ScreenshotTool.capture({
          url,
          outputPath,
          width,
          height,
          fullPage: options.fullPage,
          detectTechnologies: options.detectTech,
        });

        spinner.stop();

        if (!result.success) {
          console.log(ui.error(`\n❌ Captura de pantalla fallida: ${result.error}`));
          process.exit(1);
        }

        if (options.json) {
          // Output metadata in JSON
          const metadata = {
            success: result.success,
            url: result.url,
            screenshotPath: result.screenshotPath,
            pageTitle: result.pageTitle,
            finalUrl: result.finalUrl,
            statusCode: result.statusCode,
            technologies: result.technologies,
            metadata: result.metadata,
          };
          console.log(JSON.stringify(metadata, null, 2));
        } else {
          console.log(ScreenshotTool.formatResults(result));
        }

        // Summary
        if (!options.json) {
          console.log(ui.section('\n✅ Captura de Pantalla Completa'));

          if (result.screenshotPath) {
            console.log(ui.success(`📁 Guardada en: ${result.screenshotPath}`));
          }

          if (result.technologies && result.technologies.length > 0) {
            console.log(ui.info(`🔧 Tecnologías detectadas: ${result.technologies.join(', ')}`));
          }

          // Open screenshot (optional)
          console.log(ui.info(`\n💡 Consejo: Abre la captura de pantalla con tu visor de imágenes predeterminado`));
        }
      } catch (error: any) {
        logger.error('Captura de pantalla fallida:', error);
        console.log(ui.error(`\n❌ Captura de pantalla fallida: ${error.message}`));

        if (error.message.includes('Protocol error')) {
          console.log(
            ui.warning('\n💡 Consejo: El sitio web puede estar bloqueando navegadores headless o requerir JavaScript')
          );
        }

        process.exit(1);
      }
    });

  return command;
}
