import type { FastifyInstance } from 'fastify';
import { getProvider } from '../../lib/ai/index.js';
import { ConversationService } from './conversation.service.js';

export class AiService {
  private conversationService: ConversationService;

  constructor(private app: FastifyInstance) {
    this.conversationService = new ConversationService(app);
  }

  async chat(input: {
    botId: string;
    sessionId: string;
    message: string;
    userId?: string;
    channelId?: string;
  }) {
    const bot = await this.app.prisma.bot.findUnique({
      where: { id: input.botId },
    });

    if (!bot || !bot.isActive) {
      throw Object.assign(new Error('Bot not found or inactive'), { statusCode: 404 });
    }

    if (bot.userId && input.userId && bot.userId !== input.userId) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }

    const conversation = await this.conversationService.getOrCreate(
      input.sessionId,
      input.botId,
      input.userId,
      input.channelId
    );

    await this.conversationService.addMessage(conversation.id, 'USER', input.message);

    const history = await this.conversationService.getHistory(conversation.id);
    const provider = getProvider(bot.model);

    const response = await provider.chat(history, {
      model: bot.model,
      temperature: bot.temperature,
      maxTokens: bot.maxTokens,
      systemPrompt: bot.systemPrompt,
    });

    await this.conversationService.addMessage(conversation.id, 'ASSISTANT', response.content, {
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
      costUsd: response.costUsd,
      model: response.model,
      provider: response.provider,
      toolCalls: response.toolCalls ? JSON.stringify(response.toolCalls) : null,
    });

    this.app.io?.emit('message:new', {
      conversationId: conversation.id,
      botId: bot.id,
      role: 'assistant',
      content: response.content,
      createdAt: new Date().toISOString(),
    });

    await this.app.prisma.activityLog.create({
      data: {
        type: 'ai.message',
        message: `پاسخ از ${bot.name}`,
        botId: bot.id,
        userId: input.userId,
        metadata: JSON.stringify({
          tokensIn: response.tokensIn,
          tokensOut: response.tokensOut,
          costUsd: response.costUsd,
        }),
      },
    });

    return {
      conversationId: conversation.id,
      message: response.content,
      usage: {
        tokensIn: response.tokensIn,
        tokensOut: response.tokensOut,
        costUsd: response.costUsd,
      },
    };
  }

  async *chatStream(input: {
    botId: string;
    sessionId: string;
    message: string;
    userId?: string;
    channelId?: string;
  }) {
    const bot = await this.app.prisma.bot.findUnique({
      where: { id: input.botId },
    });

    if (!bot || !bot.isActive) {
      throw Object.assign(new Error('Bot not found or inactive'), { statusCode: 404 });
    }

    if (bot.userId && input.userId && bot.userId !== input.userId) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }

    const conversation = await this.conversationService.getOrCreate(
      input.sessionId,
      input.botId,
      input.userId,
      input.channelId
    );

    await this.conversationService.addMessage(conversation.id, 'USER', input.message);

    const history = await this.conversationService.getHistory(conversation.id);
    const provider = getProvider(bot.model);

    let fullContent = '';
    let finalUsage: { tokensIn: number; tokensOut: number } | undefined;

    for await (const chunk of provider.stream(history, {
      model: bot.model,
      temperature: bot.temperature,
      maxTokens: bot.maxTokens,
      systemPrompt: bot.systemPrompt,
    })) {
      if (chunk.delta) {
        fullContent += chunk.delta;
        yield {
          delta: chunk.delta,
          done: false,
          conversationId: conversation.id,
        };
      }

      if (chunk.usage) {
        finalUsage = chunk.usage;
      }

      if (chunk.done) break;
    }

    const costUsd = finalUsage
      ? (finalUsage.tokensIn / 1_000_000) * 0.15 + (finalUsage.tokensOut / 1_000_000) * 0.6
      : undefined;

    await this.conversationService.addMessage(conversation.id, 'ASSISTANT', fullContent, {
      tokensIn: finalUsage?.tokensIn,
      tokensOut: finalUsage?.tokensOut,
      costUsd,
      model: bot.model,
      provider: provider.name,
    });

    this.app.io?.emit('message:new', {
      conversationId: conversation.id,
      botId: bot.id,
      role: 'assistant',
      content: fullContent,
      createdAt: new Date().toISOString(),
    });

    yield {
      done: true,
      conversationId: conversation.id,
    };
  }
}