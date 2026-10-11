'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, extractError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Cluster {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

interface Bot {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  isPremium: boolean;
  isActive: boolean;
  model: string;
  clusterId: string | null;
  cluster?: Cluster | null;
  createdAt: string;
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [botsRes, clustersRes] = await Promise.all([
        api.get('/api/bots?limit=200'),
        api.get('/api/clusters'),
      ]);
      setBots(botsRes.data.items || botsRes.data.bots || []);
      setClusters(clustersRes.data.items || clustersRes.data.clusters || clustersRes.data || []);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  const filteredBots = useMemo(() => {
    return bots.filter((bot) => {
      const matchSearch =
        !search ||
        bot.name.toLowerCase().includes(search.toLowerCase()) ||
        (bot.description && bot.description.toLowerCase().includes(search.toLowerCase())) ||
        bot.slug.toLowerCase().includes(search.toLowerCase());

      const matchCluster =
        selectedCluster === 'all' || bot.clusterId === selectedCluster;

      const matchPremium = !showPremiumOnly || bot.isPremium;

      return matchSearch && matchCluster && matchPremium;
    });
  }, [bots, search, selectedCluster, showPremiumOnly]);

  const stats = useMemo(() => {
    return {
      total: bots.length,
      premium: bots.filter((b) => b.isPremium).length,
      active: bots.filter((b) => b.isActive).length,
      filtered: filteredBots.length,
    };
  }, [bots, filteredBots]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">ربات‌ها</h1>
          <p className="text-white/50 text-sm mt-1">
            مدیریت {stats.total} ربات در {clusters.length} خوشه
          </p>
        </div>
        <Link href="/bots/new">
          <Button className="bg-gradient-to-r from-[#6a8dff] to-[#b46eff] hover:opacity-90">
            + ربات جدید
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-black text-[#6a8dff]">{stats.total}</div>
          <div className="text-xs text-white/50 mt-1">کل ربات‌ها</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-black text-yellow-400">{stats.premium}</div>
          <div className="text-xs text-white/50 mt-1">ربات طلایی</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-black text-green-400">{stats.active}</div>
          <div className="text-xs text-white/50 mt-1">فعال</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-black text-[#b46eff]">{stats.filtered}</div>
          <div className="text-xs text-white/50 mt-1">نتیجه فیلتر</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <Input
          placeholder="جستجو در نام، توضیحات یا اسلاگ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white/5 border-white/10"
        />
        <select
          value={selectedCluster}
          onChange={(e) => setSelectedCluster(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
        >
          <option value="all">همه خوشه‌ها</option>
          {clusters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <Button
          variant={showPremiumOnly ? 'default' : 'ghost'}
          onClick={() => setShowPremiumOnly(!showPremiumOnly)}
          className={showPremiumOnly ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : ''}
        >
          ⭐ فقط طلایی
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {filteredBots.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <div className="text-4xl mb-3">🤖</div>
          <div>رباتی یافت نشد</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBots.map((bot) => (
            <Link
              key={bot.id}
              href={`/bots/${bot.id}`}
              className="group relative bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#6a8dff]/40 hover:bg-white/[0.07] transition-all"
            >
              {bot.isPremium && (
                <span className="absolute top-3 left-3 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full font-bold">
                  ⭐ طلایی
                </span>
              )}
              <div className="flex items-start gap-3">
                <span className="text-3xl">{bot.icon || '🤖'}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate group-hover:text-[#6a8dff] transition-colors">
                    {bot.name}
                  </h3>
                  <p className="text-xs text-white/40 mt-1 line-clamp-2">
                    {bot.description || 'بدون توضیحات'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-white/30">
                <span>
                  {bot.cluster?.icon} {bot.cluster?.name || 'بدون خوشه'}
                </span>
                <span className={bot.isActive ? 'text-green-400' : 'text-red-400'}>
                  {bot.isActive ? '● فعال' : '○ غیرفعال'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}