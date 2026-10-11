/**
 * WebChat Channel Adapter
 * آداپتر وب‌چت (چت داخلی روی وب‌سایت)
 * 
 * @module channels/adapters/webchat
 * @version 1.0.0
 * 
 * این adapter از WebSocket برای ارتباط real-time استفاده می‌کند
 * و در سایت مشتری به صورت یک ویجت شناور نمایش داده می‌شود.
 */

import {
  BaseChannelAdapter,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
  WebhookSetupResult,
} from './base.adapter.js';

// ==================== TYPES ====================

export interface WebChatSession {
  sessionId: string;
  visitorId: string;
  visitorName?: string;
  visitorEmail?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  currentPage?: string;
  createdAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
}

export interface WebChatMessage {
  id: string;
  sessionId: string;
  sender: 'visitor' | 'bot' | 'agent';
  text: string;
  attachments?: Array<{ type: string; url: string; name?: string }>;
  timestamp: Date;
  isRead: boolean;
  metadata?: Record<string, any>;
}

// ==================== ADAPTER ====================

export class WebChatAdapter extends BaseChannelAdapter {
  public readonly channelType = 'webchat';
  public readonly icon = '🌐';

  // ذخیره‌سازی موقت sessionها (در production از Redis استفاده شود)
  private static sessions: Map<string, WebChatSession> = new Map();

  // ذخیره‌سازی socketهای فعال (sessionId → socketId)
  private static activeSockets: Map<string, string> = new Map();

  private static io: any = null;

  // ==================== INIT SOCKET.IO ====================

  /**
   * راه‌اندازی Socket.IO (از app.ts فراخوانی می‌شود)
   */
  static initSocketIO(io: any): void {
    WebChatAdapter.io = io;

    io.on('connection', (socket: any) => {
      console.log(`[webchat] اتصال جدید: ${socket.id}`);

      // ========== ROUTE: شروع session ==========
      socket.on('webchat:init', (data: {
        sessionId: string;
        visitorId: string;
        visitorName?: string;
        visitorEmail?: string;
        currentPage?: string;
      }) => {
        try {
          const session: WebChatSession = {
            sessionId: data.sessionId,
            visitorId: data.visitorId,
            visitorName: data.visitorName,
            visitorEmail: data.visitorEmail,
            userAgent: socket.handshake?.headers?.['user-agent'],
            ipAddress: socket.handshake?.address,
            referrer: socket.handshake?.headers?.referer,
            currentPage: data.currentPage,
            createdAt: new Date(),
            lastActivityAt: new Date(),
            isActive: true,
          };

          WebChatAdapter.sessions.set(data.sessionId, session);
          WebChatAdapter.activeSockets.set(data.sessionId, socket.id);

          socket.join(`session:${data.sessionId}`);

          socket.emit('webchat:ready', {
            sessionId: data.sessionId,
            message: 'به چت خوش آمدید',
          });

          console.log(`[webchat] Session ایجاد شد: ${data.sessionId}`);
        } catch (error) {
          console.error('[webchat] خطا در ایجاد session:', error);
          socket.emit('webchat:error', { message: 'خطا در ایجاد session' });
        }
      });

      // ========== ROUTE: پیام از بازدیدکننده ==========
      socket.on('webchat:message', (data: {
        sessionId: string;
        text: string;
        attachments?: any[];
      }) => {
        try {
          const session = WebChatAdapter.sessions.get(data.sessionId);
          if (!session) {
            socket.emit('webchat:error', { message: 'Session یافت نشد' });
            return;
          }

          session.lastActivityAt = new Date();

          const message: WebChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId: data.sessionId,
            sender: 'visitor',
            text: data.text,
            attachments: data.attachments,
            timestamp: new Date(),
            isRead: false,
          };

          // ارسال به اتاق session (برای نمایش در پنل ادمین)
          io.to(`session:${data.sessionId}`).emit('webchat:message', message);

          // ارسال به همه agentها
          io.to('agents').emit('webchat:new-message', {
            session,
            message,
          });

          // Trigger webhook برای پردازش AI
          WebChatAdapter.io?.emit('webchat:process', {
            sessionId: data.sessionId,
            message,
          });

          console.log(`[webchat] پیام از ${data.sessionId}: ${data.text}`);
        } catch (error) {
          console.error('[webchat] خطا در پردازش پیام:', error);
        }
      });

      // ========== ROUTE: typing indicator ==========
      socket.on('webchat:typing', (data: {
        sessionId: string;
        isTyping: boolean;
      }) => {
        socket.to(`session:${data.sessionId}`).emit('webchat:typing', {
          sessionId: data.sessionId,
          isTyping: data.isTyping,
        });
      });

      // ========== ROUTE: تغییر صفحه ==========
      socket.on('webchat:page-change', (data: {
        sessionId: string;
        page: string;
      }) => {
        const session = WebChatAdapter.sessions.get(data.sessionId);
        if (session) {
          session.currentPage = data.page;
          session.lastActivityAt = new Date();
        }
      });

      // ========== ROUTE: اتصال agent ==========
      socket.on('webchat:agent-join', (data: {
        agentId: string;
      }) => {
        socket.join('agents');
        console.log(`[webchat] Agent ${data.agentId} به چت پیوست`);
      });

      // ========== ROUTE: پاسخ agent به session ==========
      socket.on('webchat:agent-message', (data: {
        sessionId: string;
        text: string;
        agentId: string;
        agentName: string;
      }) => {
        const message: WebChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId: data.sessionId,
          sender: 'agent',
          text: data.text,
          timestamp: new Date(),
          isRead: false,
          metadata: { agentId: data.agentId, agentName: data.agentName },
        };

        io.to(`session:${data.sessionId}`).emit('webchat:message', message);
        io.to('agents').emit('webchat:message', message);
      });

      // ========== ROUTE: بستن session ==========
      socket.on('webchat:close', (data: { sessionId: string }) => {
        const session = WebChatAdapter.sessions.get(data.sessionId);
        if (session) {
          session.isActive = false;
          WebChatAdapter.sessions.delete(data.sessionId);
          WebChatAdapter.activeSockets.delete(data.sessionId);
        }
        socket.leave(`session:${data.sessionId}`);
      });

      // ========== ROUTE: قطع اتصال ==========
      socket.on('disconnect', () => {
        // پیدا کردن session مربوط به این socket
        for (const [sessionId, socketId] of WebChatAdapter.activeSockets.entries()) {
          if (socketId === socket.id) {
            WebChatAdapter.activeSockets.delete(sessionId);
            console.log(`[webchat] Session ${sessionId} قطع شد`);
            break;
          }
        }
      });
    });

    console.log('✅ WebChat Socket.IO راه‌اندازی شد');
  }

  // ==================== SEND MESSAGE ====================

  async sendMessage(message: OutgoingMessage): Promise<SendResult> {
    try {
      if (!WebChatAdapter.io) {
        return { success: false, error: 'Socket.IO راه‌اندازی نشده' };
      }

      const sessionId = message.chatId;

      const messageObj: WebChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        sender: 'bot',
        text: message.text,
        timestamp: new Date(),
        isRead: false,
        metadata: { buttons: message.buttons },
      };

      // ارسال به session
      WebChatAdapter.io.to(`session:${sessionId}`).emit('webchat:message', messageObj);

      // ارسال به agentها (برای مانیتورینگ)
      WebChatAdapter.io.to('agents').emit('webchat:message', messageObj);

      this.safeLog('پیام ارسال شد', { sessionId });

      return {
        success: true,
        messageId: messageObj.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطای ناشناخته';
      this.safeLog('خطا در ارسال پیام', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  // ==================== SETUP WEBHOOK ====================

  async setupWebhook(): Promise<WebhookSetupResult> {
    // webchat نیازی به webhook خارجی ندارد
    // همه چیز از طریق Socket.IO مدیریت می‌شود
    const webhookUrl = this.getWebhookUrl();

    this.safeLog('WebChat آماده است', { webhookUrl });

    return {
      success: true,
      webhookUrl,
    };
  }

  // ==================== REMOVE WEBHOOK ====================

  async removeWebhook(): Promise<boolean> {
    // همه sessionها را غیرفعال کن
    for (const session of WebChatAdapter.sessions.values()) {
      session.isActive = false;
    }
    WebChatAdapter.sessions.clear();
    WebChatAdapter.activeSockets.clear();

    this.safeLog('همه sessionها حذف شدند');
    return true;
  }

  // ==================== TEST CONNECTION ====================

  async testConnection(): Promise<boolean> {
    try {
      const hasSocketIO = WebChatAdapter.io !== null;

      if (!hasSocketIO) {
        this.safeLog('تست اتصال ناموفق: Socket.IO راه‌اندازی نشده');
        return false;
      }

      this.safeLog('تست اتصال موفق');
      return true;
    } catch (error) {
      return false;
    }
  }

  // ==================== PARSE WEBHOOK ====================

  parseWebhook(body: any, headers: Record<string, any>): IncomingMessage | null {
    try {
      // برای webchat، پیام‌ها از طریق Socket.IO می‌آیند
      // اما اگر از طریق HTTP POST ارسال شوند، اینجا پارس می‌کنیم

      if (!body.sessionId || !body.text) {
        return null;
      }

      return {
        externalUserId: body.visitorId || body.sessionId,
        userName: body.visitorName || 'بازدیدکننده',
        text: body.text,
        chatId: body.sessionId,
        chatType: 'private',
        raw: body,
      };
    } catch (error) {
      return null;
    }
  }

  // ==================== GET ACTIVE SESSIONS ====================

  static getActiveSessions(): WebChatSession[] {
    return Array.from(WebChatAdapter.sessions.values()).filter(
      (s) => s.isActive
    );
  }

  // ==================== GET SESSION ====================

  static getSession(sessionId: string): WebChatSession | undefined {
    return WebChatAdapter.sessions.get(sessionId);
  }

  // ==================== CLOSE SESSION ====================

  static closeSession(sessionId: string): boolean {
    const session = WebChatAdapter.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      WebChatAdapter.sessions.delete(sessionId);
      WebChatAdapter.activeSockets.delete(sessionId);

      if (WebChatAdapter.io) {
        WebChatAdapter.io.to(`session:${sessionId}`).emit('webchat:closed', {
          sessionId,
        });
      }

      return true;
    }
    return false;
  }
}

export default WebChatAdapter;