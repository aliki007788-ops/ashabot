/**
 * Channel API Client
 * کلاینت API برای مدیریت کانال‌ها و اتصالات
 * 
 * @module lib/api-channels
 * @version 1.0.0
 */

import { api, extractError } from './api';

// ==================== TYPES ====================

export type ChannelType =
  | 'eitaa'
  | 'telegram'
  | 'whatsapp'
  | 'webchat'
  | 'bale'
  | 'rubika'
  | 'soroush'
  | 'instagram';

export interface ChannelField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
  placeholder?: string;
  help?: string;
}

export interface ChannelInfo {
  type: ChannelType;
  name: string;
  icon: string;
  description: string;
  fields: ChannelField[];
  docs?: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  type: string;
  icon: string;
  isConnected: boolean;
  isActive: boolean;
}

export interface Bot {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface ChannelConnection {
  id: string;
  channelId: string;
  botId: string;
  externalId: string | null;
  webhookUrl: string | null;
  isActive: boolean;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
  channel?: Channel;
  bot?: Bot;
}

export interface CreateConnectionInput {
  channelType: ChannelType;
  botId: string;
  channelName?: string;
  credentials: Record<string, string>;
  config?: Record<string, any>;
  webhookBaseUrl?: string;
}

export interface UpdateConnectionInput {
  credentials?: Record<string, string>;
  config?: Record<string, any>;
  isActive?: boolean;
}

export interface SendMessageInput {
  connectionId: string;
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  replyToMessageId?: string;
  buttons?: Array<Array<{ text: string; url?: string; callbackData?: string }>>;
}

export interface BroadcastInput {
  botId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface ChannelStats {
  totalConnections: number;
  activeConnections: number;
  inactiveConnections: number;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

// ==================== API CLIENT ====================

export const channelsApi = {
  async getTypes(): Promise<{ channels: ChannelInfo[]; supported: ChannelType[] }> {
    try {
      const { data } = await api.get<{ channels: ChannelInfo[]; supported: ChannelType[] }>(
        '/api/channels/types'
      );
      return data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  async getTypeInfo(type: ChannelType): Promise<ChannelInfo | null> {
    try {
      const { channels } = await this.getTypes();
      return channels.find((c) => c.type === type) || null;
    } catch (err) {
      return null;
    }
  },

  async createConnection(input: CreateConnectionInput): Promise<ChannelConnection> {
    try {
      const { data } = await api.post<{ success: boolean; connection: ChannelConnection; message: string }>(
        '/api/channels/connections',
        input
      );
      return data.connection;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  async getConnections(params?: {
    botId?: string;
    channelId?: string;
    channelType?: ChannelType;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ connections: ChannelConnection[]; total: number; page?: number; limit?: number }> {
    try {
      const { data } = await api.get<{
        connections: ChannelConnection[];
        total: number;
        page?: number;
        limit?: number;
      }>('/api/channels/connections', { params });
      return data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  async getBotConnections(botId: string): Promise<ChannelConnection[]> {
    try {
      const { data } = await api.get<{ connections: ChannelConnection[]; total: number }>(
        `/api/channels/bot/${botId}`
      );
      return data.connections;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  async getConnection(connectionId: string): Promise<ChannelConnection> {
    try {
      const { data } = await api.get<{ connection: ChannelConnection }>(
        `/api/channels/connections/${connectionId}`
      );
      return data.connection;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  async updateConnection(
    connectionId: string,
    input: UpdateConnectionInput
  ): Promise<ChannelConnection> {
    try {
      const { data } = await api.patch<{ success: boolean; connection: ChannelConnection; message: string }>(
        `/api/channels/connections/${connectionId}`,
        input
      );
      return data.connection;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  async toggleConnection(
    connectionId: string,
    isActive: boolean
  ): Promise<ChannelConnection> {
    try {
      const { data } = await api.post<{ success: boolean; connection: ChannelConnection; message: string }>(
        `/api/channels/connections/${connectionId}/toggle`,
        { isActive }
      );
      return data.connection;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  async testConnection(connectionId: string): Promise<TestConnectionResult> {
    try {
      const { data } = await api.post<TestConnectionResult>(
        `/api/channels/connections/${connectionId}/test`
      );
      return data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  async deleteConnection(connectionId: string): Promise<void> {
    try {
      await api.delete(`/api/channels/connections/${connectionId}`);
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  async sendMessage(input: SendMessageInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { data } = await api.post<{ success: boolean; messageId?: string; error?: string }>(
        '/api/channels/send',
        input
      );
      return data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  async broadcast(input: BroadcastInput): Promise<{ success: boolean; sent: number; failed: number; message: string }> {
    try {
      const { data } = await api.post<{ success: boolean; sent: number; failed: number; message: string }>(
        '/api/channels/broadcast',
        input
      );
      return data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  async getStats(): Promise<ChannelStats> {
    try {
      const { data } = await api.get<ChannelStats>('/api/channels/stats');
      return data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },
};

// ==================== HELPERS ====================

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  eitaa: 'ایتا',
  telegram: 'تلگرام',
  whatsapp: 'واتساپ',
  webchat: 'وب‌چت',
  bale: 'بله',
  rubika: 'روبیکا',
  soroush: 'سروش پلاس',
  instagram: 'اینستاگرام',
};

export const CHANNEL_COLORS: Record<ChannelType, string> = {
  eitaa: '#f97316',
  telegram: '#0088cc',
  whatsapp: '#25d366',
  webchat: '#6a8dff',
  bale: '#4a90d9',
  rubika: '#fbbf24',
  soroush: '#ec4899',
  instagram: '#e1306c',
};

export default channelsApi;