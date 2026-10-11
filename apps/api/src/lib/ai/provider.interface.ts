export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  systemPrompt?: string;
}

export interface ChatResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  model: string;
  provider: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  usage?: {
    tokensIn: number;
    tokensOut: number;
  };
}

export interface LLMProvider {
  name: string;
  chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse>;
  stream(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<StreamChunk>;
  embed?(text: string): Promise<number[]>;
}
