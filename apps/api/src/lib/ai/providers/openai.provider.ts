import OpenAI from 'openai';
import type {
  LLMProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  StreamChunk,
} from '../provider.interface.js';
import { calculateCost } from '../pricing.js';
import { env } from '../../../env.js';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;

  constructor() {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL,
    });
  }

  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    const openaiMessages = this.formatMessages(messages, options.systemPrompt);

    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: openaiMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      tools: options.tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
    });

    const choice = response.choices[0];
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

    return {
      content: choice.message.content || '',
      tokensIn: usage.prompt_tokens,
      tokensOut: usage.completion_tokens,
      costUsd: calculateCost(options.model, usage.prompt_tokens, usage.completion_tokens),
      model: options.model,
      provider: this.name,
      toolCalls: choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      })),
      finishReason: (choice.finish_reason as any) || 'stop',
    };
  }

  async *stream(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<StreamChunk> {
    const openaiMessages = this.formatMessages(messages, options.systemPrompt);

    const stream = await this.client.chat.completions.create({
      model: options.model,
      messages: openaiMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      stream: true,
      stream_options: { include_usage: true },
    });

    let usage: { tokensIn: number; tokensOut: number } | undefined;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      const done = !!chunk.choices[0]?.finish_reason;

      if (chunk.usage) {
        usage = {
          tokensIn: chunk.usage.prompt_tokens,
          tokensOut: chunk.usage.completion_tokens,
        };
      }

      if (delta || done) {
        yield { delta, done, usage };
      }
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  private formatMessages(
    messages: ChatMessage[],
    systemPrompt?: string
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const formatted: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'tool') {
        formatted.push({
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId!,
        });
      } else if (msg.role === 'assistant' && msg.toolCalls?.length) {
        formatted.push({
          role: 'assistant',
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        });
      } else {
        formatted.push({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return formatted;
  }
}