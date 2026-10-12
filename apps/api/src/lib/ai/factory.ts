import type { LLMProvider } from './provider.interface.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { AnthropicProvider } from './providers/anthropic.provider.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { env } from '../../env.js';

const cache: Record<string, LLMProvider> = {};

export function providerNameFor(model: string): 'openai' | 'anthropic' | 'gemini' {
  if (
    model.startsWith('gpt-') ||
    model.startsWith('o1') ||
    model.startsWith('o3') ||
    model.startsWith('deepseek')
  ) {
    return 'openai';
  }
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'gemini';
  throw new Error(`Unsupported model: ${model}`);
}

function hasKey(p: 'openai' | 'anthropic' | 'gemini') {
  return p === 'openai'
    ? !!env.OPENAI_API_KEY
    : p === 'anthropic'
      ? !!env.ANTHROPIC_API_KEY
      : !!env.GEMINI_API_KEY;
}

/**
 * اگر کلید provider مدل ربات تنظیم نشده باشد، به اولین provider دارای کلید
 * با مدل ارزان پیش‌فرض آن fallback می‌کند (تا ربات با داشتن فقط یک کلید هم کار کند).
 */
export function resolveModel(model: string): string {
  let wanted: 'openai' | 'anthropic' | 'gemini';
  try {
    wanted = providerNameFor(model);
  } catch {
    wanted = 'openai';
    model = 'gpt-4o-mini';
  }
  if (hasKey(wanted)) return model;
  if (env.OPENAI_API_KEY) return 'gpt-4o-mini';
  if (env.ANTHROPIC_API_KEY) return 'claude-3-5-haiku-20241022';
  if (env.GEMINI_API_KEY) return 'gemini-1.5-flash';
  return model; // خطای واضح در getProvider
}

export function getProvider(model: string): LLMProvider {
  const providerName = providerNameFor(model);

  if (!cache[providerName]) {
    if (providerName === 'openai') cache[providerName] = new OpenAIProvider();
    else if (providerName === 'anthropic') cache[providerName] = new AnthropicProvider();
    else cache[providerName] = new GeminiProvider();
  }
  return cache[providerName];
}

/** یک provider برای embedding (اگر کلیدی باشد) */
export function getEmbeddingProvider(): LLMProvider | null {
  try {
    if (env.OPENAI_API_KEY) return getProvider('gpt-4o-mini');
    if (env.GEMINI_API_KEY) return getProvider('gemini-1.5-flash');
  } catch {
    /* ignore */
  }
  return null;
}
