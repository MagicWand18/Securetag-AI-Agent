import { AgentConfig, AgentMode } from './types.js';
import { SYSTEM_PROMPTS } from './prompts/system.js';
import { logger } from '../utils/logger.js';
import { AIProvider, ConversationMessage } from './providers/base.js';
import { ClaudeProvider } from './providers/claude.js';
import { GeminiProvider } from './providers/gemini.js';
import { OllamaProvider } from './providers/ollama.js';
import { getModelById } from '../utils/models.js';

export class CyberAgent {
  private provider: AIProvider;
  private mode: AgentMode;
  private conversationHistory: ConversationMessage[] = [];
  private systemPrompt: string;
  private model: string;

  constructor(agentConfig: AgentConfig) {
    this.mode = agentConfig.mode;
    this.model = agentConfig.model || 'claude-sonnet-4-5'; // fallback
    this.systemPrompt = this.getSystemPrompt(agentConfig.mode);

    // Determine provider based on model
    const modelInfo = getModelById(agentConfig.model || 'claude-sonnet-4-5');
    const providerType = modelInfo?.model.provider || 'claude';

    // Initialize appropriate provider
    if (providerType === 'gemini') {
      if (!agentConfig.googleApiKey) {
        throw new Error('Clave API de Google requerida para modelos Gemini');
      }
      this.provider = new GeminiProvider(agentConfig.googleApiKey, agentConfig.model || 'gemini-2.5-flash');
      logger.info(`Securetag AI inicializado con Gemini (${agentConfig.model}) en modo ${agentConfig.mode}`);
    } else if (providerType === 'ollama') {
      // Ollama (local models)
      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      this.provider = new OllamaProvider(ollamaBaseUrl, agentConfig.model || 'deepseek-r1:14b');
      logger.info(`Securetag AI inicializado con Ollama (${agentConfig.model}) en ${ollamaBaseUrl} en modo ${agentConfig.mode}`);
    } else {
      // Default to Claude
      if (!agentConfig.apiKey) {
        throw new Error('Clave API de Anthropic requerida para modelos Claude');
      }
      this.provider = new ClaudeProvider(
        agentConfig.apiKey,
        agentConfig.model || 'claude-sonnet-4-5',
        agentConfig.maxTokens || 4096
      );
      logger.info(`Securetag AI inicializado con Claude (${agentConfig.model}) en modo ${agentConfig.mode}`);
    }
  }

  private getSystemPrompt(mode: AgentMode): string {
    const basePrompt = SYSTEM_PROMPTS.base;
    const modePrompt = SYSTEM_PROMPTS[mode] || '';
    return modePrompt ? `${basePrompt}\n\n${modePrompt}` : basePrompt;
  }

  /**
   * Send a message to the agent and get a response
   */
  async chat(userMessage: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      logger.info(`Enviando mensaje a ${this.provider.getProviderName()} (modo: ${this.mode})`);

      // Call provider's chat method
      const assistantMessage = await this.provider.chat(
        this.conversationHistory,
        this.systemPrompt
      );

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      logger.info(`Recibida respuesta de ${this.provider.getProviderName()}`);
      return assistantMessage;
    } catch (error) {
      logger.error('Error en la comunicación con el agente:', error);
      throw new Error(`Error al comunicarse con el agente: ${error}`);
    }
  }

  /**
   * Run a specific security analysis task
   */
  async analyze(task: string, context?: any): Promise<string> {
    const prompt = this.buildAnalysisPrompt(task, context);
    return this.chat(prompt);
  }

  private buildAnalysisPrompt(task: string, context?: any): string {
    let prompt = `${task}\n\nResponde en español. No muestres metainstrucciones ni razonamiento paso a paso.`;

    if (context) {
      prompt += '\n\nContext:\n' + JSON.stringify(context, null, 2);
    }

    return prompt;
  }

  /**
   * Change the agent's mode
   */
  setMode(mode: AgentMode): void {
    this.mode = mode;
    this.systemPrompt = this.getSystemPrompt(mode);
    logger.info(`Modo del agente cambiado a ${mode}`);
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    logger.info('Historial de conversación eliminado');
  }

  /**
   * Get current mode
   */
  getMode(): AgentMode {
    return this.mode;
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.provider.getProviderName();
  }
}