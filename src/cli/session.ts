import inquirer from 'inquirer';
import chalk from 'chalk';
import { ui } from '../utils/ui.js';
import { CyberAgent } from '../agent/core.js';
import { DesktopScanner } from '../agent/tools/scanner.js';
import { HardeningChecker } from '../agent/tools/hardening.js';
import { SecurityReporter } from '../agent/tools/reporter.js';
import { WebScanner } from '../agent/tools/web/WebScanner.js';
import { PcapAnalyzer } from '../agent/tools/PcapAnalyzer.js';
import { PcapReporter } from '../agent/tools/PcapReporter.js';
import { OSINTOrchestrator, OSINTReporter } from '../agent/tools/osint/index.js';
import { WORKFLOWS } from './commands/flows.js';
import { config } from '../utils/config.js';
import { AgentMode, WebScanResult } from '../agent/types.js';
import { AVAILABLE_MODELS, ModelKey, getModelByKey } from '../utils/models.js';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Save scan results to the /scans directory as markdown
 */
async function saveScanResults(result: WebScanResult, analysis?: string): Promise<string> {
  // Create scans directory if it doesn't exist
  const scansDir = path.join(process.cwd(), 'scans');
  await fs.mkdir(scansDir, { recursive: true });

  // Generate filename from hostname and timestamp
  const hostname = result.target.hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${hostname}_${timestamp}.md`;
  const filepath = path.join(scansDir, filename);

  // Format markdown content
  const markdown = formatScanMarkdown(result, analysis);

  // Write to file
  await fs.writeFile(filepath, markdown, 'utf-8');

  return filepath;
}

/**
 * Format scan results as markdown
 */
function formatScanMarkdown(result: WebScanResult, analysis?: string): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Reporte de Seguridad Web`);
  lines.push(`\n**Objetivos:** ${result.target.url}`);
  lines.push(`**Fecha de Escaneo:** ${new Date(result.scanTime).toLocaleString()}`);
  lines.push(`**Duración:** ${result.duration}ms`);
  lines.push(`**Protocolo:** ${result.target.protocol.toUpperCase()}`);
  if (result.technology?.server) {
    lines.push(`**Servidor:** ${result.technology.server}`);
  }
  lines.push('');

  // Summary
  lines.push(`## Resumen`);
  lines.push('');
  lines.push(`| Severidad | Conteo |`);
  lines.push(`|----------|-------|`);
  lines.push(`| 🔴 Crítico | ${result.summary.critical} |`);
  lines.push(`| 🟠 Alto | ${result.summary.high} |`);
  lines.push(`| 🟡 Medio | ${result.summary.medium} |`);
  lines.push(`| 🟢 Bajo | ${result.summary.low} |`);
  lines.push(`| 🔵 Info | ${result.summary.info} |`);
  lines.push(`| **Total** | **${result.summary.total}** |`);
  lines.push('');

  // Findings
  if (result.findings.length > 0) {
    lines.push(`## Hallazgos`);
    lines.push('');

    // Group by severity
    const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    for (const severity of severityOrder) {
      const findings = result.findings.filter(f => f.severity === severity);
      if (findings.length === 0) continue;

      const emoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
        info: '🔵'
      }[severity];

      lines.push(`### ${emoji} ${severity.toUpperCase()}`);
      lines.push('');

      findings.forEach((finding, index) => {
        lines.push(`#### ${index + 1}. ${finding.title}`);
        lines.push('');
        lines.push(`**Descripción:** ${finding.description}`);
        lines.push('');
        if (finding.remediation) {
          lines.push(`**Remediación:** ${finding.remediation}`);
          lines.push('');
        }
        if (finding.references && finding.references.length > 0) {
          lines.push(`**Referencias:**`);
          finding.references.forEach(ref => {
            lines.push(`- ${ref}`);
          });
          lines.push('');
        }
        lines.push(`**Categoría:** ${finding.category}`);
        lines.push('');
        lines.push('---');
        lines.push('');
      });
    }
  } else {
    lines.push(`## Hallazgos`);
    lines.push('');
    lines.push(`✅ No hallazgos de seguridad encontrados!`);
    lines.push('');
  }

  // AI Analysis
  if (analysis) {
    const cleaned = ui.sanitizeAIText(analysis);
    lines.push(`## Análisis de Seguridad con IA`);
    lines.push('');
    lines.push(cleaned);
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*Reporte generado por Securetag AI en ${new Date().toLocaleString()}*`);

  return lines.join('\n');
}

interface SessionState {
  agent: CyberAgent;
  mode: AgentMode;
  model: string;
  commandHistory: string[];
}

export class InteractiveSession {
  private state: SessionState;
  private scanner: DesktopScanner;
  private hardening: HardeningChecker;
  private reporter: SecurityReporter;
  private webScanner: WebScanner;
  private pcapAnalyzer: PcapAnalyzer;
  private pcapReporter: PcapReporter;
  private osintOrchestrator: OSINTOrchestrator;
  private osintReporter: OSINTReporter;

  constructor(initialMode: AgentMode = 'base', model?: string) {
    this.scanner = new DesktopScanner();
    this.hardening = new HardeningChecker();
    this.reporter = new SecurityReporter();
    this.webScanner = new WebScanner();
    this.pcapAnalyzer = new PcapAnalyzer();
    this.pcapReporter = new PcapReporter();
    this.osintOrchestrator = new OSINTOrchestrator();
    this.osintReporter = new OSINTReporter();

    const selectedModel = model || config.model;

    this.state = {
      agent: new CyberAgent({
        mode: initialMode,
        apiKey: config.anthropicApiKey,
        googleApiKey: config.googleApiKey,
        model: selectedModel,
      }),
      mode: initialMode,
      model: selectedModel,
      commandHistory: [],
    };
  }

  /**
   * Start the interactive session
   */
  async start(): Promise<void> {
    ui.clear();
    ui.banner();
    this.showModeStatus();
    this.showWelcome();

    // Main session loop
    while (true) {
      try {
        const prompt = this.getPrompt();
        const { command } = await inquirer.prompt({
          type: 'input',
          name: 'command',
          message: prompt,
          prefix: '',
        } as any);

        if (!command || command.trim() === '') {
          continue;
        }

        const trimmedCommand = command.trim();
        this.state.commandHistory.push(trimmedCommand);

        // Handle commands
        const shouldExit = await this.handleCommand(trimmedCommand);
        if (shouldExit) {
          break;
        }
      } catch (error) {
        // User pressed Ctrl+C or error occurred
        console.log('\n');
        ui.info('Saliendo de la sesión...');
        break;
      }
    }
  }

  private getPrompt(): string {
    const modeIcons = {
      base: '👤',
      redteam: '⚔️',
      blueteam: '🛡️',
      desktopsecurity: '🔒',
      webpentest: '🌐',
      osint: '🔍',
    };

    const icon = modeIcons[this.state.mode];
    const text = `${icon} [${this.state.mode}] >`;

    // Apply color based on mode
    switch (this.state.mode) {
      case 'redteam':
        return chalk.red(text);
      case 'blueteam':
        return chalk.blue(text);
      case 'desktopsecurity':
        return chalk.green(text);
      case 'webpentest':
        return chalk.magenta(text);
      case 'osint':
        return chalk.yellow(text);
      default:
        return chalk.cyan(text);
    }
  }

  private showModeStatus(): void {
    const modelInfo = Object.values(AVAILABLE_MODELS).find(m => m.id === this.state.model);
    const modelName = modelInfo?.name || this.state.model;

    console.log(chalk.dim(`Mode: ${chalk.bold(this.state.mode)} | Model: ${chalk.bold(modelName)}\n`));
  }

  private showWelcome(): void {
    ui.box(
      `Bienvenido a ${chalk.bold('Sesión Interactiva de Securetag AI')}!\n\n` +
      `${chalk.bold('🚀 Guía de Inicio Rápido:')}\n\n` +
      `${chalk.bold('1. Escaneo de tu Sistema:')}\n` +
      `   ${chalk.cyan('scan')} ${chalk.dim('- Verificación de seguridad básica')}\n` +
      `   ${chalk.cyan('scan full')} ${chalk.dim('- Escaneo completo con análisis con IA')}\n\n` +
      `${chalk.bold('2. Pruebas de Sitios Web:')}\n` +
      `   ${chalk.cyan('webscan https://example.com')} ${chalk.dim('- Encuentra vulnerabilidades en sitios web')}\n\n` +
      `${chalk.bold('3. Recopilación de Inteligencia:')}\n` +
      `   ${chalk.cyan('recon example.com')} ${chalk.dim('- Recopila información sobre una entidad')}\n\n` +
      `${chalk.bold('4. Análisis de Tráfico de Red:')}\n` +
      `   ${chalk.cyan('pcap capture.pcap')} ${chalk.dim('- Analiza archivos .pcap')}\n\n` +
      `${chalk.bold('5. Obtener Ayuda:')}\n` +
      `   ${chalk.cyan('help')} ${chalk.dim('- Muestra guía detallada con ejemplos')}\n\n` +
      `${chalk.bold('6. Chat Naturalmente:')}\n` +
      `   ${chalk.dim('Simplemente escribe: ')}${chalk.cyan('Cómo puedo proteger SSH?')}${chalk.dim(' o ')}${chalk.cyan('Explica ataques XSS')}\n\n` +
      `${chalk.dim('💡 Consejo: Escribe ')}${chalk.cyan('help')}${chalk.dim(' para ejemplos detallados de cada comando')}\n` +
      `${chalk.dim('💡 Tip: Cambia de modo con ')}${chalk.cyan('mode <name>')}${chalk.dim(' (base, redteam, blueteam, osint, etc.)')}`,
      '🚀 Sesión Interactiva de Securetag AI',
      'info'
    );
  }

  private async handleCommand(command: string): Promise<boolean> {
    const parts = command.toLowerCase().split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    // Check for built-in commands first
    switch (cmd) {
      case 'exit':
      case 'quit':
        ui.info('¡Hasta luego! 👋');
        return true;

      case 'help':
        this.showHelp();
        return false;

      case 'clear':
        this.state.agent.clearHistory();
        ui.success('Historial de conversación eliminado');
        return false;

      case 'status':
        this.showStatus();
        return false;

      case 'history':
        this.showHistory();
        return false;

      case 'mode':
        await this.handleModeChange(args);
        return false;

      case 'model':
        await this.handleModelSelect();
        return false;

      case 'scan':
        await this.handleScan(args);
        return false;

      case 'webscan':
        await this.handleWebScan(args);
        return false;

      case 'pcap':
        await this.handlePcap(args);
        return false;

      case 'recon':
        await this.handleRecon(args);
        return false;

      case 'harden':
        await this.handleHarden();
        return false;

      case 'flows':
        await this.handleFlows();
        return false;

      case 'auto':
        await this.handleAuto(command);
        return false;

      default:
        // If not a built-in command, send to agent as chat
        await this.handleChat(command);
        return false;
    }
  }

  private showHelp(): void {
    console.log('\n' + chalk.bold.cyan('═'.repeat(80)));
    console.log(chalk.bold.cyan('                           SECURETAG AI - GUIDE DE AYUDA'));
    console.log(chalk.bold.cyan('═'.repeat(80)) + '\n');

    // SCANNING COMMANDS
    console.log(chalk.bold.cyan('📊 ESCANEO Y ANÁLISIS DE SEGURIDAD\n'));

    console.log(chalk.bold('  scan') + chalk.dim(' - Verificación de seguridad básica de tu sistema'));
    console.log(chalk.dim('    Verifica: Información del sistema, procesos activos, puertos abiertos, uso de disco'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('scan') + '\n');

    console.log(chalk.bold('  scan full') + chalk.dim(' - Escaneo completo con análisis con IA'));
    console.log(chalk.dim('    Analiza: Todo lo verificado en el escaneo básico + evaluación detallada de vulnerabilidades'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('scan full') + '\n');

    console.log(chalk.bold('  scan network') + chalk.dim(' - Análisis de conexiones de red activas'));
    console.log(chalk.dim('    Muestra: Conexiones activas, puertos escuchando, tráfico sospechoso'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('scan network') + '\n');

    console.log(chalk.bold('  webscan <url>') + chalk.dim(' - Prueba la seguridad de aplicaciones web'));
    console.log(chalk.dim('    Tests: Headers, CSRF, cookies, OWASP Top 10 vulnerabilities'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('webscan https://example.com'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('webscan http://localhost:3000') + '\n');

    console.log(chalk.bold('  recon <target>') + chalk.dim(' - Recopilación de información sobre entidades'));
    console.log(chalk.dim('    Recopila: DNS, WHOIS, subdomains, emails, breaches, social media'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('recon example.com') + chalk.dim(' (scan de dominio)'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('recon johndoe') + chalk.dim(' (búsqueda de usuario)'));
    console.log(chalk.yellow('    Opciones: ') + chalk.dim('--quick (fast), --full (comprehensive), --domain, --person') + '\n');

    console.log(chalk.bold('  pcap <file>') + chalk.dim(' - Análisis de archivos de captura de red (formato Wireshark)'));
    console.log(chalk.dim('    Analiza: Paquetes, protocolos, conversaciones, DNS, HTTP, anomalías'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('pcap capture.pcap'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('pcap /path/to/traffic.pcapng') + '\n');

    console.log(chalk.bold('  harden') + chalk.dim(' - Verificación de hardening del sistema y postura de seguridad'));
    console.log(chalk.dim('    Verifica: Firewall, cifrado de disco, antivirus, configuración de seguridad'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('harden') + '\n');

    console.log(chalk.bold('  flows') + chalk.dim(' - Flujos pre-configurados para tareas comunes') + chalk.green(' (Amigable para principiantes)'));
    console.log(chalk.dim('    Incluye: Verificación rápida de seguridad, auditorías web, OSINT, respuesta a incidentes, CTF, tutoriales'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('flows') + '\n');

    console.log(chalk.bold('  auto <task>') + chalk.dim(' - Ejecución automática de tareas con planificación IA') + chalk.green(' (NUEVO!)'));
    console.log(chalk.dim('    AI divide las tareas en pasos y las ejecuta de forma autónoma'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('auto escanea example.com para encontrar vulnerabilidades'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('auto recopila información sobre target-company.com'));
    console.log(chalk.dim('    Opciones: --mode <mode>, --verbose, --export <file>') + '\n');

    // SESSION CONTROL
    console.log(chalk.bold.cyan('⚙️  CONTROL DE SESIÓN\n'));

    console.log(chalk.bold('  mode <mode>') + chalk.dim(' - Cambia el enfoque y la especialización del agente IA'));
    console.log(chalk.dim('    Modos disponibles (ver más detalles en Modos del Agente abajo)'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('mode webpentest'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('mode osint') + '\n');

    console.log(chalk.bold('  model') + chalk.dim(' - Selecciona el modelo de IA a utilizar (Claude o Gemini)'));
    console.log(chalk.dim('    Abre un menú interactivo para elegir entre los modelos disponibles'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('model') + '\n');

    console.log(chalk.bold('  status') + chalk.dim(' - Muestra información sobre la sesión actual'));
    console.log(chalk.dim('    Muestra: Modo actual, modelo, contador de comandos, longitud de la conversación'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('status') + '\n');

    console.log(chalk.bold('  clear') + chalk.dim(' - Limpia la historia de la conversación (inicio fresco)'));
    console.log(chalk.dim('    Restablece la memoria de la IA de los mensajes anteriores en esta sesión'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('clear') + '\n');

    console.log(chalk.bold('  history') + chalk.dim(' - Muestra los últimos comandos que has ejecutado'));
    console.log(chalk.dim('    Muestra los últimos 10 comandos de esta sesión'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('history') + '\n');

    // CHAT
    console.log(chalk.bold.cyan('💬 CHAT CONVERSACIONAL\n'));
    console.log(chalk.dim('  Escribe naturalmente para hacer preguntas o recibir orientación:'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('Cómo puedo proteger mi servidor SSH?'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('Explica qué es una inyección SQL'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('¿Qué puertos debería cerrar en mi firewall?') + '\n');

    // EXIT
    console.log(chalk.bold.cyan('🚪 CERRAR SESIÓN\n'));
    console.log(chalk.bold('  exit') + chalk.dim(' or ') + chalk.bold('quit') + chalk.dim(' - Cierra la sesión interactiva'));
    console.log(chalk.yellow('    Ejemplo: ') + chalk.cyan('exit') + '\n');

    // AGENT MODES
    console.log(chalk.bold.cyan('═'.repeat(80)));
    console.log(chalk.bold.cyan('🎭 MODOS DEL AGENTE - Cada modo cambia cómo la IA pensa y responde\n'));

    console.log(chalk.cyan('  base ') + chalk.bold('🧠') + chalk.dim(' - Asistente de seguridad general'));
    console.log(chalk.dim('    Usar para: Preguntas generales, aprendizaje, tareas mixtas'));
    console.log(chalk.dim('    Mejor para: Principiantes, temas de seguridad amplios\n'));

    console.log(chalk.red('  redteam ') + chalk.bold('⚔️') + chalk.dim(' - Enfoque de seguridad ofensivo (perspectiva del atacante)'));
    console.log(chalk.dim('    Usar para: Encontrar vulnerabilidades, análisis de superficie de ataque'));
    console.log(chalk.dim('    Mejor para: Penetration testing, security assessments\n'));

    console.log(chalk.blue('  blueteam ') + chalk.bold('🛡️') + chalk.dim(' - Enfoque de seguridad defensivo (perspectiva del defensor)'));
    console.log(chalk.dim('    Usar para: Detección de amenazas, respuesta a incidentes, monitoreo'));
    console.log(chalk.dim('    Mejor para: Analistas de SOC, estrategias de defensa\n'));

    console.log(chalk.green('  desktopsecurity ') + chalk.bold('🔒') + chalk.dim(' - Seguridad de computadoras personales'));
    console.log(chalk.dim('    Usar para: Proteger tu portátil/escritorio, privacidad, malware'));
    console.log(chalk.dim('    Mejor para: Seguridad de dispositivos personales, usuarios promedio\n'));

    console.log(chalk.magenta('  webpentest ') + chalk.bold('🌐') + chalk.dim(' - Pruebas de seguridad de aplicaciones web'));
    console.log(chalk.dim('    Usar para: Probar sitios web, encontrar vulnerabilidades, CTFs'));
    console.log(chalk.dim('    Mejor para: Desarrolladores web, hunters de bugs\n'));

    console.log(chalk.yellow('  osint ') + chalk.bold('🔍') + chalk.dim(' - Recopilación de Inteligencia de Fuente Abierta'));
    console.log(chalk.dim('    Usar para: Recopilación pasiva de información, huella digital, investigación'));
    console.log(chalk.dim('    Mejor para: Investigar dominios, nombres de usuario, huellas digitales\n'));

    console.log(chalk.bold.cyan('═'.repeat(80)));
    console.log(chalk.dim('💡 Tip: Usa ') + chalk.cyan('mode <name>') + chalk.dim(' para cambiar de modo basado en tu tarea'));
    console.log(chalk.dim('💡 Tip: Comandos pueden ser combinados con chat - intenta ') + chalk.cyan('scan') + chalk.dim(' luego hacer preguntas sobre los resultados'));
    console.log(chalk.bold.cyan('═'.repeat(80)) + '\n');
  }

  private showStatus(): void {
    const modelInfo = Object.values(AVAILABLE_MODELS).find(m => m.id === this.state.model);

    ui.box(
      `${chalk.bold('Modo Actual:')} ${this.state.mode}\n` +
      `${chalk.bold('Modelo:')} ${modelInfo?.name || this.state.model}\n` +
      `${chalk.bold('Comandos Ejecutados:')} ${this.state.commandHistory.length}\n` +
      `${chalk.bold('Mensajes de la Conversación:')} ${this.state.agent.getHistory().length}`,
      '📊 Estado de la Sesiòn',
      'info'
    );
  }

  private showHistory(): void {
    if (this.state.commandHistory.length === 0) {
      ui.info('No hay comandos en la historia todavía');
      return;
    }

    console.log(chalk.bold('\n📜 Historial de Comandos:\n'));
    this.state.commandHistory.slice(-10).forEach((cmd, index) => {
      const num = this.state.commandHistory.length - 10 + index + 1;
      console.log(chalk.dim(`  ${num}.`) + ` ${cmd}`);
    });
    console.log('');
  }

  private async handleModeChange(args: string[]): Promise<void> {
    if (args.length === 0) {
      ui.info(`Modo Actual: ${this.state.mode}`);
      ui.info('Modos Disponibles: base, redteam, blueteam, desktopsecurity, webpentest, osint');
      return;
    }

    const newMode = args[0] as AgentMode;
    const validModes = ['base', 'redteam', 'blueteam', 'desktopsecurity', 'webpentest', 'osint'];

    if (validModes.includes(newMode)) {
      this.state.mode = newMode;
      this.state.agent.setMode(newMode);
      ui.success(`Modo Cambiado a ${chalk.bold(newMode)}`);
      this.showModeStatus();
    } else {
      ui.error(`Modo Inválido: ${newMode}`);
      ui.info(`Modos Disponibles: ${validModes.join(', ')}`);
    }
  }

  private async handleModelSelect(): Promise<void> {
    const choices = Object.entries(AVAILABLE_MODELS).map(([key, model]) => ({
      name: `${model.name} ${model.recommended ? chalk.green('(Recomendado)') : ''}\n  ${chalk.dim(model.description)}`,
      value: key,
      short: model.name,
    }));

    const { selectedModel } = await inquirer.prompt({
      type: 'list',
      name: 'selectedModel',
      message: 'Selecciona el modelo de IA:',
      choices,
      default: 'sonnet-4',
    } as any);

    const model = getModelByKey(selectedModel);
    if (model) {
      this.state.model = model.id;
      this.state.agent = new CyberAgent({
        mode: this.state.mode,
        apiKey: config.anthropicApiKey,
        googleApiKey: config.googleApiKey,
        model: model.id,
      });
      ui.success(`Modelo Cambiado a ${chalk.bold(model.name)}`);
      this.showModeStatus();
    }
  }

  private async handleScan(args: string[]): Promise<void> {
    const scanType = args[0] || 'quick';

    try {
      if (scanType === 'full') {
        const spinner = ui.spinner('Realizando escaneo completo del sistema...');
        const result = await this.scanner.scanSystem();
        spinner.succeed('Escaneo del sistema completado');

        if (result.success) {
          ui.info('Realizando análisis de seguridad integral con IA...');
          const aiSpinner = ui.spinner('Analizando seguridad del sistema con IA...');
          const analysis = await this.state.agent.analyze(
            'Realiza un análisis de seguridad integral del sistema. Identifica vulnerabilidades, desconfiguraciones y riesgos potenciales. Proporciona recomendaciones específicas y accionables.',
            result.data
          );
          aiSpinner.succeed('Análisis completado');
          console.log('\n' + ui.formatAIResponse(analysis) + '\n');
        }
      } else if (scanType === 'network') {
        const spinner = ui.spinner('Realizando escaneo de conexiones de red...');
        const result = await this.scanner.scanNetwork();
        spinner.succeed('Escaneo de conexiones de red completado');

        if (result.success) {
          const aiSpinner = ui.spinner('Analizando conexiones de red...');
          const analysis = await this.state.agent.analyze(
            'Analiza estas conexiones de red en busca de problemas de seguridad. Identifica conexiones sospechosas, puertos inusuales y posibles riesgos.',
            result.data
          );
          aiSpinner.succeed('Análisis completado');
          console.log('\n' + ui.formatAIResponse(analysis) + '\n');
        }
      } else {
        // Quick scan
        const spinner = ui.spinner('Realizando chequeo de seguridad rápido...');
        const result = await this.scanner.quickCheck();
        spinner.succeed('Chequeo rápido completado');

        if (result.success && result.data.findings) {
          const scanResult = this.reporter.createScanResult(result.data.findings, new Date());
          this.reporter.displayReport(scanResult);
        }
      }
    } catch (error) {
      ui.error(`Error en el escaneo: ${error}`);
    }
  }

  private async handleHarden(): Promise<void> {
    try {
      const spinner = ui.spinner('Realizando chequeo de hardening del sistema...');
      const result = await this.hardening.checkHardening();
      spinner.succeed('Chequeo de hardening completado');

      if (result.success && result.data.findings) {
        const scanResult = this.reporter.createScanResult(result.data.findings, new Date());
        this.reporter.displayReport(scanResult);

        const aiSpinner = ui.spinner('Obteniendo recomendaciones de seguridad con IA...');
        const analysis = await this.state.agent.analyze(
          'Basado en estos resultados de hardening, proporciona recomendaciones prioritarias y accionables para mejorar la seguridad del sistema. Enfoque en los problemas más críticos primero.',
          result.data.findings
        );
        aiSpinner.succeed('Recomendaciones listas');
        console.log('\n' + ui.formatAIResponse(analysis) + '\n');
      }
    } catch (error) {
      ui.error(`Error en el chequeo de hardening: ${error}`);
    }
  }

  private async handleFlows(): Promise<void> {
    ui.section('Flujos Pre-configurados');
    console.log(chalk.gray('Elige un flujo para comenzar rápidamente\n'));

    // Group flows by category
    const grouped = WORKFLOWS.reduce((acc, flow) => {
      if (!acc[flow.category]) acc[flow.category] = [];
      acc[flow.category].push(flow);
      return acc;
    }, {} as Record<string, typeof WORKFLOWS>);

    const choices = [];

    // Create categorized choices
    for (const [category, flows] of Object.entries(grouped)) {
      choices.push(new inquirer.Separator(chalk.bold.cyan(`\n${category.toUpperCase()}:`)));
      flows.forEach(flow => {
        const difficultyEmoji = {
          beginner: '🟢',
          intermediate: '🟡',
          advanced: '🔴',
        }[flow.difficulty];

        choices.push({
          name: `  ${flow.name} ${difficultyEmoji} ${chalk.gray(`(${flow.estimatedTime})`)}`,
          value: flow.id,
          short: flow.name,
        });
      });
    }

    const { selectedFlowId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedFlowId',
        message: 'Selecciona un flujo:',
        choices,
        pageSize: 20,
      },
    ]);

    const selectedFlow = WORKFLOWS.find(f => f.id === selectedFlowId);
    if (!selectedFlow) {
      ui.error('Flujo no encontrado');
      return;
    }

    // Show flow details
    ui.section(selectedFlow.name);
    console.log(chalk.gray(selectedFlow.description));
    console.log(chalk.gray(`\nDificultad: ${selectedFlow.difficulty} | Tiempo estimado: ${selectedFlow.estimatedTime}\n`));

    console.log(chalk.bold('Pasos:'));
    selectedFlow.steps.forEach((step, i) => {
      console.log(chalk.gray(`  ${i + 1}. ${step}`));
    });
    console.log('');

    // Confirm execution
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '¿Estás listo para comenzar este flujo?',
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Flujo cancelado.\n'));
      return;
    }

    // Execute the workflow
    try {
      await this.executeWorkflow(selectedFlow);
    } catch (error: any) {
      ui.error(`Error en la ejecución del flujo: ${error.message}`);
    }
  }

  /**
   * Execute a workflow based on its ID
   */
  private async executeWorkflow(flow: typeof WORKFLOWS[0]): Promise<void> {
    switch (flow.id) {
      case 'quick-security-check':
        await this.executeQuickSecurityCheck(flow);
        break;
      case 'website-security-audit':
        await this.executeWebsiteAudit(flow);
        break;
      case 'domain-intel-gathering':
        await this.executeDomainIntel(flow);
        break;
      case 'incident-response-triage':
        await this.executeIncidentTriage(flow);
        break;
      case 'harden-system':
        await this.executeSystemHardening(flow);
        break;
      default:
        console.log(chalk.yellow(`\nFlujo "${flow.id}" implementación próximamente!`));
        console.log(chalk.gray('Usa el comando standalone para ejecución guiada:'));
        console.log(chalk.cyan(`  Flujos securetag-ai \n`));
    }
  }

  /**
   * Quick Security Check Workflow
   */
  private async executeQuickSecurityCheck(flow: typeof WORKFLOWS[0]): Promise<void> {
    const spinner = ui.spinner('Escaneando seguridad del sistema...').start();

    const scanResultRaw = await this.scanner.quickCheck();
    spinner.succeed('Escaneo del sistema completado');

    const hardeningSpinner = ui.spinner('Analizando configuraciones de seguridad...').start();
    const hardeningResultRaw = await this.hardening.checkHardening();
    hardeningSpinner.succeed('Configuraciones de seguridad analizadas');

    const allFindings = [
      ...(scanResultRaw.success && scanResultRaw.data?.findings ? scanResultRaw.data.findings : []),
      ...(hardeningResultRaw.success && hardeningResultRaw.data?.findings ? hardeningResultRaw.data.findings : [])
    ];

    const scanResult = this.reporter.createScanResult(allFindings, new Date());
    this.reporter.displayReport(scanResult);

    const aiSpinner = ui.spinner('Obteniendo recomendaciones de seguridad de la IA...').start();
    const analysis = await this.state.agent.analyze(
      'Analiza este escaneo de seguridad y proporciona recomendaciones accionables para mejorar la seguridad del sistema. Enfócate primero en los problemas más críticos.',
      allFindings
    );
    aiSpinner.succeed('Análisis de seguridad de la IA completado');

    console.log('');
    ui.section('🧠 Recomendaciones de Seguridad de la IA');
    console.log(ui.formatAIResponse(analysis) + '\n');
  }

  /**
   * Website Security Audit Workflow
   */
  private async executeWebsiteAudit(flow: typeof WORKFLOWS[0]): Promise<void> {
    const { url } = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: 'Ingresa la URL del sitio web a auditar:',
        validate: (input) => input.startsWith('http') || 'Por favor, ingresa una URL válida (http:// o https://)',
      },
    ]);

    console.log(chalk.yellow('\n⚠️  Asegúrate de tener autorización para escanear este sitio web!'));
    const { authorized } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'authorized',
        message: '¿Tienes autorización para escanear este sitio web?',
        default: false,
      },
    ]);

    if (!authorized) {
      console.log(chalk.red('❌ No se ha autorizado para escanear este sitio web. Escaneo cancelado.\n'));
      return;
    }

    // Use the existing webscan handler
    await this.handleWebScan([url]);
  }

  /**
   * Domain Intelligence Gathering Workflow
   */
  private async executeDomainIntel(flow: typeof WORKFLOWS[0]): Promise<void> {
    const { domain } = await inquirer.prompt([
      {
        type: 'input',
        name: 'domain',
        message: 'Ingresa el dominio a investigar:',
        validate: (input) => input.length > 0 || 'Se requiere un dominio',
      },
    ]);

    // Use the existing recon handler with --domain flag
    await this.handleRecon([domain, '--domain']);
  }

  /**
   * Incident Response Triage Workflow
   */
  private async executeIncidentTriage(flow: typeof WORKFLOWS[0]): Promise<void> {
    const spinner = ui.spinner('Realizando escaneo de triage de incidente...').start();

    const scanResultRaw = await this.scanner.scanSystem();
    spinner.succeed('Escaneo del sistema completado');

    const findings = scanResultRaw.success && scanResultRaw.data?.findings ? scanResultRaw.data.findings : [];
    const scanResult = this.reporter.createScanResult(findings, new Date());
    this.reporter.displayReport(scanResult);

    const aiSpinner = ui.spinner('Realizando análisis de incidente...').start();
    const analysis = await this.state.agent.analyze(
      `Realiza triage de incidente en este escaneo del sistema. Busca:
          - Procesos o servicios sospechosos
          - Conexiones de red inusuales
          - Indicadores de posible compromiso
          - Configuraciones de seguridad incorrectas
          - Acciones inmediatas recomendadas

          Proporciona hallazgos prioritarios y pasos accionables.`,
      findings
    );
    aiSpinner.succeed('Análisis de incidente completado');

    console.log('');
    ui.section('🚨 Reporte Triage de Incidente');
    console.log(ui.formatAIResponse(analysis) + '\n');
  }

  /**
   * System Hardening Workflow
   */
  private async executeSystemHardening(flow: typeof WORKFLOWS[0]): Promise<void> {
    const spinner = ui.spinner('Realizando auditoría de configuraciones de seguridad...').start();

    const resultsRaw = await this.hardening.checkHardening();
    spinner.succeed('Auditoría de configuraciones de seguridad completada');

    const findings = resultsRaw.success && resultsRaw.data?.findings ? resultsRaw.data.findings : [];
    const scanResult = this.reporter.createScanResult(findings, new Date());
    this.reporter.displayReport(scanResult);

    const aiSpinner = ui.spinner('Generando guía de hardening...').start();
    const analysis = await this.state.agent.analyze(
      'Basado en esta auditoría de seguridad, proporciona recomendaciones paso a paso para mejorar la seguridad del sistema. Prioriza por impacto y incluye comandos o configuraciones específicas para cambiar donde sea posible.',
      findings
    );
    aiSpinner.succeed('Guía de hardening generada');

    console.log('');
    ui.section('🔒 Guía de Hardening del Sistema');
    console.log(ui.formatAIResponse(analysis) + '\n');
  }

  /**
   * Handle autonomous task execution
   */
  private async handleAuto(command: string): Promise<void> {
    // Extract task from command (everything after "auto ")
    const task = command.substring(5).trim(); // Remove "auto " prefix

    if (!task) {
      ui.error('Por favor, proporciona una descripción de la tarea');
      ui.info('Uso: auto <descripción de la tarea>');
      ui.info('Ejemplo: auto escanear example.com por vulnerabilidades');
      ui.info('Ejemplo: auto recopilar información sobre target-company.com');
      return;
    }

    // Import AgenticCore dynamically
    const { AgenticCore } = await import('../agent/core/agentic.js');

    ui.section('🧠 AGENTE AUTÓNOMO');
    console.log(chalk.gray(`Tarea: ${task}`));
    console.log(chalk.gray(`Modo: ${this.state.mode.toUpperCase()}`));
    console.log(chalk.gray(`Modelo: ${this.state.model}\n`));

    try {
      // Get model info
      const modelInfo = getModelByKey(this.state.model as ModelKey);
      if (!modelInfo) {
        throw new Error(`Modelo no válido: ${this.state.model}`);
      }

      // Create agentic config using session's current mode and model
      const agenticConfig = {
        apiKey: modelInfo.provider === 'claude' ? config.anthropicApiKey : undefined,
        googleApiKey: modelInfo.provider === 'gemini' ? config.googleApiKey : undefined,
        model: modelInfo.id,
        mode: this.state.mode,
        maxSteps: 20,
        maxDuration: 600000,
        autoApprove: false,
        verbose: true, // Always verbose in interactive mode
      };

      const agent = new AgenticCore(agenticConfig);
      const result = await agent.executeTask(task);

      if (result.success) {
        ui.success('\n✅ Tarea completada con éxito');

        const summary = {
          stepsCompleted: result.context.completedSteps.length,
          stepsTotal: result.context.plan.steps.length,
          findingsCount: result.context.findings.length,
          errorsCount: result.context.errors.length,
          duration: (result.duration / 1000).toFixed(1) + 's',
        };

        ui.box(
          `Pasos: ${summary.stepsCompleted}/${summary.stepsTotal}\n` +
          `Hallazgos: ${summary.findingsCount}\n` +
          `Errores: ${summary.errorsCount}\n` +
          `Duración: ${summary.duration}`
        );

        // Show findings if any
        if (result.context.findings.length > 0) {
          console.log('\n' + chalk.bold('Hallazgos de Seguridad:'));
          result.context.findings.slice(0, 5).forEach((finding, idx) => {
            console.log(chalk.gray(`${idx + 1}. [${finding.severity.toUpperCase()}] ${finding.title}`));
          });

          if (result.context.findings.length > 5) {
            console.log(chalk.gray(`  ... y ${result.context.findings.length - 5} más`));
          }
        }

        console.log('');
      } else {
        ui.error('\n❌ Tarea fallida');
        ui.box(`Error: ${result.error}\nDuración: ${(result.duration / 1000).toFixed(1)}s`);
      }
    } catch (error) {
      ui.error(`\nEjecución autónoma fallida: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleChat(message: string): Promise<void> {
    const spinner = ui.spinner('Pensando...');

    try {
      const response = await this.state.agent.chat(message);
      spinner.stop();

      console.log(chalk.red('\n🧠 Securetag AI:'));
      console.log(ui.formatAIResponse(response) + '\n');
    } catch (error) {
      spinner.fail('Error comunicándose con el agente');
      ui.error(`${error}`);
    }
  }

  private async handleWebScan(args: string[]): Promise<void> {
    if (args.length === 0) {
      ui.error('Por favor, proporciona una URL para escanear');
      ui.info('Uso: webscan <url>');
      return;
    }

    const url = args[0];

    try {
      console.log('');
      ui.section(`Escaneo de Seguridad Web: ${url}`);
      console.log('');

      // Progress callback
      const onProgress = (message: string) => {
        console.log(message);
      };

      const result = await this.webScanner.quickScan(url, { onProgress });
      ui.success('✓ Escaneo de Seguridad Web completado\n');

      console.log(`Objetivo: ${result.target.url}`);
      console.log(`Hallazgos: ${result.summary.total}`);
      console.log('');

      let analysis: string | undefined;
      if (result.findings.length > 0) {
        result.findings.slice(0, 5).forEach(finding => {
          ui.finding(finding.severity, finding.title, finding.description);
        });

        if (result.findings.length > 5) {
          console.log(`\n... y ${result.findings.length - 5} más hallazgos`);
        }

        // AI Analysis
        const aiSpinner = ui.spinner('🧠 Analizando con IA...');
        analysis = await this.state.agent.analyze(
          'Analiza estos hallazgos de seguridad web. Prioriza los problemas y ofrece guía de remediación.',
          { findings: result.findings, target: result.target }
        );
        aiSpinner.succeed('✓ Análisis con IA completado');
        console.log('\n' + ui.formatAIResponse(analysis) + '\n');
      } else {
        ui.success('No se encontraron problemas de seguridad!');
      }

      // Save scan results
      const savedPath = await saveScanResults(result, analysis);
      ui.success(`📁 Resultados del Escaneo guardados en: ${savedPath}`);
    } catch (error) {
      ui.error(`Escaneo de Seguridad Web fallido: ${error}`);
    }
  }

  private async handlePcap(args: string[]): Promise<void> {
    if (args.length === 0) {
      ui.error('Por favor, proporciona un archivo pcap para analizar');
      ui.info('Uso: pcap <archivo.pcap>');
      return;
    }

    const filePath = args[0];

    try {
      console.log('');
      ui.section(`📦 Análisis de Tráfico de Red: ${filePath}`);
      console.log('');

      const spinner = ui.spinner('Analizando archivo pcap...');
      const analysis = await this.pcapAnalyzer.analyze(filePath, {
        includePackets: false,
        statisticsOnly: false,
      });
      spinner.succeed('✓ Análisis de archivo pcap completado');
      console.log('');

      // Display summary
      this.pcapReporter.displaySummary(analysis);

      // AI Analysis
      if (analysis.packetCount > 0) {
        const aiSpinner = ui.spinner('🧠 Analizando tráfico de red con IA...');

        // Build analysis prompt
        let prompt = `Analiza la siguiente captura de tráfico de red:\n\n`;
        prompt += `Archivo: ${analysis.filename}\n`;
        prompt += `Paquetes: ${analysis.packetCount.toLocaleString()}\n`;
        prompt += `Duración: ${this.formatDuration(analysis.captureDuration)}\n\n`;

        prompt += `Distribución de Protocolos:\n`;
        for (const stat of analysis.protocolStats.slice(0, 10)) {
          prompt += `- ${stat.protocol}: ${stat.packets} paquetes (${stat.percentage.toFixed(1)}%)\n`;
        }
        prompt += `\n`;

        if (analysis.conversations.length > 0) {
          prompt += `Top Conversaciones:\n`;
          for (const conv of analysis.conversations.slice(0, 5)) {
            prompt += `- ${conv.protocol} ${conv.sourceAddr}:${conv.sourcePort} ↔ `;
            prompt += `${conv.destAddr}:${conv.destPort} (${conv.packets} paquetes)\n`;
          }
          prompt += `\n`;
        }

        if (analysis.alerts.length > 0) {
          prompt += `⚠️  Alertas Detectadas:\n`;
          for (const alert of analysis.alerts) {
            prompt += `- ${alert}\n`;
          }
          prompt += `\n`;
        }

        prompt += `Proporciona un análisis de seguridad de este tráfico de red, destacando:\n`;
        prompt += `1. Patrones de tráfico general y lo que indican\n`;
        prompt += `2. Cualquier actividad sospechosa o inusual\n`;
        prompt += `3. Concerns de seguridad y posibles amenazas\n`;
        prompt += `4. Recomendaciones para investigaciones adicionales\n`;

        const aiResponse = await this.state.agent.analyze(
          prompt,
          'network traffic analysis'
        );
        aiSpinner.succeed('✓ Análisis completado');
        console.log('\n' + ui.formatAIResponse(aiResponse) + '\n');
      }

      ui.success('✓ Análisis de pcap completado!');
    } catch (error: any) {
      ui.error(`Análisis de pcap fallido: ${error.message}`);
    }
  }

  private async handleRecon(args: string[]): Promise<void> {
    if (args.length === 0) {
      ui.error('Por favor, proporciona una objetivo para investigar');
      ui.info('Uso: recon <dominio|usuario|ip>');
      ui.info('Opciones: --quick, --full, --domain, --person');
      return;
    }

    const target = args[0];

    // Parse options
    let scanType: 'quick' | 'full' | 'domain' | 'person' = 'quick';
    if (args.includes('--full')) scanType = 'full';
    else if (args.includes('--domain')) scanType = 'domain';
    else if (args.includes('--person')) scanType = 'person';

    try {
      console.log('');
      ui.section(`🔍 Reconocimiento OSINT: ${target}`);
      console.log(`Tipo de Escaneo: ${scanType.toUpperCase()}`);
      console.log('');

      const spinner = ui.spinner('Iniciando reconocimiento...');

      let result;
      try {
        switch (scanType) {
          case 'quick':
            result = await this.osintOrchestrator.quickScan(target);
            break;
          case 'full':
            result = await this.osintOrchestrator.fullScan(target);
            break;
          case 'domain':
            result = await this.osintOrchestrator.domainScan(target);
            break;
          case 'person':
            result = await this.osintOrchestrator.personScan(target);
            break;
        }
        spinner.succeed('✓ Reconocimiento completado');
      } catch (error) {
        spinner.fail('Reconocimiento fallido');
        throw error;
      }

      console.log('');

      // Display results
      this.osintReporter.displayResults(result);

      // AI Analysis
      if (result.summary.totalFindings > 0) {
        const aiSpinner = ui.spinner('🧠 Analizando hallazgos OSINT con IA...');

        // Build analysis prompt
        let prompt = `Analiza los siguientes resultados de reconocimiento OSINT:\n\n`;
        prompt += `Objetivo: ${result.target}\n`;
        prompt += `Hallazgos: ${result.summary.totalFindings}\n`;
        prompt += `Puntuación de Riesgo: ${result.summary.riskScore}/100\n\n`;

        // Add key findings
        if (result.results.dns) {
          prompt += `Registros DNS Encontrados: ${Object.keys(result.results.dns.records).length} tipos\n`;
        }
        if (result.results.whois) {
          prompt += `WHOIS: ${result.results.whois.registrar || 'Registro desconocido'}\n`;
        }
        if (result.results.subdomains && result.results.subdomains.total > 0) {
          prompt += `Subdominios Encontrados: ${result.results.subdomains.total}\n`;
        }
        if (result.results.emails && result.results.emails.total > 0) {
          prompt += `Correos Encontrados: ${result.results.emails.total}\n`;
        }
        if (result.results.usernames && result.results.usernames.totalFound > 0) {
          prompt += `Perfiles de Redes Sociales Encontrados: ${result.results.usernames.totalFound}\n`;
        }
        if (result.results.breaches && result.results.breaches.length > 0) {
          prompt += `⚠️  Breaches de Datos Encontradas: ${result.results.breaches.length}\n`;
        }

        prompt += `\nProporciona:\n`;
        prompt += `1. Evaluación de postura de seguridad\n`;
        prompt += `2. Análisis de superficie de ataque\n`;
        prompt += `3. Preocupaciones de privacidad y exposición\n`;
        prompt += `4. Recomendaciones de hardening\n`;

        const aiResponse = await this.state.agent.analyze(
          prompt,
          result
        );
        aiSpinner.succeed('✓ Análisis completado');
        console.log('\n' + ui.formatAIResponse(aiResponse) + '\n');
      }

      // Summary
      const riskLevel =
        result.summary.riskScore > 70
          ? 'HIGH'
          : result.summary.riskScore > 40
            ? 'MEDIUM'
            : 'LOW';

      ui.info(`Reconocimiento completado: ${result.summary.totalFindings} hallazgos | Riesgo: ${riskLevel}`);
    } catch (error: any) {
      ui.error(`Reconocimiento fallido: ${error.message || error}`);
    }
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
  }
}