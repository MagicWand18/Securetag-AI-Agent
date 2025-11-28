/**
 * Dependency Vulnerability Scanning Command
 */

import { Command } from 'commander';
import { DependencyScanner } from '../../agent/tools/DependencyScanner.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';

export function createDepsCommand(): Command {
  const command = new Command('deps');

  command
    .description('Escanear dependencias JavaScript para vulnerabilidades conocidas')
    .argument('[path]', 'Ruta al directorio del proyecto', '.')
    .option('-o, --output <file>', 'Guardar resultados en archivo')
    .option('--json', 'Salida en formato JSON')
    .action(async (path: string, options) => {
      try {
        ui.banner();
        console.log(ui.section('🔍 Escaner de Vulnerabilidades de Dependencias\n'));

        // Check if retire.js is available
        const available = await DependencyScanner.isAvailable();
        if (!available) {
          console.log(ui.error('❌ retire.js no está disponible'));
          console.log(ui.info('\n📦 Instalando retire.js...'));
          console.log(ui.info('Por favor, espera mientras instalamos el scanner de dependencias requerido.\n'));
          process.exit(1);
        }

        const spinner = ui.spinner('Escaneando dependencias para vulnerabilidades...');
        spinner.start();

        const result = await DependencyScanner.scan(path);
        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(DependencyScanner.formatResults(result));
        }

        // Save to file if requested
        if (options.output) {
          const fs = await import('fs/promises');
          await fs.writeFile(
            options.output,
            options.json
              ? JSON.stringify(result, null, 2)
              : DependencyScanner.formatResults(result)
          );
          console.log(ui.success(`\n💾 Resultados guardados en ${options.output}`));
        }

        // Summary
        if (!options.json) {
          console.log(ui.section('\n📊 Resumen'));
          console.log(ui.info(`Ruta: ${result.scannedPath}`));
          console.log(ui.info(`Total de Vulnerabilidades: ${result.totalVulnerabilities}`));

          if (result.totalVulnerabilities > 0) {
            console.log(ui.warning(`\n⚠️  Se encontraron ${result.totalVulnerabilities} dependencias vulnerables`));

            if (result.summary.critical > 0) {
              console.log(
                ui.error(`🔴 ${result.summary.critical} Vulnerabilidades CRÍTICAS requieren atención inmediata`)
              );
            }

            console.log(
              ui.info('\n💡 Actualiza las dependencias vulnerables a sus últimas versiones para corregir problemas de seguridad')
            );
          } else {
            console.log(ui.success('\n✅ No se encontraron vulnerabilidades!'));
          }
        }

        // Exit with error code if vulnerabilities found
        if (result.summary.critical > 0 || result.summary.high > 0) {
          process.exit(1);
        }
      } catch (error: any) {
        logger.error('Escaneo de dependencias falló:', error);
        console.log(ui.error(`\n❌ Escaneo de dependencias falló: ${error.message}`));
        process.exit(1);
      }
    });

  return command;
}
