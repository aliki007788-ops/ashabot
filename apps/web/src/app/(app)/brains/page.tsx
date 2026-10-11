'use client';

import { useEffect, useState } from 'react';
import { api, extractError } from '@/lib/api';

interface Brain {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  isCentral: boolean;
  isActive: boolean;
  _count?: { bots: number };
}

export default function BrainsPage() {
  const [brains, setBrains] = useState<Brain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBrains();
  }, []);

  async function loadBrains() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/brains');
      const items = res.data.items || res.data || [];
      // مغز مرکزی اول باشد
      items.sort((a: Brain, b: Brain) => (b.isCentral ? 1 : 0) - (a.isCentral ? 1 : 0));
      setBrains(items);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  const centralBrain = brains.find(b => b.isCentral);
  const otherBrains = brains.filter(b => !b.isCentral);
  const totalConnections = brains.reduce((sum, b) => sum + (b._count?.bots || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">مغزها</h1>
        <p className="text-white/50 mt-2 text-sm">
          سیستم عصبی پلتفرم · {brains.length} مغز فعال · {totalConnections} اتصال به ربات‌ها
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Central Brain - Hero Card */}
      {centralBrain && (
        <div className="relative overflow-hidden rounded-3xl border border-[#39d7e7]/30 bg-gradient-to-br from-[#39d7e7]/10 via-transparent to-[#6a8dff]/5 p-8 md:p-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#39d7e7]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="w-24 h-24 rounded-3xl bg-[#39d7e7]/20 border border-[#39d7e7]/40 flex items-center justify-center text-5xl shadow-2xl shadow-[#39d7e7]/20">
              {centralBrain.icon}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl md:text-3xl font-black">{centralBrain.name}</h2>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#39d7e7]/20 text-[#39d7e7] border border-[#39d7e7]/40 px-3 py-1 rounded-full">
                  Central
                </span>
              </div>
              <p className="text-white/60 text-base max-w-xl leading-relaxed">
                {centralBrain.description}
              </p>
            </div>

            <div className="text-center md:text-right">
              <div className="text-5xl font-black text-[#39d7e7]">{centralBrain._count?.bots || 0}</div>
              <div className="text-sm text-white/40 mt-1">ربات متصل</div>
            </div>
          </div>
        </div>
      )}

      {/* Other Brains */}
      <div>
        <h3 className="text-lg font-bold text-white/70 mb-5">مغزهای تخصصی</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {otherBrains.map((brain) => (
            <div
              key={brain.id}
              className="group relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300 hover:scale-[1.02]"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1 opacity-70"
                style={{ background: brain.color }}
              />

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-5"
                style={{ 
                  background: `${brain.color}18`,
                  boxShadow: `0 8px 24px ${brain.color}22`
                }}
              >
                {brain.icon}
              </div>

              <h3 className="font-bold text-lg mb-1">{brain.name}</h3>
              <p className="text-sm text-white/40 leading-relaxed mb-6 line-clamp-2">
                {brain.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-xs text-white/30">اتصالات</span>
                <span className="text-xl font-black" style={{ color: brain.color }}>
                  {brain._count?.bots || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}