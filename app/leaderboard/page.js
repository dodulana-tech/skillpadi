'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

const MEDAL = ['🥇', '🥈', '🥉'];

const LEVEL_COLORS = {
  beginner: 'text-slate-500',
  explorer: 'text-blue-500',
  intermediate: 'text-teal-600',
  advanced: 'text-purple-600',
  elite: 'text-amber-500',
};

export default function LeaderboardPage() {
  const [type, setType] = useState('kids');
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch categories for filter
  useEffect(() => {
    fetch('/api/categories').then(r => r.ok ? r.json() : {}).then(d => setCategories(d.categories || []));
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type, limit: '20' });
    if (categoryId) params.set('categoryId', categoryId);
    const res = await fetch(`/api/leaderboards?${params}`);
    const json = res.ok ? await res.json() : {};
    setData(json.leaderboard || []);
    setLoading(false);
  }, [type, categoryId]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl mb-2">🏆 Leaderboard</h1>
          <p className="text-slate-500 text-sm">Nigeria&apos;s most active young athletes and learners</p>
        </div>

        {/* Type tabs */}
        <div className="flex gap-2 mb-5 bg-white rounded-xl p-1.5 border border-slate-200/60">
          {[
            { id: 'kids', label: '🧒 Top Kids' },
            { id: 'schools', label: '🏫 Schools' },
            { id: 'areas', label: '📍 Areas' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setType(t.id); setCategoryId(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${type === t.id ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Category filter (kids only) */}
        {type === 'kids' && categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              onClick={() => setCategoryId('')}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors ${!categoryId ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-200 hover:border-teal-400'}`}>
              All Sports
            </button>
            {categories.map(cat => (
              <button
                key={cat._id}
                onClick={() => setCategoryId(cat._id)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors ${categoryId === cat._id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-200 hover:border-teal-400'}`}>
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="card p-10 text-center text-slate-400 text-sm">Loading...</div>
        ) : data.length === 0 ? (
          <div className="card p-10 text-center text-slate-400 text-sm">
            No data yet — be the first on the leaderboard!
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((row, i) => (
              <div key={row._id || i} className={`card px-4 py-3 flex items-center gap-3 ${i < 3 ? 'border-amber-200/60 bg-amber-50/30' : ''}`}>
                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  {i < 3 ? (
                    <span className="text-xl">{MEDAL[i]}</span>
                  ) : (
                    <span className="text-sm font-bold text-slate-400">#{row.rank}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {type === 'kids' && (
                    <>
                      <div className="font-semibold text-sm truncate">{row.displayName}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {row.userArea && <span className="text-[10px] text-slate-400">📍 {row.userArea}</span>}
                        {row.skillLevels?.length > 0 && (
                          <span className={`text-[10px] font-medium capitalize ${LEVEL_COLORS[row.skillLevels[0]?.level] || 'text-slate-400'}`}>
                            {row.skillLevels[0]?.level}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                  {type === 'schools' && (
                    <>
                      <div className="font-semibold text-sm truncate">{row.schoolName || '—'}</div>
                      {row.area && <span className="text-[10px] text-slate-400">📍 {row.area}</span>}
                    </>
                  )}
                  {type === 'areas' && (
                    <div className="font-semibold text-sm truncate">📍 {row.area || '—'}</div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-4 shrink-0 text-right">
                  {type === 'kids' && (
                    <>
                      <div>
                        <div className="text-sm font-bold text-teal-700">{row.stats?.totalSessions || 0}</div>
                        <div className="text-[8px] text-slate-400">sessions</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-orange-500">{row.stats?.currentStreak || 0}🔥</div>
                        <div className="text-[8px] text-slate-400">streak</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-amber-600">{row.achievements || 0}🏅</div>
                        <div className="text-[8px] text-slate-400">badges</div>
                      </div>
                    </>
                  )}
                  {type === 'schools' && (
                    <>
                      <div>
                        <div className="text-sm font-bold text-teal-700">{row.totalEnrolled || 0}</div>
                        <div className="text-[8px] text-slate-400">enrolled</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-600">{row.totalSessions || 0}</div>
                        <div className="text-[8px] text-slate-400">sessions</div>
                      </div>
                    </>
                  )}
                  {type === 'areas' && (
                    <>
                      <div>
                        <div className="text-sm font-bold text-teal-700">{row.totalKids || 0}</div>
                        <div className="text-[8px] text-slate-400">kids</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-600">{row.totalSessions || 0}</div>
                        <div className="text-[8px] text-slate-400">sessions</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-[11px] text-slate-400 mb-3">Want to see your child on this leaderboard?</p>
          <Link href="/#programs" className="btn-primary btn-sm">Explore Programs →</Link>
        </div>
      </div>
    </main>
  );
}
