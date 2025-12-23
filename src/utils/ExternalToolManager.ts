/**
 * External Tool Manager
 * Detects and manages external CLI security tools (semgrep)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execAsync = promisify(exec);

export interface ExternalTool {
  name: string;
  command: string;
  description: string;
  category: 'scanning' | 'reconnaissance' | 'exploitation' | 'analysis';
  available: boolean;
  version?: string;
  installInstructions?: string;
  path?: string;
}

export class ExternalToolManager {
  private static toolRegistry: Map<string, ExternalTool> = new Map();
  private static scanned: boolean = false;

  /**
   * Define external tools
   */
  private static tools: Omit<ExternalTool, 'available' | 'version'>[] = [
    {
      name: 'semgrep',
      command: 'semgrep',
      description: 'Static analysis for code security and patterns',
      category: 'analysis',
      installInstructions: 'https://semgrep.dev/docs/getting-started/',
    },
  ];

  /**
   * Scan system for available external tools
   */
  static async scan(): Promise<Map<string, ExternalTool>> {
    if (this.scanned) {
      return this.toolRegistry;
    }

    logger.info('Scanning for external security tools...');

    for (const toolDef of this.tools) {
      const tool = await this.checkTool(toolDef);
      this.toolRegistry.set(tool.name, tool);
    }

    this.scanned = true;
    const availableCount = Array.from(this.toolRegistry.values()).filter(t => t.available).length;
    logger.info(`Found ${availableCount}/${this.tools.length} external tools`);

    return this.toolRegistry;
  }

  /**
   * Check if a specific tool is available
   */
  private static async checkTool(
    toolDef: Omit<ExternalTool, 'available' | 'version'>
  ): Promise<ExternalTool> {
    try {
      // Try to get version (most tools support --version or -v)
      const versionCommands = ['--version', '-v', '-V', 'version'];

      for (const versionFlag of versionCommands) {
        try {
          const { stdout, stderr } = await execAsync(`${toolDef.command} ${versionFlag}`, {
            timeout: 5000,
          });

          const output = (stdout || stderr).trim();

          if (output) {
            // Extract version number from output
            const versionMatch = output.match(/v?(\d+\.\d+\.?\d*)/);
            const version = versionMatch ? versionMatch[0] : output.split('\n')[0];

            logger.debug(`Found ${toolDef.name} v${version}`);

            return {
              ...toolDef,
              available: true,
              version,
            };
          }
        } catch {}
      }

      // If version check failed, try 'which' command
      const whichResult = await execAsync(`which ${toolDef.command}`).catch(() => null);
      if (whichResult && (whichResult.stdout || whichResult.stderr)) {
        return {
          ...toolDef,
          available: true,
          version: 'unknown',
          path: whichResult.stdout.trim(),
        };
      }
    } catch (err) {
      logger.debug(`Tool check failed for ${toolDef.name}`);
    }

    return {
      ...toolDef,
      available: false,
    };
  }

  static async isAvailable(toolName: string): Promise<boolean> {
    if (!this.scanned) {
      await this.scan();
    }
    const tool = this.toolRegistry.get(toolName);
    return tool ? tool.available : false;
  }

  static async getTool(toolName: string): Promise<ExternalTool | undefined> {
    if (!this.scanned) {
      await this.scan();
    }
    return this.toolRegistry.get(toolName);
  }

  static async execute(
    toolName: string,
    args: string[],
    options: { timeout?: number; cwd?: string } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const tool = await this.getTool(toolName);
    if (!tool || !tool.available) {
      throw new Error(`Tool ${toolName} is not available`);
    }

    const command = `${tool.command} ${args.join(' ')}`;
    logger.info(`Executing: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: options.timeout || 30000,
        cwd: options.cwd,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return { stdout, stderr, exitCode: 0 };
    } catch (err: any) {
      return {
        stdout: err.stdout || '',
        stderr: err.stderr || err.message,
        exitCode: err.code || 1,
      };
    }
  }
}
