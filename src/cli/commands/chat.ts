import { Command } from 'commander';
import inquirer from 'inquirer';
import { ui } from '../../utils/ui.js';
import { CyberAgent } from '../../agent/core.js';
import { config, validateConfigForProvider } from '../../utils/config.js';
import { AgentMode } from '../../agent/types.js';
import { AVAILABLE_MODELS, getModelByKey, getModelById } from '../../utils/models.js';
import chalk from 'chalk';

export function createChatCommand(): Command {
  const command = new Command('chat');

  command
    .description('Modo de chat interactivo con el agente de seguridad (una sola vez)')
    .option('-m, --mode <mode>', 'Modo del agente: base, redteam, blueteam, desktopsecurity, webpentest', 'base')
    .option('--model <model>', `Modelo de IA a usar: ${Object.keys(AVAILABLE_MODELS).join(', ')}`)
    .action(async (options) => {
      // Validate mode
      const validModes = ['base', 'redteam', 'blueteam', 'desktopsecurity', 'webpentest'];
      if (!validModes.includes(options.mode)) {
        ui.error(`Modo inválido: ${options.mode}`);
        ui.info(`Modos válidos: ${validModes.join(', ')}`);
        process.exit(1);
      }

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

      const defaultModelId = config.model;
      const provider = getModelByKey(options.model || '')?.provider || getModelById(defaultModelId)?.model.provider || 'ollama';
      const validation = validateConfigForProvider(provider);
      if (!validation.valid) {
        ui.error('Error de configuración:');
        validation.errors.forEach(err => ui.error(`  ${err}`));
        process.exit(1);
      }

      ui.clear();
      ui.banner();

      const modeEmojis: Record<AgentMode, string> = {
        base: '🧠',
        redteam: '⚔️',
        blueteam: '🛡️',
        desktopsecurity: '🔒',
        webpentest: '🌐',
        osint: '🔍',
      };

      const currentMode = options.mode as AgentMode;
      let modeText = `\n${modeEmojis[currentMode]} ${options.mode.toUpperCase()} MODO ACTIVADO\n`;

      // Apply color based on mode
      switch (currentMode) {
        case 'redteam':
          console.log(chalk.red.bold(modeText));
          break;
        case 'blueteam':
          console.log(chalk.blue.bold(modeText));
          break;
        case 'desktopsecurity':
          console.log(chalk.green.bold(modeText));
          break;
        case 'webpentest':
          console.log(chalk.magenta.bold(modeText));
          break;
        default:
          console.log(chalk.cyan.bold(modeText));
      }

      ui.box(
        `Ahora estás chateando con Securetag AI en modo ${chalk.bold(options.mode)}.\n\n` +
        `Comandos:\n` +
        `  ${chalk.cyan('/mode <mode>')} - Cambiar el modo del agente\n` +
        `  ${chalk.cyan('/clear')} - Limpiar el historial de la conversación\n` +
        `  ${chalk.cyan('/help')} - Mostrar ayuda\n` +
        `  ${chalk.cyan('/exit')} - Salir del modo de chat\n\n` +
        `Escribe tus preguntas o solicitudes de seguridad debajo.`,
        '💬 Modo de Chat',
        'info'
      );

      const agent = new CyberAgent({
        mode: options.mode as AgentMode,
        apiKey: config.anthropicApiKey,
        googleApiKey: config.googleApiKey,
        model: modelId,
      });

      // Chat loop
      while (true) {
        try {
          const { message } = await inquirer.prompt({
            type: 'input',
            name: 'message',
            message: chalk.cyan('You:'),
            prefix: '',
          } as any);

          if (!message || message.trim() === '') {
            continue;
          }

          const trimmedMessage = message.trim();

          // Handle commands
          if (trimmedMessage.startsWith('/')) {
            const handled = await handleChatCommand(trimmedMessage, agent);
            if (handled === 'exit') {
              break;
            }
            continue;
          }

          // Send to agent
          const spinner = ui.spinner('Pensando...');

          try {
            const response = await agent.chat(trimmedMessage);
            spinner.stop();

            console.log(chalk.magenta('\nSecuretag AI:'));
            console.log(ui.formatAIResponse(response));
            console.log('');
          } catch (error) {
            spinner.fail('Error al comunicar con el agente');
            ui.error(`${error}`);
          }

        } catch (error) {
          // User pressed Ctrl+C or error occurred
          break;
        }
      }

      ui.info('Saliendo del modo de chat...');
    });

  return command;
}

async function handleChatCommand(command: string, agent: CyberAgent): Promise<string | void> {
  const parts = command.slice(1).split(' ');
  const cmd = parts[0];
  const args = parts.slice(1);

  switch (cmd) {
    case 'exit':
    case 'quit':
      return 'exit';

    case 'clear':
      agent.clearHistory();
      ui.success('Historial de la conversación limpiado');
      break;

    case 'mode':
      if (args.length === 0) {
        ui.info(`Modo actual: ${agent.getMode()}`);
        ui.info('Modos disponibles: base, redteam, blueteam, desktopsecurity, webpentest');
      } else {
        const newMode = args[0] as AgentMode;
        const validModes = ['base', 'redteam', 'blueteam', 'desktopsecurity', 'webpentest'];

        if (validModes.includes(newMode)) {
          agent.setMode(newMode);
          ui.success(`Modo cambiado a ${newMode}`);
        } else {
          ui.error(`Modo inválido: ${newMode}`);
          ui.info(`Modos válidos: ${validModes.join(', ')}`);
        }
      }
      break;

    case 'help':
      ui.box(
        `Comandos de Chat:\n\n` +
        `  ${chalk.cyan('/mode <mode>')} - Cambiar entre modos\n` +
        `  ${chalk.cyan('/clear')} - Limpiar el historial de la conversación\n` +
        `  ${chalk.cyan('/help')} - Mostrar este mensaje de ayuda\n` +
        `  ${chalk.cyan('/exit')} - Salir del modo de chat\n\n` +
        `Modos del Agente:\n` +
        `  ${chalk.cyan('base')} - Asistente de seguridad general\n` +
        `  ${chalk.red('redteam')} - Perspectiva de seguridad ofensiva\n` +
        `  ${chalk.blue('blueteam')} - Enfoque de seguridad defensiva\n` +
        `  ${chalk.green('desktopsecurity')} - Seguridad de computadoras personales\n` +
        `  ${chalk.magenta('webpentest')} - Pruebas de seguridad de aplicaciones web`,
        '❓ Help',
        'info'
      );
      break;

    default:
      ui.error(`Comando desconocido: ${cmd}`);
      ui.info('Escribe /help para ver los comandos disponibles');
      break;
  }
}