import type { FastifyInstance } from 'fastify';
import type { ChatMessage } from '../../lib/ai/index.js';

export class ConversationService {
  constructor(private app: FastifyInstance) {}

  async getOrCreate(
    sessionId: string,
    botId: string,
    userId?: string,
    channelId?: string
  ) {
    let conversation = await this.app.prisma.conversation.findUnique({
      where: { sessionId },
    });

    if (!conversation) {
      conversation = await this.app.prisma.conversation.create({
        data: {
          sessionId,
          botId,
          userId,
          channelId,
          title: 'مکالمه جدید',
        },
      });
    }

    return conversation;
  }

  async getHistory(conversationId: string, limit = 30): Promise<ChatMessage[]> {
    const messages = await this.app.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // تاریخچه فقط متن ساده است؛ تعامل‌های ابزار در همان نوبت و در حافظه انجام می‌شود.
    return messages
      .reverse()
      .filter((m) => ['USER', 'ASSISTANT', 'HUMAN'].includes(m.role) && m.content)
      .map((m) => ({
        role: (m.role === 'USER' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      }));
  }

  async addMessage(
    conversationId: string,
    role: 'SYSTEM' | 'USER' | 'ASSISTANT' | 'TOOL' | 'HUMAN',
    content: string,
    meta?: {
      tokensIn?: number;
      tokensOut?: number;
      costUsd?: number;
      model?: string;
      provider?: string;
      toolCalls?: any;
      toolResults?: any;
    }
  ) {
    return this.app.prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        tokensIn: meta?.tokensIn,
        tokensOut: meta?.tokensOut,
        costUsd: meta?.costUsd,
        model: meta?.model,
        provider: meta?.provider,
        toolCalls: meta?.toolCalls ? (typeof meta.toolCalls === 'string' ? meta.toolCalls : JSON.stringify(meta.toolCalls)) : null,
        toolResults: meta?.toolResults ? (typeof meta.toolResults === 'string' ? meta.toolResults : JSON.stringify(meta.toolResults)) : null,
      },
    });
  }

  async listByBot(botId: string, limit = 50) {
    return this.app.prisma.conversation.findMany({
      where: { botId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async getDetail(id: string) {
    return this.app.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        bot: { select: { id: true, name: true, icon: true } },
      },
    });
  }
}