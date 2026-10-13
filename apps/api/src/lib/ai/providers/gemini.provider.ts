import type {
  LLMProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  StreamChunk,
} from '../provider.interface.js';
import { calculateCost } from '../pricing.js';
import { env } from '../../../env.js';

/**
 * Google Gemini provider (REST, بدون SDK).
 * ابزارها (tool calling) در این provider پشتیبانی نمی‌شوند.
 */
export class GeminiProvider implements LLMProvider {
  name = 'gemini';
  private base = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required');
  }

  private body(messages: ChatMessage[], options: ChatOptions) {
    const contents = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
    return {
      contents,
      systemInstruction: options.systemPrompt
        ? { parts: [{ text: options.systemPrompt }] }
        : undefined,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 1024,
      },
    };
  }

  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    const res = await fetch(
      `${this.base}/models/${options.model}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.body(messages, options)),
      }
    );
    if (!res.ok) {
      throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data: any = await res.json();
    const content =
      data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    const tokensIn = data.usageMetadata?.promptTokenCount ?? 0;
    const tokensOut = data.usageMetadata?.candidatesTokenCount ?? 0;
    return {
      content,
      tokensIn,
      tokensOut,
      costUsd: calculateCost(options.model, tokensIn, tokensOut),
      model: options.model,
      provider: this.name,
      finishReason: 'stop',
    };
  }

  async *stream(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<StreamChunk> {
    const r = await this.chat(messages, options);
    yield {
      delta: r.content,
      done: true,
      usage: { tokensIn: r.tokensIn, tokensOut: r.tokensOut },
    };
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(
      `${this.base}/models/text-embedding-004:embedContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text }] } }),
      }
    );
    if (!res.ok) throw new Error(`Gemini embed error ${res.status}`);
    const data: any = await res.json();
    return data.embedding?.values || [];
  }
}
