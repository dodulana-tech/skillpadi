'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import EnrollmentCheckout from '@/components/EnrollmentCheckout';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
const VAT = 0.075;

const SUPERVISION = {
  'parent-present': { label: 'Parent Stays', icon: '👁️', desc: 'Parent must remain at venue during sessions.' },
  'drop-off': { label: 'Drop & Pick', icon: '🚗', desc: 'Drop off your child. Coach will WhatsApp at start and end.' },
  'school-chaperone': { label: 'School Chaperone', icon: '🏫', desc: 'School staff escorts the group to and from sessions.' },
  'nanny-driver': { label: 'Nanny/Driver', icon: '🙋', desc: 'Pre-registered nanny or driver can drop off and pick up.' },
};

export function ProgramDetailClient({ program }) {
  const cat = program.categoryId || {};
  const coach = program.coachId || {};
  const total = program.pricePerSession * program.sessions;
  const tax = Math.round(total * VAT);
  const spots = program.spotsTotal - program.spotsTaken;
  const sup = SUPERVISION[program.supervision] || {};
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [form, setForm] = useState({ parentName: '', phone: '', childName: '', childAge: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const submitEnquiry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, childAge: Number(form.childAge), programId: program._id, source: 'website' }),
      });
      if (res.ok) {
        toast.success('Enquiry sent! We\'ll WhatsApp you within 24hrs.');
        setShowEnquiry(false);
      } else {
        toast.error('Failed — try WhatsApp instead.');
      }
    } catch {
      toast.error('Network error');
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-20 pb-12">
      {/* Header */}
      <div className="card overflow-hidden mb-3 animate-fade-in">
        <div className="h-16 flex items-center px-5" style={{ background: `linear-gradient(135deg, ${cat.color}15, ${cat.color}05)` }}>
          <span className="text-3xl mr-3">{cat.icon}</span>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>{cat.name}</div>
            <h1 className="font-serif text-xl">{program.name}</h1>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div>📍 <span className="font-semibold">{program.location}</span></div>
            <div>📅 <span className="font-semibold">{program.schedule}</span></div>
            <div>⏱️ <span className="font-semibold">{program.duration} min/session</span></div>
            <div>👥 <span className="font-semibold">{program.groupSize}</span></div>
            <div>👶 <span className="font-semibold">Ages {program.ageRange}</span></div>
            <div>📋 <span className="font-semibold">{program.sessions} sessions</span></div>
          </div>
          {program.locationNote && <p className="text-[10px] text-slate-400">📌 {program.locationNote}</p>}
        </div>
      </div>

      {/* Supervision */}
      <div className="card p-4 mb-3 animate-fade-in" style={{ background: '#FFFBEB' }}>
        <div className="font-bold text-xs mb-1">{sup.icon} Supervision: {sup.label}</div>
        <p className="text-[11px] text-amber-900">{sup.desc}</p>
      </div>

      {/* Pricing */}
      <div className="card p-5 mb-3 animate-fade-in">
        <div className="flex justify-between items-end mb-3">
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-bold">Total ({program.sessions} sessions)</div>
            <div className="font-serif text-2xl">{fmt(total)}</div>
            <div className="text-[10px] text-slate-400">+ {fmt(tax)} VAT (7.5%) = <span className="font-bold text-slate-700">{fmt(total + tax)}</span></div>
          </div>
          <div>
            {spots > 0 ? <span className="badge badge-green text-sm px-3 py-1">{spots} spots left</span> : <span className="badge badge-red text-sm px-3 py-1">FULL — Waitlist</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEnroll(true)} className="btn-primary flex-1 justify-center py-2.5">Enroll Now →</button>
          <button onClick={() => setShowEnquiry(true)} className="btn-outline flex-1 justify-center py-2.5">Ask a Question</button>
        </div>
      </div>

      {/* Coach */}
      <div className="card p-4 mb-3 animate-fade-in">
        <div className="text-[9px] uppercase font-bold text-slate-400 mb-2">Your Coach</div>
        <Link href={`/coaches/${coach.slug}`} className="flex items-center gap-3 hover:bg-slate-50 -mx-1 px-1 py-1 rounded-lg transition-colors">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}aa)` }}>
            {coach.initials}
          </div>
          <div>
            <div className="font-bold text-sm">{coach.name}</div>
            <div className="text-[10px] text-slate-500">⭐ {coach.rating} ({coach.reviewCount} reviews) · {coach.yearsExperience} yrs · Ages {coach.ageGroups}</div>
          </div>
        </Link>
      </div>

      {/* Milestones */}
      {program.milestones?.length > 0 && (
        <div className="card p-4 mb-3 animate-fade-in">
          <div className="text-[9px] uppercase font-bold text-slate-400 mb-2">Milestones ({program.milestones.length})</div>
          <div className="space-y-1.5">
            {program.milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-bold flex items-center justify-center text-slate-500">{i + 1}</span>
                <span>{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What to bring */}
      {program.whatToBring?.length > 0 && (
        <div className="card p-4 mb-3 animate-fade-in">
          <div className="text-[9px] uppercase font-bold text-slate-400 mb-2">What to Bring</div>
          <div className="flex flex-wrap gap-1.5">
            {program.whatToBring.map((item, i) => (
              <span key={i} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[10px]">{item}</span>
            ))}
          </div>
        </div>
      )}

      {/* Safety */}
      {program.safetyNote && (
        <div className="card p-4 mb-3 bg-blue-50 border-blue-200/60 animate-fade-in">
          <div className="text-[9px] uppercase font-bold text-blue-500 mb-1">Safety</div>
          <p className="text-xs text-blue-900">{program.safetyNote}</p>
        </div>
      )}

      <div className="text-center mt-6">
        <Link href="/#programs" className="btn-outline">← All Programs</Link>
      </div>

      {/* Enrollment Checkout */}
      {showEnroll && (
        <EnrollmentCheckout program={program} onClose={() => setShowEnroll(false)} />
      )}

      {/* Enquiry Modal */}
      {showEnquiry && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={() => setShowEnquiry(false)}>
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-sm rounded-2xl">
            <div className="p-5">
              <div className="flex justify-between mb-3">
                <div>
                  <h3 className="font-serif text-lg">Enquire</h3>
                  <p className="text-teal-primary font-semibold text-[11px]">{program.name}</p>
                </div>
                <button onClick={() => setShowEnquiry(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
              </div>
              <form onSubmit={submitEnquiry} className="space-y-2.5">
                <div><label className="label">Your Name</label><input className="input" required value={form.parentName} onChange={(e) => setForm((p) => ({ ...p, parentName: e.target.value }))} /></div>
                <div><label className="label">WhatsApp</label><input className="input" required placeholder="0812-345-6789" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
                <div><label className="label">Child&apos;s Name</label><input className="input" required value={form.childName} onChange={(e) => setForm((p) => ({ ...p, childName: e.target.value }))} /></div>
                <div><label className="label">Age</label><input className="input" type="number" min="2" max="18" required value={form.childAge} onChange={(e) => setForm((p) => ({ ...p, childAge: e.target.value }))} /></div>
                <div><label className="label">Message</label><textarea className="input" rows={2} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} /></div>
                <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-2.5 disabled:opacity-50">{submitting ? 'Sending...' : 'Send Enquiry'}</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
