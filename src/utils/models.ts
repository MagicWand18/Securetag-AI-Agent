// Available AI models from multiple providers
export const AVAILABLE_MODELS = {
  // Claude models (Anthropic)
  'opus-4.1': {
    id: 'claude-opus-4-1',
    name: 'Claude Opus 4.1',
    description: 'Modelo más capaz - Excelente para análisis de seguridad complejo',
    provider: 'claude',
    recommended: false,
  },
  'opus-4': {
    id: 'claude-opus-4-0',
    name: 'Claude Opus 4',
    description: 'Modelo más capaz - Excelente para análisis de seguridad detallado',
    provider: 'claude',
    recommended: false,
  },
  'sonnet-4.5': {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    description: 'Modelo más reciente - Equilibrio entre rendimiento y velocidad',
    provider: 'claude',
    recommended: true,
  },
  'sonnet-4': {
    id: 'claude-sonnet-4-0',
    name: 'Claude Sonnet 4',
    description: 'Modelo más rápido y capaz - Excelente para la mayoría de las tareas',
    provider: 'claude',
    recommended: false,
  },
  'sonnet-3.7': {
    id: 'claude-3-7-sonnet-latest',
    name: 'Claude Sonnet 3.7',
    description: 'Modelo más antiguo pero probado y confiable',
    provider: 'claude',
    recommended: false,
  },
  'haiku-3.5': {
    id: 'claude-3-5-haiku-latest',
    name: 'Claude Haiku 3.5',
    description: 'Modelo más rápido - Respuestas rápidas',
    provider: 'claude',
    recommended: false,
  },
  // Gemini models (Google)
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Modelo más equilibrado - Rápido y capaz',
    provider: 'gemini',
    recommended: false,
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Modelo más poderoso - Pensamiento inteligente',
    provider: 'gemini',
    recommended: false,
  },
  'gemini-2.5-flash-lite': {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Modelo más rápido y económico - Excelente para tareas básicas',
    provider: 'gemini',
    recommended: false,
  },
  // Ollama models (local)
  'securetag-ai-agent': {
    id: 'securetag-ai-agent:latest',
    name: 'SecureTag AI Agent (Local)',
    description: 'Modelo local SecureTag especializado en tareas de agentes AI',
    provider: 'ollama',
    recommended: false,
  },
} as const;

export type Provider = 'claude' | 'gemini' | 'ollama';

export type ModelKey = keyof typeof AVAILABLE_MODELS;

export function getModelById(id: string): { key: ModelKey; model: typeof AVAILABLE_MODELS[ModelKey] } | null {
  for (const [key, model] of Object.entries(AVAILABLE_MODELS)) {
    if (model.id === id) {
      return { key: key as ModelKey, model };
    }
  }
  return null;
}

export function getModelByKey(key: string): typeof AVAILABLE_MODELS[ModelKey] | null {
  return AVAILABLE_MODELS[key as ModelKey] || null;
}

export function getDefaultModel(): typeof AVAILABLE_MODELS[ModelKey] {
  return AVAILABLE_MODELS['sonnet-4.5'];
}