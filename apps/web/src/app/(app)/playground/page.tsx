'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const MODELS = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', color: '#10a37f' },
  { id: 'gpt-3.5', name: 'GPT-3.5 Turbo', provider: 'OpenAI', color: '#10a37f' },
  { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic', color: '#d97757' },
  { id: 'gemini', name: 'Gemini Pro', provider: 'Google', color: '#4285f4' },
];

const PRESETS = [
  { icon: '💬', label: 'گفتگوی عمومی', prompt: 'تو یک دستیار هوشمند فارسی هستی. به سؤالات کاربر پاسخ دقیق و مفید بده.' },
  { icon: '💼', label: 'مشاور فروش', prompt: 'تو یک مشاور فروش حرفه‌ای هستی. به مشتریان کمک می‌کنی محصول مناسب انتخاب کنند.' },
  { icon: '🎧', label: 'پشتیبانی', prompt: 'تو یک کارشناس پشتیبانی صبور و مهربان هستی. مشکلات مشتریان را حل می‌کنی.' },
  { icon: '✍️', label: 'نویسنده محتوا', prompt: 'تو یک نویسنده خلاق محتوا هستی. متن‌های جذاب و حرفه‌ای می‌نویسی.' },
];

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('gpt-4');
  const [systemPrompt, setSystemPrompt] = useState(PRESETS[0].prompt);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const responses = [
        'سلام! من یک دستیار هوشمند هستم. چطور می‌تونم کمکتون کنم؟',
        'سؤال خوبی پرسیدید. بر اساس اطلاعات موجود، پیشنهاد می‌کنم...',
        'بله، دقیقاً همینطوره. اجازه بدید بیشتر توضیح بدم...',
        'برای این کار چند راه‌حل وجود داره. بهترین گزینه اینه که...',
        'کاملاً درسته. علاوه بر این، باید در نظر داشته باشید که...',
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setLoading(false);
    }, 1200);
  }

  function clearChat() {
    setMessages([]);
  }

  const selectedModel = MODELS.find((m) => m.id === model);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-4">
      <aside
        className={`${
          showSettings ? 'block' : 'hidden md:block'
        } w-full md:w-80 shrink-0 space-y-4 overflow-y-auto`}
      >
        <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl p-4">
          <h3 className="font-bold text-sm mb-3">مدل هوش مصنوعی</h3>
          <div className="space-y-2">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`w-full p-3 rounded-xl border-2 transition-all text-right flex items-center gap-3 ${
                  model === m.id
                    ? 'border-[#6a8dff] bg-[#6a8dff]/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: m.color }}
                />
                <div className="flex-1">
                  <div className="font-bold text-xs">{m.name}</div>
                  <div className="text-[10px] text-white/40">{m.provider}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl p-4">
          <h3 className="font-bold text-sm mb-3">پیش‌تنظیم‌ها</h3>
          <div className="space-y-2">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => setSystemPrompt(p.prompt)}
                className={`w-full p-3 rounded-xl border transition-all text-right flex items-center gap-3 ${
                  systemPrompt === p.prompt
                    ? 'border-[#6a8dff]/50 bg-[#6a8dff]/5'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <span className="text-xl">{p.icon}</span>
                <span className="font-bold text-xs">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl p-4">
          <h3 className="font-bold text-sm mb-3">System Prompt</h3>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={5}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6a8dff] resize-none"
          />
        </div>

        <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
          <h3 className="font-bold text-sm">پارامترها</h3>

          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white/60">Temperature</span>
              <span className="font-bold">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-[#6a8dff]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white/60">Max Tokens</span>
              <span className="font-bold">{maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-[#6a8dff]"
            />
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="md:hidden w-10 h-10 rounded-xl bg-white/5 grid place-items-center"
            >
              ⚙️
            </button>
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: selectedModel?.color }}
            />
            <div>
              <div className="font-bold text-sm">{selectedModel?.name}</div>
              <div className="text-[10px] text-white/40">
                T: {temperature} · Max: {maxTokens}
              </div>
            </div>
          </div>

          <button
            onClick={clearChat}
            disabled={messages.length === 0}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs hover:bg-white/10 transition-colors disabled:opacity-30"
          >
            🗑️ پاک
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">🎮</div>
                <h2 className="text-2xl font-black mb-3">زمین بازی آشا</h2>
                <p className="text-sm text-white/50 leading-relaxed mb-6">
                  ربات‌های هوش مصنوعی را تست کنید، پارامترها را تنظیم کنید و
                  بهترین configuration را پیدا کنید.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    '💬 گفتگوی آزاد',
                    '⚙️ تنظیم پارامترها',
                    '🎯 انتخاب مدل',
                    '📊 مقایسه پاسخ‌ها',
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="bg-white/5 border border-white/10 rounded-xl p-3"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.role === 'user' ? 'justify-start flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl shrink-0 grid place-items-center font-bold text-sm ${
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-[#6a8dff] to-[#b46eff] text-white'
                        : 'bg-white/10'
                    }`}
                  >
                    {m.role === 'user' ? 'ش' : '🤖'}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-[#6a8dff] to-[#b46eff] text-white'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center">
                    🤖
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="پیام خود را بنویسید... (Enter برای ارسال)"
              rows={1}
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6a8dff] resize-none"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#6a8dff] to-[#b46eff] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? '⏳' : '📤'}
            </button>
          </div>
          <p className="text-[10px] text-white/30 mt-2 text-center">
            💡 در حالت واقعی، این پیام‌ها به AvalAI ارسال می‌شوند
          </p>
        </div>
      </main>
    </div>
  );
}