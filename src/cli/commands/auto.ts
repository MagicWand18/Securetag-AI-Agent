/**
 * Autonomous Command - AI-powered autonomous task execution
 * Usage: securetag-ai auto "scan example.com for vulnerabilities"
 */

import { Command } from 'commander';
import { AgenticCore, AgenticConfig } from '../../agent/core/agentic.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';
import { Step } from '../../agent/types.js';
import readline from 'readline';

/**
 * Request approval from user for high-risk steps
 */
async function requestUserApproval(step: Step): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    ui.warning(
      `⚠️  Paso ${step.stepNumber} requiere aprobación:\n\n` +
        `   Descripción: ${step.description}\n` +
        `   Herramienta: ${step.tool}\n` +
        `   Nivel de Riesgo: ${step.riskLevel.toUpperCase()}\n` +
        `   Parámetros: ${JSON.stringify(step.parameters, null, 2)}`
    );

    rl.question('\n   ¿Aprobar este paso? (sí/no): ', (answer) => {
      rl.close();
      const approved = answer.toLowerCase() === 'sí' || answer.toLowerCase() === 'y';
      if (approved) {
        ui.success('✓ Paso aprobado');
      } else {
        ui.error('✗ Paso denegado');
      }
      resolve(approved);
    });
  });
}

/**
 * Create autonomous command
 */
export function createAutoCommand(): Command {
  const command = new Command('auto')
    .description('Ejecuta tareas de forma autónoma utilizando planificación y ejecución de IA')
    .argument('<task>', 'Descripción de la tarea (e.g., "scan example.com for vulnerabilities")')
    .option('--mode <mode>', 'Modo de agente: base, redteam, blueteam, desktopsecurity, webpentest, osint', 'base')
    .option('--model <model>', 'Modelo de IA a utilizar', 'claude-sonnet-4-5')
    .option(
      '--thinking',
      'Habilita pensamiento extendido para planificación compleja',
      false
    )
    .option('--max-steps <n>', 'Máximo número de pasos a ejecutar', '20')
    .option('--max-duration <ms>', 'Duración máxima en milisegundos', '600000')
    .option('--auto-approve', 'Aprobar automáticamente todos los pasos (USE WITH CAUTION)', false)
    .option('--verbose', 'Salida detallada con actualizaciones de progreso', false)
    .option('--export <file>', 'Exportar contexto de ejecución a archivo')
    .action(async (task: string, options) => {
      try {
        // Validate agent mode
        const validModes = ['base', 'redteam', 'blueteam', 'desktopsecurity', 'webpentest', 'osint'];
        if (!validModes.includes(options.mode)) {
          throw new Error(
            `Modo de agente inválido: ${options.mode}. Debe ser uno de: ${validModes.join(', ')}`
          );
        }

        // Display banner
        ui.section('🧠 AGENTE AUTÓNOMO');
        ui.box(
          `Tarea: ${task}\n` +
          `Modo: ${options.mode.toUpperCase()}\n` +
          `Modelo: ${options.model}\n` +
          `Máximo Pasos: ${options.maxSteps}\n` +
          `Pensamiento Extendido: ${options.thinking ? 'Habilitado' : 'Deshabilitado'}\n` +
          `Aprobar Automáticamente: ${options.autoApprove ? 'SÍ (USE WITH CAUTION)' : 'No (Safe)'}`
        );

        // Get API keys
        const apiKey = process.env.ANTHROPIC_API_KEY;
        const googleApiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey && !googleApiKey) {
          throw new Error(
            'No se encontraron claves de API. Establezca ANTHROPIC_API_KEY o GOOGLE_API_KEY en el entorno.'
          );
        }

        // Create agentic config
        const config: AgenticConfig = {
          apiKey,
          googleApiKey,
          model: options.model,
          mode: options.mode,
          maxSteps: parseInt(options.maxSteps, 10),
          maxDuration: parseInt(options.maxDuration, 10),
          useExtendedThinking: options.thinking,
          autoApprove: options.autoApprove,
          requireApprovalCallback: options.autoApprove ? undefined : requestUserApproval,
          verbose: options.verbose,
        };

        // Create agent
        ui.info('Inicializando agente autónomo...');
        const agent = new AgenticCore(config);

        // Execute task
        ui.info('Iniciando ejecución autónoma...\n');
        const startTime = Date.now();

        const result = await agent.executeTask(task);

        const duration = Date.now() - startTime;

        // Display results
        if (result.success) {
          ui.success('\n✅ TAREA COMPLETADA');

          const summary = {
            status: result.context.status,
            stepsCompleted: result.context.completedSteps.length,
            stepsTotal: result.context.plan.steps.length,
            findingsCount: result.context.findings.length,
            errorsCount: result.context.errors.length,
            duration: (duration / 1000).toFixed(1) + 's',
          };

          ui.box(
            `Estado: ${summary.status}\n` +
            `Pasos: ${summary.stepsCompleted}/${summary.stepsTotal}\n` +
            `Encuentros: ${summary.findingsCount}\n` +
            `Errores: ${summary.errorsCount}\n` +
            `Duración: ${summary.duration}`
          );

          // Show findings
          if (result.context.findings.length > 0) {
            ui.section('🔍 HALLAZGOS DE SEGURIDAD');

            const findingsBySeverity = {
              critical: result.context.findings.filter((f) => f.severity === 'critical'),
              high: result.context.findings.filter((f) => f.severity === 'high'),
              medium: result.context.findings.filter((f) => f.severity === 'medium'),
              low: result.context.findings.filter((f) => f.severity === 'low'),
              info: result.context.findings.filter((f) => f.severity === 'info'),
            };

            ui.box(
              `Crítico: ${findingsBySeverity.critical.length}\n` +
              `Alto: ${findingsBySeverity.high.length}\n` +
              `Medio: ${findingsBySeverity.medium.length}\n` +
              `Bajo: ${findingsBySeverity.low.length}\n` +
              `Info: ${findingsBySeverity.info.length}`
            );

            // Show top findings
            const topFindings = [
              ...findingsBySeverity.critical,
              ...findingsBySeverity.high,
            ].slice(0, 5);

            if (topFindings.length > 0) {
              console.log('\nHallazgos principales:\n');
              topFindings.forEach((finding, idx) => {
                console.log(`${idx + 1}. [${finding.severity.toUpperCase()}] ${finding.title}`);
                console.log(`   ${finding.description}\n`);
              });
            }
          }

          // Show errors
          if (result.context.errors.length > 0) {
            ui.warning(`\n⚠️  ${result.context.errors.length} error(s) occurred during execution`);
            result.context.errors.slice(0, 3).forEach((err) => {
              console.log(`   Paso ${err.step}: ${err.error}`);
            });
          }

          // Export context if requested
          if (options.export) {
            const fs = await import('fs/promises');
            const contextJson = JSON.stringify(result.context, null, 2);
            await fs.writeFile(options.export, contextJson, 'utf-8');
            ui.success(`\n✓ Contexto exportado a ${options.export}`);
          }
        } else {
          ui.error('\n❌ TAREA FALLIDA');
          ui.box(
            `Error: ${result.error}\n` +
            `Duración: ${(duration / 1000).toFixed(1)}s`
          );

          process.exit(1);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Ejecución autónoma fallida: ${errorMessage}`);
        ui.error(`\n❌ Error: ${errorMessage}`);
        process.exit(1);
      }
    });

  return command;
}
