import dotenv from 'dotenv';
import { getModelById, getModelByKey } from './models.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  safeMode: process.env.SAFE_MODE !== 'false',
  maxTokens: parseInt(process.env.MAX_TOKENS || '4096', 10),
  model: process.env.MODEL || 'securetag-ai-agent:latest',
};

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // At least one API key must be provided
  if (!config.anthropicApiKey && !config.googleApiKey) {
    errors.push('Se requiere al menos una clave de API (ANTHROPIC_API_KEY o GOOGLE_API_KEY). Configúrala en el archivo .env.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateConfigForProvider(provider?: 'claude' | 'gemini' | 'ollama'): { valid: boolean; errors: string[] } {
  if (provider === 'ollama') {
    return { valid: true, errors: [] };
  }
  return validateConfig();
}