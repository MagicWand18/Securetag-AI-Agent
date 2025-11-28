import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { config, validateConfigForProvider } from '../../utils/config.js';
import { InteractiveSession } from '../session.js';
import { AgentMode } from '../../agent/types.js';
import { AVAILABLE_MODELS, getModelByKey } from '../../utils/models.js';

export function createInteractiveCommand(): Command {
  const command = new Command('interactive');

  command
    .description('Iniciar sesión interactiva (modo REPL persistente)')
    .alias('i')
    .option('-m, --mode <mode>', 'Modo inicial del agente: base, redteam, blueteam, desktopsecurity, webpentest', 'base')
    .option('--model <model>', `Modelo AI a utilizar: ${Object.keys(AVAILABLE_MODELS).join(', ')}`, 'sonnet-4.5')
    .action(async (options) => {
      // Validate mode
      const validModes = ['base', 'redteam', 'blueteam', 'desktopsecurity', 'webpentest'];
      if (!validModes.includes(options.mode)) {
        ui.error(`Modo inválido: ${options.mode}`);
        ui.info(`Modos válidos: ${validModes.join(', ')}`);
        process.exit(1);
      }

      // Validate and get model
      const modelConfig = getModelByKey(options.model);
      if (!modelConfig) {
        ui.error(`Modelo inválido: ${options.model}`);
        ui.info(`Modelos válidos: ${Object.keys(AVAILABLE_MODELS).join(', ')}`);
        process.exit(1);
      }

      const provider = modelConfig.provider;
      const validation = validateConfigForProvider(provider);
      if (!validation.valid) {
        ui.error('Error de configuración:');
        validation.errors.forEach(err => ui.error(`  ${err}`));
        process.exit(1);
      }

      // Start interactive session
      const session = new InteractiveSession(
        options.mode as AgentMode,
        modelConfig.id
      );

      await session.start();
    });

  return command;
}