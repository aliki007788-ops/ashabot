import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  StreamChunk,
} from '../provider.interface.js';
import { calculateCost } from '../pricing.js';
import { env } from '../../../env.js';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private client: Anthropic;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      baseURL: env.ANTHROPIC_BASE_URL,
    });
  }

  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    const { system, formatted } = this.formatMessages(messages, options.systemPrompt);

    const response = await this.client.messages.create({
      model: options.model,
      system,
      messages: formatted,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const content = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    return {
      content,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
      costUsd: calculateCost(
        options.model,
        response.usage.input_tokens,
        response.usage.output_tokens
      ),
      model: options.model,
      provider: this.name,
      finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
    };
  }

  async *stream(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<StreamChunk> {
    const { system, formatted } = this.formatMessages(messages, options.systemPrompt);

    const stream = this.client.messages.stream({
      model: options.model,
      system,
      messages: formatted,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { delta: event.delta.text, done: false };
      }
      if (event.type === 'message_stop') {
        yield { delta: '', done: true };
      }
    }
  }

  private formatMessages(
    messages: ChatMessage[],
    systemPrompt?: string
  ): { system: string | undefined; formatted: Anthropic.MessageParam[] } {
    const formatted: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        formatted.push({ role: msg.role, content: msg.content });
      }
    }

    return { system: systemPrompt, formatted };
  }
}