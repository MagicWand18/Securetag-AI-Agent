/**
 * SSL/TLS Certificate Analysis Command
 */

import { Command } from 'commander';
import { SSLAnalyzer } from '../../agent/tools/SSLAnalyzer.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';

export function createSSLCommand(): Command {
  const command = new Command('ssl');

  command
    .description('Analiza certificados SSL/TLS para problemas de seguridad')
    .argument('<host>', 'Nombre de host a analizar')
    .option('-p, --port <number>', 'Número de puerto', '443')
    .option('-o, --output <file>', 'Guardar resultados en archivo')
    .option('--json', 'Salida en formato JSON')
    .action(async (host: string, options) => {
      try {
        ui.banner();
        console.log(ui.section('🔒 Analizador de Certificados SSL/TLS\n'));

        const port = parseInt(options.port, 10);

        if (isNaN(port) || port < 1 || port > 65535) {
          console.log(ui.error('❌ Número de puerto inválido'));
          process.exit(1);
        }

        const spinner = ui.spinner(`Analizando certificado SSL/TLS para ${host}:${port}...`);
        spinner.start();

        const result = await SSLAnalyzer.analyze(host, port);
        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(SSLAnalyzer.formatResults(result));
        }

        // Save to file if requested
        if (options.output) {
          const fs = await import('fs/promises');
          await fs.writeFile(
            options.output,
            options.json
              ? JSON.stringify(result, null, 2)
              : SSLAnalyzer.formatResults(result)
          );
          console.log(ui.success(`\n💾 Resultados guardados en ${options.output}`));
        }

        // Summary
        if (!options.json && result.success) {
          console.log(ui.section('\n📊 Resumen Rápido'));

          if (result.valid) {
            console.log(ui.success(`✅ El certificado es VÁLIDO`));
          } else {
            console.log(ui.error(`❌ El certificado es INVÁLIDO`));
          }

          console.log(ui.info(`📅 Días Restantes: ${result.daysRemaining}`));
          console.log(ui.info(`🎯 Puntuación de Riesgo: ${result.riskScore}/100`));

          // Warnings
          if (result.riskScore >= 60) {
            console.log(ui.error('\n🚨 ALTA RIESGO - Acción inmediata requerida!'));
          } else if (result.riskScore >= 30) {
            console.log(ui.warning('\n⚠️  MEDIA RIESGO - Trate de resolver pronto'));
          } else {
            console.log(ui.success('\n✅ BAJA RIESGO - El certificado es seguro'));
          }

          // Critical findings
          const criticalFindings = result.findings.filter((f) => f.severity === 'critical');
          if (criticalFindings.length > 0) {
            console.log(ui.error(`\n🔴 ${criticalFindings.length} Errores CRÍTICOS encontrados`));
            criticalFindings.forEach((f) => {
              console.log(ui.error(`   • ${f.title}`));
            });
          }
        }

        // Exit with error code if critical issues
        if (result.riskScore >= 60) {
          process.exit(1);
        }
      } catch (error: any) {
        logger.error('Análisis de certificado SSL/TLS falló:', error);
        console.log(ui.error(`\n❌ Análisis falló: ${error.message}`));
        process.exit(1);
      }
    });

  return command;
}
