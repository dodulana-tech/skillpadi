'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;

const STATUS_LABEL = {
  upcoming: 'Upcoming',
  registration: 'Registration Open',
  'in-progress': 'Live 🔴',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];

export default function TournamentDetailClient({ tournament: init }) {
  const { isAuthenticated, authFetch, dbUser } = useAuth();
  const [tournament, setTournament] = useState(init);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ childName: '', teamName: '' });
  const [registering, setRegistering] = useState(false);

  const cat = tournament.categoryId || {};
  const spotsLeft = tournament.maxTeams ? tournament.maxTeams - (tournament.teams?.length || 0) : null;
  const canRegister = tournament.status === 'registration' && tournament.isActive &&
    (!tournament.registrationDeadline || new Date() <= new Date(tournament.registrationDeadline)) &&
    (spotsLeft === null || spotsLeft > 0);

  const dateStr = tournament.date
    ? new Date(tournament.date).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'TBC';

  const savedChildren = dbUser?.children || [];

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error('Please log in to register'); return; }
    const childName = form.childName.trim();
    if (!childName) { toast.error('Child name is required'); return; }
    setRegistering(true);
    const res = await authFetch(`/api/tournaments/${tournament._id}/register`, {
      method: 'POST',
      body: JSON.stringify({ childName, teamName: form.teamName.trim() || undefined }),
    });
    setRegistering(false);
    if (res.ok) {
      const data = await res.json();
      toast.success(`${childName} registered! ${tournament.entryFee === 0 ? 'Free entry confirmed.' : 'Payment to be collected at venue.'}`);
      // Update local teams count
      setTournament(prev => ({ ...prev, teams: [...(prev.teams || []), data.team] }));
      setShowRegister(false);
      setForm({ childName: '', teamName: '' });
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Registration failed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
      {/* Back */}
      <Link href="/tournaments" className="text-[11px] text-slate-400 hover:text-slate-600 mb-4 inline-flex items-center gap-1">
        ← All Tournaments
      </Link>

      {/* Header card */}
      <div className="card p-5 mb-4 animate-fade-in"
        style={{ background: cat.color ? `${cat.color}06` : undefined }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {cat.icon && <span className="text-2xl">{cat.icon}</span>}
              <h1 className="font-serif text-xl leading-snug">{tournament.name}</h1>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="badge badge-blue capitalize">{tournament.type || 'tournament'}</span>
              <span className={`badge ${tournament.status === 'registration' ? 'badge-green' : tournament.status === 'in-progress' ? 'bg-red-100 text-red-700' : 'badge-amber'}`}>
                {STATUS_LABEL[tournament.status] || tournament.status}
              </span>
              {tournament.entryFee === 0 && <span className="badge badge-green">Free Entry</span>}
            </div>
          </div>
          {tournament.entryFee > 0 && (
            <div className="text-right shrink-0">
              <div className="font-serif text-xl">{fmt(tournament.entryFee)}</div>
              <div className="text-[9px] text-slate-400">entry fee</div>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="text-slate-400 block text-[9px] mb-0.5">Date</span><span className="font-medium">📅 {dateStr}</span></div>
          {tournament.venue && <div><span className="text-slate-400 block text-[9px] mb-0.5">Venue</span><span className="font-medium">📍 {tournament.venue}</span></div>}
          {tournament.city && <div><span className="text-slate-400 block text-[9px] mb-0.5">City</span><span className="font-medium capitalize">🏙️ {tournament.city}</span></div>}
          {tournament.ageRange && <div><span className="text-slate-400 block text-[9px] mb-0.5">Age Group</span><span className="font-medium">👶 {tournament.ageRange}</span></div>}
          <div><span className="text-slate-400 block text-[9px] mb-0.5">Teams</span>
            <span className="font-medium">
              👥 {tournament.teams?.length || 0}{tournament.maxTeams ? ` / ${tournament.maxTeams}` : ''}
              {spotsLeft !== null && spotsLeft > 0 && <span className="text-green-600 ml-1">({spotsLeft} left)</span>}
              {spotsLeft === 0 && <span className="text-red-500 ml-1">(Full)</span>}
            </span>
          </div>
          {tournament.registrationDeadline && (
            <div>
              <span className="text-slate-400 block text-[9px] mb-0.5">Deadline</span>
              <span className="font-medium text-amber-700">
                ⏰ {new Date(tournament.registrationDeadline).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          )}
        </div>
        {tournament.description && (
          <p className="text-[12px] text-slate-600 leading-relaxed mt-4 pt-3 border-t border-slate-50">
            {tournament.description}
          </p>
        )}
      </div>

      {/* Prizes */}
      {tournament.prizes && (
        <div className="card p-4 mb-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Prizes</div>
          <p className="text-xs text-slate-700">{tournament.prizes}</p>
        </div>
      )}

      {/* Sponsor */}
      {tournament.sponsorId?.name && (
        <div className="card p-3 mb-4 flex items-center gap-3">
          <div className="text-[9px] text-slate-400">{tournament.sponsorId.tagline || 'Sponsored by'}</div>
          <div className="font-semibold text-xs">{tournament.sponsorId.name}</div>
        </div>
      )}

      {/* Register CTA */}
      {canRegister && (
        <div className="card p-4 mb-4 border-green-300/60 bg-green-50/30">
          {!showRegister ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-sm">Ready to compete?</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {tournament.entryFee === 0 ? 'Free entry — register now!' : `Entry fee: ${fmt(tournament.entryFee)}`}
                </p>
              </div>
              <button onClick={() => setShowRegister(true)} className="btn-primary btn-sm shrink-0">
                Register Now →
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="font-bold text-sm mb-3">Register Your Child</div>
              <div className="space-y-3">
                {savedChildren.length > 0 ? (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Select Child <span className="text-red-400">*</span>
                    </label>
                    <select
                      className="input-field text-sm w-full"
                      value={form.childName}
                      onChange={e => setForm(p => ({ ...p, childName: e.target.value }))}
                      required>
                      <option value="">— choose child —</option>
                      {savedChildren.map((c, i) => (
                        <option key={i} value={c.name}>{c.name} ({c.age} yrs)</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Child&apos;s Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      className="input-field text-sm w-full"
                      placeholder="e.g. Amara"
                      value={form.childName}
                      onChange={e => setForm(p => ({ ...p, childName: e.target.value }))}
                      maxLength={60}
                      required />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Team Name <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    className="input-field text-sm w-full"
                    placeholder={`${form.childName || 'Child'}'s Team`}
                    value={form.teamName}
                    onChange={e => setForm(p => ({ ...p, teamName: e.target.value }))}
                    maxLength={60} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" disabled={registering} className="btn-primary btn-sm disabled:opacity-60">
                  {registering ? 'Registering...' : 'Confirm Registration'}
                </button>
                <button type="button" onClick={() => setShowRegister(false)} className="btn-outline btn-sm">Cancel</button>
              </div>
              {!isAuthenticated && (
                <p className="text-[10px] text-amber-700 mt-2">
                  <Link href="/auth/login" className="underline font-semibold">Log in</Link> first to register.
                </p>
              )}
            </form>
          )}
        </div>
      )}

      {/* Results podium */}
      {tournament.status === 'completed' && tournament.results?.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-4">Results</div>
          <div className="flex items-end justify-center gap-4 mb-6">
            {/* 2nd place */}
            {tournament.results[1] && (
              <div className="text-center">
                <div className="text-2xl mb-1">🥈</div>
                <div className="h-16 bg-slate-200 rounded-t-lg w-16 flex items-end justify-center pb-1">
                  <span className="text-[9px] font-bold text-slate-600 px-1 text-center leading-tight">{tournament.results[1].teamName}</span>
                </div>
              </div>
            )}
            {/* 1st place */}
            {tournament.results[0] && (
              <div className="text-center">
                <div className="text-3xl mb-1">🥇</div>
                <div className="h-24 bg-amber-300 rounded-t-lg w-20 flex items-end justify-center pb-1">
                  <span className="text-[9px] font-bold text-amber-900 px-1 text-center leading-tight">{tournament.results[0].teamName}</span>
                </div>
              </div>
            )}
            {/* 3rd place */}
            {tournament.results[2] && (
              <div className="text-center">
                <div className="text-2xl mb-1">🥉</div>
                <div className="h-10 bg-orange-200 rounded-t-lg w-16 flex items-end justify-center pb-1">
                  <span className="text-[9px] font-bold text-orange-800 px-1 text-center leading-tight">{tournament.results[2].teamName}</span>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            {tournament.results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-base w-6 text-center">{PODIUM_MEDALS[i] || `#${r.position || i + 1}`}</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold">{r.teamName}</div>
                  {r.notes && <div className="text-[9px] text-slate-400">{r.notes}</div>}
                </div>
                {r.points != null && <div className="text-xs font-bold text-teal-700">{r.points}pts</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teams list */}
      {tournament.teams?.length > 0 && tournament.status !== 'completed' && (
        <div className="card p-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            Registered Teams ({tournament.teams.length})
          </div>
          <div className="space-y-1.5">
            {tournament.teams.map((team, i) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-slate-50 last:border-0">
                <span className="text-[10px] font-bold text-slate-300 w-5">{i + 1}</span>
                <div className="flex-1 text-xs font-medium">{team.name}</div>
                {team.paid && <span className="text-[8px] text-green-600 font-semibold">✓ Paid</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
