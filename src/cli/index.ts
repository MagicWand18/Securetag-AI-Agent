#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { ui } from '../utils/ui.js';
import { config } from '../utils/config.js';
import { createScanCommand } from './commands/scan.js';
import { createHardenCommand } from './commands/harden.js';
import { createChatCommand } from './commands/chat.js';
import { createInteractiveCommand } from './commands/interactive.js';
import { createWebScanCommand } from './commands/webscan.js';
import { createPcapCommand } from './commands/pcap.js';
import { createReconCommand } from './commands/recon.js';
import { createFlowsCommand } from './commands/flows.js';
import { createMobileScanCommand } from './commands/mobilescan.js';
import { createAutoCommand } from './commands/auto.js';
import { createDepsCommand } from './commands/deps.js';
import { createSSLCommand } from './commands/ssl.js';
import { createScreenshotCommand } from './commands/screenshot.js';
import { createToolsCommand } from './commands/tools.js';
import { createCodeAuditCommand } from './commands/codeaudit.js';
import { InteractiveSession } from './session.js';
import { ExternalToolManager } from '../agent/tools/ExternalToolManager.js';

const program = new Command();

program
  .name('securetag-ai')
  .description('🛡️  AI-powered cybersecurity agent for red/blue teaming and desktop security')
  .version('0.3.0');

// Add commands
program.addCommand(createInteractiveCommand());
program.addCommand(createAutoCommand());
program.addCommand(createFlowsCommand());
program.addCommand(createScanCommand());
program.addCommand(createHardenCommand());
program.addCommand(createChatCommand());
program.addCommand(createWebScanCommand());
program.addCommand(createMobileScanCommand());
program.addCommand(createPcapCommand());
program.addCommand(createReconCommand());
program.addCommand(createDepsCommand());
program.addCommand(createSSLCommand());
program.addCommand(createScreenshotCommand());
program.addCommand(createToolsCommand());
program.addCommand(createCodeAuditCommand());

// Default action - start interactive session
program
  .action(async () => {
    ui.welcome();
    console.log('\n' + chalk.bold('Quick Commands:'));
    console.log(`  ${chalk.cyan('securetag-ai interactive')} - Iniciar sesión interactiva ${chalk.green('(Recomendado)')}`);
    console.log(`  ${chalk.cyan('securetag-ai flows')}       - Flujos pre-configurados ${chalk.green('(Principiante)')}`);
    console.log(`  ${chalk.cyan('securetag-ai auto <task>')} - Ejecución autónoma de IA ${chalk.yellow('(Avanzado)')}`);
    console.log(`  ${chalk.cyan('securetag-ai scan')}        - Escaneo del sistema para problemas de seguridad`);
    console.log(`  ${chalk.cyan('securetag-ai webscan <url>')} - Escaneo de aplicaciones web para vulnerabilidades`);
    console.log(`  ${chalk.cyan('securetag-ai mobilescan <file>')} - Escaneo de aplicaciones móviles (APK/IPA) para vulnerabilidades`);
    console.log(`  ${chalk.cyan('securetag-ai recon <target>')} - OSINT Reconocimiento en dominios/usuarios`);
    console.log(`  ${chalk.cyan('securetag-ai pcap <file>')}   - Analizar archivos de captura de red`);
    console.log(`  ${chalk.cyan('securetag-ai deps [path]')}   - Escanear dependencias JavaScript para vulnerabilidades`);
    console.log(`  ${chalk.cyan('securetag-ai codeaudit <path>')} - Analizar código estático con Semgrep`);
    console.log(`  ${chalk.cyan('securetag-ai ssl <host>')}    - Analizar certificados SSL/TLS`);
    console.log(`  ${chalk.cyan('securetag-ai screenshot <url>')} - Capturar capturas de pantalla de sitios web`);
    console.log(`  ${chalk.cyan('securetag-ai tools')}        - Administrar herramientas de seguridad externas`);
    console.log(`  ${chalk.cyan('securetag-ai harden')}      - Verificar estado de hardening del sistema`);
    console.log(`  ${chalk.cyan('securetag-ai chat')}        - Modo de chat individual`);
    console.log(`  ${chalk.cyan('securetag-ai --help')}      - Mostrar todos los comandos y opciones\n`);

    ui.box(
      `${chalk.bold('Modo Local con Ollama')}\n\n` +
      `URL Base: ${chalk.cyan(process.env.OLLAMA_BASE_URL || 'http://localhost:11434')}\n` +
      `Modelo: ${chalk.cyan('securetag-ai-agent:latest')}\n` +
      `${chalk.dim('No se requieren claves de API externas')}`,
      '⚙️  Configuración',
      'info'
    );

    await ExternalToolManager.scan();
    const semgrepAvailable = await ExternalToolManager.isAvailable('semgrep');
    if (!semgrepAvailable) {
      console.log(
        ui.warning(
          '⚠️  Semgrep no está instalado. Ejecuta `securetag-ai tools --check semgrep` o instala desde https://semgrep.dev/docs/getting-started/'
        )
      );
    }

    const session = new InteractiveSession();
    await session.start();
  });

// Parse arguments
program.parse();