import type { LLMProvider } from './provider.interface.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { AnthropicProvider } from './providers/anthropic.provider.js';

const cache: Record<string, LLMProvider> = {};

export function getProvider(model: string): LLMProvider {
  let providerName: string;

  if (
    model.startsWith('gpt-') ||
    model.startsWith('o1-') ||
    model.startsWith('o3-') ||
    model.startsWith('deepseek')
  ) {
    providerName = 'openai';
  } else if (model.startsWith('claude-')) {
    providerName = 'anthropic';
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }

  if (!cache[providerName]) {
    if (providerName === 'openai') {
      cache[providerName] = new OpenAIProvider();
    } else {
      cache[providerName] = new AnthropicProvider();
    }
  }

  return cache[providerName];
}