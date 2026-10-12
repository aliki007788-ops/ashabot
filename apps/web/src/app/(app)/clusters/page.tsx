'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, extractError } from '@/lib/api';

interface Cluster {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  _count?: { bots: number };
}

export default function ClustersPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClusters();
  }, []);

  async function loadClusters() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/clusters');
      const items = res.data.items || res.data || [];
      // مرتب‌سازی بر اساس sortOrder
      items.sort((a: Cluster, b: Cluster) => a.sortOrder - b.sortOrder);
      setClusters(items);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  const totalBots = clusters.reduce((sum, c) => sum + (c._count?.bots || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#6a8dff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">خوشه‌ها</h1>
          <p className="text-white/50 mt-2 text-sm">
            {clusters.length} خوشه · {totalBots} ربات سازمان‌یافته
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black text-[#6a8dff]">{clusters.length}</div>
          <div className="text-xs text-white/40 mt-1">کل خوشه‌ها</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black text-green-400">{totalBots}</div>
          <div className="text-xs text-white/40 mt-1">کل ربات‌ها</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black text-[#b46eff]">
            {clusters.length > 0 ? Math.round(totalBots / clusters.length) : 0}
          </div>
          <div className="text-xs text-white/40 mt-1">میانگین ربات در خوشه</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black text-yellow-400">
            {Math.max(...clusters.map(c => c._count?.bots || 0), 0)}
          </div>
          <div className="text-xs text-white/40 mt-1">بیشترین ربات در یک خوشه</div>
        </div>
      </div>

      {/* Clusters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {clusters.map((cluster) => (
          <Link
            key={cluster.id}
            href={`/clusters/${cluster.slug}`}
            className="group relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/40"
          >
            {/* Color accent */}
            <div
              className="absolute top-0 left-0 right-0 h-1 opacity-80"
              style={{ background: cluster.color }}
            />
            
            <div className="flex items-start justify-between mb-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
                style={{ 
                  background: `${cluster.color}22`,
                  boxShadow: `0 8px 32px ${cluster.color}33`
                }}
              >
                {cluster.icon}
              </div>
              <div className="text-right">
                <div className="text-2xl font-black" style={{ color: cluster.color }}>
                  {cluster._count?.bots || 0}
                </div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">ربات</div>
              </div>
            </div>

            <h3 className="font-bold text-lg mb-1 group-hover:text-white transition-colors">
              {cluster.name}
            </h3>
            <p className="text-sm text-white/40 leading-relaxed line-clamp-2">
              {cluster.description || 'بدون توضیحات'}
            </p>

            <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/30">
              <span>#{cluster.sortOrder}</span>
              <span className="group-hover:text-[#6a8dff] transition-colors">
                مشاهده ربات‌ها →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}