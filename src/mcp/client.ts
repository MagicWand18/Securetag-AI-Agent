/**
 * MCP Client Layer
 * Manages connections to MCP security tool servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';

export interface MCPServerConfig {
  name: string;
  enabled: boolean;
  command: string;
  args: string[];
  env?: Record<string, string>;
  description?: string;
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text?: string;
    data?: any;
  }>;
  isError?: boolean;
}

/**
 * MCP Client Manager
 * Handles connections to multiple MCP servers
 */
export class MCPClientManager {
  private clients: Map<string, Client>;
  private transports: Map<string, StdioClientTransport>;
  private connected: Set<string>;

  constructor() {
    this.clients = new Map();
    this.transports = new Map();
    this.connected = new Set();
  }

  /**
   * Connect to an MCP server
   */
  async connect(config: MCPServerConfig): Promise<void> {
    if (this.connected.has(config.name)) {
      logger.info(`Servidor MCP ${config.name} ya está conectado`);
      return;
    }

    try {
      logger.info(`Conectando al servidor MCP: ${config.name}`);

      // Create stdio transport
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });

      // Create client
      const client = new Client(
        {
          name: 'securetag-ai',
          version: '0.4.0',
        },
        {
          capabilities: {
            sampling: {},
          },
        }
      );

      // Connect
      await client.connect(transport);

      // Store references
      this.clients.set(config.name, client);
      this.transports.set(config.name, transport);
      this.connected.add(config.name);

      logger.info(`Conexión exitosa al servidor MCP: ${config.name}`);
    } catch (error: any) {
      logger.error(`Error al conectar al servidor MCP ${config.name}:`, error);
      throw new Error(`Error de conexión MCP para ${config.name}: ${error.message}`);
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverName: string): Promise<void> {
    if (!this.connected.has(serverName)) {
      return;
    }

    try {
      const client = this.clients.get(serverName);
      if (client) {
        await client.close();
      }

      this.clients.delete(serverName);
      this.transports.delete(serverName);
      this.connected.delete(serverName);

      logger.info(`Desconexión exitosa del servidor MCP: ${serverName}`);
    } catch (error: any) {
      logger.error(`Error al desconectar del servidor MCP ${serverName}:`, error);
    }
  }

  /**
   * Disconnect from all MCP servers
   */
  async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.connected);
    for (const name of serverNames) {
      await this.disconnect(name);
    }
  }

  /**
   * Check if a server is connected
   */
  isConnected(serverName: string): boolean {
    return this.connected.has(serverName);
  }

  /**
   * Get list of connected servers
   */
  getConnectedServers(): string[] {
    return Array.from(this.connected);
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, any> = {}
  ): Promise<MCPToolResult> {
    if (!this.connected.has(serverName)) {
      throw new Error(`Servidor MCP ${serverName} no está conectado`);
    }

    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Cliente no encontrado para el servidor MCP ${serverName}`);
    }

    try {
      logger.info(`Llamando a la herramienta MCP: ${serverName}.${toolName}`, { args });

      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      logger.info(`Resultado de la herramienta MCP ${serverName}.${toolName}`, {
        hasContent: !!result.content,
        isError: result.isError,
      });

      return result as MCPToolResult;
    } catch (error: any) {
      logger.error(`Error al llamar a la herramienta MCP ${serverName}.${toolName}:`, error);
      throw new Error(`Llamada a la herramienta MCP fallida: ${error.message}`);
    }
  }

  /**
   * List available tools on a server
   */
  async listTools(serverName: string): Promise<any[]> {
    if (!this.connected.has(serverName)) {
      throw new Error(`Servidor MCP ${serverName} no está conectado`);
    }

    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Cliente no encontrado para el servidor MCP ${serverName}`);
    }

    try {
      const tools = await client.listTools();
      return tools.tools;
    } catch (error: any) {
      logger.error(`Error al listar las herramientas para ${serverName}:`, error);
      return [];
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(serverName: string): Promise<any> {
    if (!this.connected.has(serverName)) {
      throw new Error(`Servidor MCP ${serverName} no está conectado`);
    }

    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Cliente no encontrado para el servidor MCP ${serverName}`);
    }

    try {
      return await client.getServerVersion();
    } catch (error: any) {
      logger.error(`Error al obtener la información del servidor MCP ${serverName}:`, error);
      return null;
    }
  }
}

/**
 * Global MCP client manager instance
 */
export const mcpManager = new MCPClientManager();

/**
 * Helper function to ensure MCP server is connected
 */
export async function ensureMCPConnected(config: MCPServerConfig): Promise<void> {
  if (!config.enabled) {
    throw new Error(`Servidor MCP ${config.name} no está habilitado`);
  }

  if (!mcpManager.isConnected(config.name)) {
    await mcpManager.connect(config);
  }
}

/**
 * Safe MCP tool call with automatic connection handling
 */
export async function callMCPTool(
  config: MCPServerConfig,
  toolName: string,
  args: Record<string, any> = {}
): Promise<MCPToolResult> {
  await ensureMCPConnected(config);
  return await mcpManager.callTool(config.name, toolName, args);
}