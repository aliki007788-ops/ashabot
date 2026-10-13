'use client';

import { useState } from 'react';
import { api, extractError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { fieldCls } from '@/components/ui/kit';

const TOOLS: Record<string, string> = {
  save_lead: 'ذخیره سرنخ در CRM',
  create_booking: 'ثبت نوبت/رزرو',
  get_available_slots: 'ساعت‌های خالی نوبت',
  create_payment_link: 'ساخت لینک پرداخت',
  calculate: 'محاسبه (قیمت/تخفیف/اقساط)',
  get_current_time: 'تاریخ و ساعت',
  handoff_to_human: 'انتقال به اپراتور (همیشه فعال)',
};
const MODELS = ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'gemini-1.5-flash', 'gemini-1.5-pro'];

export function BotSettings({
  bot,
  onSaved,
}: {
  bot: { id: string; systemPrompt: string; model: string; temperature: number; tools?: string };
  onSaved?: () => void;
}) {
  let initial: string[] = [];
  try { initial = JSON.parse(bot.tools || '[]'); } catch { /* ignore */ }
  const [prompt, setPrompt] = useState(bot.systemPrompt);
  const [model, setModel] = useState(bot.model);
  const [temperature, setTemperature] = useState(bot.temperature);
  const [tools, setTools] = useState<string[]>(initial);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    try {
      setBusy(true); setErr(''); setMsg('');
      await api.patch(`/api/bots/${bot.id}`, { systemPrompt: prompt, model, temperature, tools });
      setMsg('ذخیره شد ✓');
      onSaved?.();
    } catch (e) { setErr(extractError(e)); } finally { setBusy(false); }
  }

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-white/40">تنظیمات ربات</h3>
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block text-xs text-white/70">مدل
          <select className={fieldCls + ' mt-1.5'} value={model} onChange={(e) => setModel(e.target.value)}>
            {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="block text-xs text-white/70">خلاقیت (دما): {temperature}
          <input type="range" min={0} max={1.5} step={0.1} className="w-full mt-3" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
        </label>
      </div>
      <label className="block text-xs text-white/70">دستور سیستم (شخصیت و قوانین ربات)
        <textarea className={fieldCls + ' mt-1.5 min-h-[160px]'} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </label>
      <div>
        <div className="text-xs text-white/70 mb-2">ابزارهای مجاز</div>
        <div className="grid sm:grid-cols-2 gap-2">
          {Object.entries(TOOLS).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm bg-white/5 rounded-lg px-3 py-2">
              <input type="checkbox" checked={tools.includes(k) || k === 'handoff_to_human'} disabled={k === 'handoff_to_human'}
                onChange={(e) => setTools(e.target.checked ? [...tools, k] : tools.filter((t) => t !== k))} />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button loading={busy} onClick={save}>ذخیره تنظیمات</Button>
        {msg && <span className="text-sm text-[#4ade80]">{msg}</span>}
      </div>
    </div>
  );
}
