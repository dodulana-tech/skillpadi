'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { toast } from 'sonner';

const WA_BIZ = process.env.NEXT_PUBLIC_WA_BUSINESS || '234XXXXXXXXXX';

const CATEGORIES = [
  { icon: '🏊', name: 'Swimming' },
  { icon: '⚽', name: 'Football' },
  { icon: '♟️', name: 'Chess' },
  { icon: '🎹', name: 'Piano / Music' },
  { icon: '🥋', name: 'Taekwondo' },
  { icon: '💻', name: 'Coding' },
  { icon: '🎾', name: 'Tennis' },
  { icon: '🏀', name: 'Basketball' },
];

export default function LagosPage() {
  const [form, setForm] = useState({ name: '', phone: '', area: '', interests: [] });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleInterest = (cat) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(cat)
        ? prev.interests.filter(i => i !== cat)
        : [...prev.interests, cat],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and WhatsApp number are required');
      return;
    }
    setSubmitting(true);
    try {
      // Submit as an enquiry with source='website' and city tag
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName: form.name.trim(),
          phone: form.phone.trim(),
          message: `Lagos Waitlist — Area: ${form.area || 'Not specified'}. Interests: ${form.interests.join(', ') || 'Open to all'}`,
          source: 'website',
          city: 'lagos',
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        toast.success('You\'re on the list!');
      } else {
        toast.error('Something went wrong — try WhatsApp instead');
      }
    } catch {
      toast.error('Network error — try WhatsApp instead');
    }
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-20 pb-16">

        {/* Hero */}
        <div className="text-center py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Coming to Lagos
          </div>
          <h1 className="font-serif text-3xl mb-3 leading-snug">
            SkillPadi is in<br />
            <span className="text-teal-700">Lagos! 🌊</span>
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed max-w-sm mx-auto">
            Nigeria&apos;s most trusted kids&apos; skills platform is expanding to Lagos. Swimming, chess, coding, football and more — starting in Lekki, Ikoyi, and Victoria Island.
          </p>
        </div>

        {/* Founding member offer */}
        <div className="card p-5 mb-6 border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🎁</div>
            <div>
              <div className="font-bold text-sm text-amber-900 mb-1">Founding Member Offer</div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Join the waitlist today and get <strong>Lagos Founding Member</strong> pricing:
                just <strong>₦10,000</strong> (vs. ₦15,000 regular) — locked in for life.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-lg font-serif text-amber-700 line-through text-sm">₦15,000</span>
                <span className="text-xl font-serif text-amber-900 font-bold">₦10,000</span>
                <span className="badge bg-amber-200 text-amber-800 text-[8px]">Founding Member</span>
              </div>
            </div>
          </div>
        </div>

        {/* What's coming */}
        <div className="card p-4 mb-6">
          <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-3">Activities Launching First</div>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map(c => (
              <div key={c.name} className="text-center py-2">
                <div className="text-2xl mb-1">{c.icon}</div>
                <div className="text-[8px] text-slate-500 font-medium">{c.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Areas */}
        <div className="card p-4 mb-6">
          <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-2">Launch Areas</div>
          <div className="flex flex-wrap gap-2">
            {['Lekki', 'Ikoyi', 'Victoria Island', 'Ajah', 'Sangotedo'].map(area => (
              <span key={area} className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-semibold border border-teal-200/60">
                📍 {area}
              </span>
            ))}
          </div>
        </div>

        {/* Waitlist form */}
        {submitted ? (
          <div className="card p-8 text-center border-green-300/60 bg-green-50/30">
            <div className="text-4xl mb-3">🎉</div>
            <div className="font-bold text-sm text-green-800 mb-2">You&apos;re on the list!</div>
            <p className="text-[11px] text-green-700 leading-relaxed mb-4">
              We&apos;ll WhatsApp you as soon as registrations open in your area.
              Expect to hear from us within 4–6 weeks.
            </p>
            <a
              href={`https://wa.me/${WA_BIZ}?text=${encodeURIComponent('Hi! I just joined the SkillPadi Lagos waitlist. So excited!')}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-xs font-semibold rounded-full hover:bg-green-600 transition-colors">
              💬 WhatsApp Us Directly
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-5">
            <div className="font-bold text-sm mb-4">Join the Waitlist</div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Your Name <span className="text-red-400">*</span>
                </label>
                <input
                  className="input-field text-sm w-full"
                  placeholder="e.g. Chioma Obi"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  maxLength={80}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  WhatsApp Number <span className="text-red-400">*</span>
                </label>
                <input
                  className="input-field text-sm w-full"
                  placeholder="08012345678"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  maxLength={20}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Your Area <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <select
                  className="input-field text-sm w-full"
                  value={form.area}
                  onChange={e => setForm(p => ({ ...p, area: e.target.value }))}>
                  <option value="">— select area —</option>
                  {['Lekki', 'Ikoyi', 'Victoria Island', 'Ajah', 'Sangotedo', 'Other Lagos'].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1.5">
                  Activities You&apos;re Interested In <span className="text-slate-400 font-normal">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      type="button"
                      key={c.name}
                      onClick={() => toggleInterest(c.name)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                        form.interests.includes(c.name)
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-teal-400'
                      }`}>
                      {c.icon} {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full text-sm py-3 disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? 'Joining...' : 'Join Lagos Waitlist — Free'}
            </button>
            <p className="text-[9px] text-slate-400 text-center mt-2">
              No spam. Just a WhatsApp message when we launch near you.
            </p>
          </form>
        )}

        {/* Social proof */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-slate-400">
            Already trusted by 150+ families in Abuja ·{' '}
            <Link href="/" className="text-teal-600 hover:underline">See the platform →</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
