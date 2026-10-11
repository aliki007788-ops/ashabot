'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractError } from '@/lib/api';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

interface Bot {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  model?: string;
}

// ==================== PAGE ====================

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params?.botId as string;

  const [bot, setBot] = useState<Bot | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sessionId] = useState(
    () => `web_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ==================== EFFECTS ====================

  useEffect(() => {
    if (botId) {
      loadBot();
    }
  }, [botId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ==================== FUNCTIONS ====================

  const loadBot = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/api/bots/${botId}`);
      setBot(data.bot || data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || !bot) return;

    const userMessage: Message = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    setError('');

    try {
      const { data } = await api.post('/api/ai/chat', {
        botId: bot.id,
        sessionId,
        message: text,
      });

      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: data.message || data.response || data.content || '',
        createdAt: new Date().toISOString(),
        model: data.model,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(extractError(err));
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  const handleClear = () => {
    if (messages.length === 0) return;
    if (!confirm('آیا از پاک کردن این گفتگو مطمئن هستید؟')) return;
    setMessages([]);
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]" dir="rtl">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">در حال بارگذاری ربات...</p>
        </div>
      </div>
    );
  }

  if (error && !bot) {
    return (
      <Card className="p-8 text-center" dir="rtl">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-lg font-black text-white mb-2">خطا</h2>
        <p className="text-sm text-white/60 mb-6">{error}</p>
        <Button onClick={handleBack}>بازگشت</Button>
      </Card>
    );
  }

  if (!bot) return null;

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="!p-2"
          >
            →
          </Button>

          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6a8dff] to-[#b46eff] flex items-center justify-center text-2xl flex-shrink-0">
            {bot.icon || '🤖'}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-black text-white truncate">{bot.name}</h1>
            <p className="text-xs text-white/40 truncate">@{bot.slug}</p>
          </div>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="!text-xs"
            >
              🗑️ پاک کردن
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="h-[60vh] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6a8dff]/20 to-[#b46eff]/20 border border-[#6a8dff]/30 flex items-center justify-center text-4xl mb-4">
                {bot.icon || '🤖'}
              </div>
              <h3 className="font-bold text-white mb-1">
                سلام! من {bot.name} هستم
              </h3>
              <p className="text-sm text-white/50 max-w-sm">
                {bot.description || 'چطور می‌توانم کمکتان کنم؟'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-md">
                {[
                  'سلام! چطوری؟',
                  'کمکم می‌کنی؟',
                  'درباره خودت بگو',
                  'چیکار می‌تونی بکنی؟',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#6a8dff]/60 hover:bg-white/[0.06] transition text-xs text-white/70 hover:text-white text-right"
                  >
                    💬 {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  botIcon={bot.icon}
                />
              ))}

              {sending && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6a8dff] to-[#b46eff] flex items-center justify-center text-lg flex-shrink-0">
                    {bot.icon || '🤖'}
                  </div>
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl rounded-tr-sm p-3">
                    <div className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-white/40 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-white/40 animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-white/40 animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="border-t border-white/10 p-4 bg-white/[0.02]">
          {error && (
            <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              ⚠️ {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Input
              ref={inputRef}
              placeholder="پیام خود را بنویسید..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              loading={sending}
              className="!px-6"
              size="lg"
            >
              {sending ? '' : '➤'}
            </Button>
          </div>

          <p className="text-[10px] text-white/30 mt-2 text-center">
            Enter برای ارسال • Shift+Enter برای خط جدید
          </p>
        </div>
      </Card>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

interface MessageBubbleProps {
  message: Message;
  botIcon?: string;
}

function MessageBubble({ message, botIcon }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0',
          isUser
            ? 'bg-white/10 border border-white/20'
            : 'bg-gradient-to-br from-[#6a8dff] to-[#b46eff]'
        )}
      >
        {isUser ? '👤' : botIcon || '🤖'}
      </div>

      <div
        className={cn(
          'max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
          isUser
            ? 'bg-[#6a8dff]/20 border border-[#6a8dff]/30 text-white rounded-tr-sm'
            : 'bg-white/[0.03] border border-white/10 text-white/90 rounded-tl-sm'
        )}
      >
        {message.content}

        {message.model && !isUser && (
          <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-white/30">
            🤖 {message.model}
          </div>
        )}
      </div>
    </div>
  );
}