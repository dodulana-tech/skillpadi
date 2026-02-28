'use client';

import { useState } from 'react';
import Link from 'next/link';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

const VETTING_TIERS = [
  { name: 'Identity & Background', items: [
    { key: 'nin', label: 'Government ID (NIN)' }, { key: 'police', label: 'Police Clearance' },
    { key: 'address', label: 'Address Verification' }, { key: 'photoMatch', label: 'Photo/Video ID Match' },
  ] },
  { name: 'Professional Credentials', items: [
    { key: 'coachingCert', label: 'Coaching Certification' }, { key: 'experience', label: 'Verified Experience' }, { key: 'references', label: 'References Checked' },
  ] },
  { name: 'Child Safety', items: [
    { key: 'firstAid', label: 'First Aid & CPR' }, { key: 'safeguarding', label: 'Child Safeguarding' }, { key: 'sportSafety', label: 'Sport-Specific Safety' },
  ] },
  { name: 'Ongoing Trust', items: [
    { key: 'reverification', label: 'Annual Re-verification' }, { key: 'insurance', label: 'Liability Insurance' },
    { key: 'rating', label: 'Rating ≥ 4.5★' }, { key: 'incidents', label: 'Zero Incidents' },
  ] },
];

const SUPERVISION = {
  'parent-present': { label: 'Parent Stays', desc: 'Parent must remain at venue.' },
  'drop-off': { label: 'Drop & Pick', desc: 'Coach WhatsApps start/end.' },
  'school-chaperone': { label: 'School Chaperone', desc: 'School staff escorts group.' },
  'nanny-driver': { label: 'Nanny/Driver', desc: 'Pre-registered nanny/driver.' },
};

function ShieldBadge({ level }) {
  const m = { certified: 'badge-green', verified: 'badge-blue', 'in-progress': 'badge-amber' };
  const l = { certified: 'Certified', verified: 'Verified', 'in-progress': 'Pending' };
  return <span className={`badge ${m[level] || m['in-progress']}`}>🛡️ {l[level] || 'Pending'}</span>;
}

export function CoachProfileClient({ coach, programs }) {
  const [vettingOpen, setVettingOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState({});
  const cat = coach.categoryId || {};

  const vettedCount = VETTING_TIERS.reduce((s, t) =>
    s + t.items.filter((i) => coach.vetting?.[i.key]?.status === 'verified').length, 0);
  const totalItems = VETTING_TIERS.reduce((s, t) =>
    s + t.items.filter((i) => {
      const v = coach.vetting?.[i.key];
      return v && v.status !== 'na';
    }).length, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-20 pb-12">
      {/* Header */}
      <div className="card p-5 mb-3 animate-fade-in" style={{ background: `${cat.color}04` }}>
        <div className="flex gap-4 flex-wrap">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white/80 font-extrabold text-2xl shrink-0"
            style={{ background: `linear-gradient(135deg, ${cat.color || '#0F766E'}, ${cat.color || '#0F766E'}aa)` }}>
            {coach.initials}
          </div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="font-serif text-2xl mb-1">{coach.name}</h1>
            <div className="text-xs font-semibold mb-1.5" style={{ color: cat.color }}>{cat.icon} {coach.title}</div>
            <ShieldBadge level={coach.shieldLevel} />
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 mt-2">
              <span>⭐ {coach.rating} ({coach.reviewCount})</span>
              <span>📅 {coach.yearsExperience} yrs</span>
              <span>👶 Ages {coach.ageGroups}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="card p-4 mb-3 animate-fade-in">
        <p className="text-[13px] text-slate-600 leading-relaxed">{coach.bio}</p>
      </div>

      {/* Vetting accordion */}
      <div className="card mb-3 animate-fade-in">
        <button onClick={() => setVettingOpen(!vettingOpen)} className="w-full p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <ShieldBadge level={coach.shieldLevel} />
            <div>
              <div className="font-bold text-xs">Vetting & Credentials</div>
              <div className="text-[10px] text-slate-500">{vettedCount}/{totalItems} checks passed</div>
            </div>
          </div>
          <span className={`text-slate-400 transition-transform ${vettingOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {vettingOpen && (
          <div className="px-4 pb-4 border-t border-slate-100">
            {VETTING_TIERS.map((tier) => (
              <div key={tier.name} className="mt-3">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tier.name}</div>
                {tier.items.map((item) => {
                  const vItem = coach.vetting?.[item.key];
                  if (!vItem || vItem.status === 'na') return null;
                  const ok = vItem.status === 'verified';
                  return (
                    <div key={item.key} className="flex items-start gap-2 py-1.5 border-b border-slate-50">
                      <span className={`text-[10px] ${ok ? 'text-green-600' : 'text-amber-500'}`}>{ok ? '✓' : '⏳'}</span>
                      <div>
                        <div className={`text-[11px] font-semibold ${ok ? 'text-green-800' : 'text-amber-800'}`}>{item.label}</div>
                        {vItem.note && <div className="text-[9px] text-slate-400">{vItem.note}</div>}
                        {vItem.expires && <div className="text-[9px] text-amber-600">Expires {new Date(vItem.expires).toLocaleDateString()}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Programs */}
      {programs.length > 0 && (
        <>
          <h3 className="font-bold text-sm mb-2">Programs & Availability</h3>
          {programs.map((prog) => {
            const total = prog.pricePerSession * prog.sessions;
            const spots = prog.spotsTotal - prog.spotsTaken;
            const sup = SUPERVISION[prog.supervision] || {};
            return (
              <div key={prog._id} className="card p-4 mb-2.5 animate-fade-in">
                <div className="flex justify-between mb-1.5">
                  <div>
                    <div className="font-serif text-base">{prog.name} <span className="text-[11px] font-sans text-slate-400">({prog.ageRange})</span></div>
                    <div className="text-[10px] text-slate-500">📍 {prog.location} · 📅 {prog.schedule}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-lg">{fmt(total)}</div>
                    {spots > 0 ? <span className="badge badge-green">{spots} spots</span> : <span className="badge badge-red">FULL</span>}
                  </div>
                </div>
                <div className="text-[10px] px-2 py-1 rounded bg-amber-50 text-amber-800 mb-2">{sup.label}: {sup.desc}</div>
                <div className="flex gap-1.5">
                  <a href={waLink(coach.whatsapp || process.env.NEXT_PUBLIC_WA_BUSINESS || '', `Hi! Interested in "${prog.name}".`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm">💬 WhatsApp</a>
                  <Link href={`/programs/${prog.slug || prog._id}`} className="btn-outline btn-sm">Full Details</Link>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Q&A */}
      {coach.qa?.length > 0 && (
        <div className="card mt-4 mb-3 animate-fade-in">
          <div className="p-3.5 border-b border-slate-100 font-bold text-sm">💬 Parent Q&A</div>
          {coach.qa.map((item, i) => (
            <div key={i} className="border-b border-slate-50 last:border-0">
              <button onClick={() => setQaOpen((p) => ({ ...p, [i]: !p[i] }))} className="w-full p-3.5 flex justify-between items-center text-left">
                <span className="font-semibold text-xs">❓ {item.question}</span>
                <span className={`text-slate-400 transition-transform ${qaOpen[i] ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {qaOpen[i] && (
                <div className="px-3.5 pb-3.5">
                  <div className="px-3 py-2 rounded-lg text-xs leading-relaxed bg-green-50 text-green-900 border-l-2" style={{ borderColor: cat.color }}>
                    {item.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Testimonials */}
      {coach.testimonials?.map((t, i) => (
        <div key={i} className="card p-3.5 mb-2 animate-fade-in">
          <div className="flex justify-between mb-1">
            <span className="font-bold text-xs">{t.parent}</span>
            <span className="text-amber-500 text-[11px]">{'★'.repeat(t.rating)}</span>
          </div>
          <p className="text-xs text-slate-600 italic">&ldquo;{t.text}&rdquo;</p>
        </div>
      ))}

      {/* Back link */}
      <div className="text-center mt-6">
        <Link href="/#coaches" className="btn-outline">← All Coaches</Link>
      </div>
    </div>
  );
}
