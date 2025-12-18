import { OpenAIProvider } from './OpenAIProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { CreditsManager } from './CreditsManager.js';
import { logger } from '../../utils/logger.js';
import { AIProvider, AIAnalysisResult } from './AIProvider.js';

interface DoubleCheckConfig {
    level: 'standard' | 'pro' | 'max';
    provider_used?: string;
    model_used?: string;
}

export class ExternalAIService {
    private creditsManager: CreditsManager;

    constructor() {
        this.creditsManager = new CreditsManager();
    }

    private getCost(level: string): number {
        switch (level) {
            case 'standard': return 1;
            case 'pro': return 2;
            case 'max': return 3;
            default: return 1;
        }
    }

    private getModels(level: string) {
        const openaiModel = process.env[`AI_MODEL_OPENAI_${level.toUpperCase()}`] || 'gpt-4o-mini';
        const anthropicModel = process.env[`AI_MODEL_ANTHROPIC_${level.toUpperCase()}`] || 'claude-3-haiku-20240307';
        return { openaiModel, anthropicModel };
    }

    async performDoubleCheck(
        finding: any,
        projectContext: any,
        promptTemplate: string,
        tenantId: string,
        config: DoubleCheckConfig
    ): Promise<AIAnalysisResult | null> {
        
        const cost = this.getCost(config.level);
        console.log(`DEBUG: [ExternalAIService] Cost for level ${config.level}: ${cost}`)
        
        // 1. Check Credits
        const hasCredits = await this.creditsManager.hasSufficientCredits(tenantId, cost);
        console.log(`DEBUG: [ExternalAIService] Tenant ${tenantId} has sufficient credits? ${hasCredits}`)
        if (!hasCredits) {
            logger.warn(`Tenant ${tenantId} has insufficient credits for ${config.level} double check.`);
            return null;
        }

        // 2. Resolve Providers
        const { openaiModel, anthropicModel } = this.getModels(config.level);
        
        const openaiKey = process.env.AI_PROVIDER_OPENAI_KEY;
        const anthropicKey = process.env.AI_PROVIDER_ANTHROPIC_KEY;
        
        console.log(`DEBUG: [ExternalAIService] Keys found - OpenAI: ${!!openaiKey}, Anthropic: ${!!anthropicKey}`)

        const providers: AIProvider[] = [];

        // Primary: OpenAI
        if (openaiKey) {
            providers.push(new OpenAIProvider(openaiKey, openaiModel));
        }
        // Fallback: Anthropic
        if (anthropicKey) {
            providers.push(new AnthropicProvider(anthropicKey, anthropicModel));
        }

        if (providers.length === 0) {
            logger.error('No external AI providers configured (check .env for AI_PROVIDER_*_KEY).');
            return null;
        }

        // 3. Inference with Fallback
        let result: AIAnalysisResult | null = null;
        let usedProvider = '';

        for (const provider of providers) {
            try {
                logger.info(`Attempting Double Check with ${provider.name} (${provider.modelName})...`);
                result = await provider.analyzeFinding(finding, projectContext, promptTemplate);
                if (result) {
                    usedProvider = provider.name;
                    logger.info(`Double Check successful with ${provider.name}`);
                    break; 
                }
            } catch (error) {
                logger.warn(`Provider ${provider.name} failed:`, error);
            }
        }

        // 4. Deduct Credits & Return
        if (result) {
            const deducted = await this.creditsManager.deductCredits(tenantId, cost, `Double Check (${config.level}) - ${usedProvider}`);
            if (!deducted) {
                logger.error(`Failed to deduct credits after successful inference for tenant ${tenantId}`);
                // Proceed anyway, we can't un-run the inference
            }
            return result;
        }

        return null;
    }
}
