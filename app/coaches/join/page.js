'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
const WA_BIZ = process.env.NEXT_PUBLIC_WA_BUSINESS || '234XXXXXXXXXX';

export default function CoachJoinPage() {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', city: 'abuja',
    categorySlug: '', title: '', bio: '',
    yearsExperience: '', ageGroups: '',
    certifications: '', venues: '',
    whySkillPadi: '',
  });

  useEffect(() => {
    fetch('/api/categories').then(r => r.ok ? r.json() : {}).then(d => setCategories(d.categories || []));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/coaches/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Something went wrong');
      }
    } catch { toast.error('Network error'); }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-5">
        <div className="max-w-sm text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="font-serif text-2xl mb-2">Welcome aboard!</h1>
          <p className="text-sm text-slate-500 mb-6">
            We&apos;ve received your details. Our team will WhatsApp you within 24 hours to discuss next steps and begin the vetting process.
          </p>
          <div className="flex flex-col gap-2">
            <a href={waLink(WA_BIZ, `Hi! I just applied to coach on SkillPadi. My name is ${form.name}.`)}
              target="_blank" rel="noopener noreferrer"
              className="btn-whatsapp justify-center py-3 rounded-xl">
              💬 Chat With Us Now
            </a>
            <Link href="/" className="btn-outline justify-center py-2.5 rounded-xl text-sm">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="pt-20 pb-8 text-center px-5">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <img src="/logomark.svg" alt="SkillPadi" className="w-10 h-10" />
          <span className="font-serif text-xl text-teal-primary">SkillPadi</span>
        </Link>
        <h1 className="font-serif text-[clamp(1.6rem,4vw,2.2rem)] mb-2">Coach with SkillPadi</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Join Nigeria&apos;s fastest-growing kids&apos; skills platform. We handle bookings, payments, and parent communication — you focus on coaching.
        </p>
      </div>

      {/* Benefits */}
      <div className="max-w-2xl mx-auto px-5 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { icon: '💰', title: 'Earn More', desc: 'Competitive rates, transparent payouts, zero chasing parents for payment' },
            { icon: '📊', title: 'Grow Your Brand', desc: 'Public profile, verified badge, parent reviews, shareable portfolio' },
            { icon: '🛡️', title: 'Trusted Platform', desc: 'Background-checked badge builds parent trust instantly' },
          ].map(b => (
            <div key={b.title} className="card p-4 text-center">
              <div className="text-2xl mb-2">{b.icon}</div>
              <div className="font-bold text-xs mb-1">{b.title}</div>
              <div className="text-[10px] text-slate-500">{b.desc}</div>
            </div>
          ))}
        </div>

        {/* Tier cards */}
        <div className="mb-8">
          <div className="text-[9px] uppercase font-bold text-teal-600 tracking-wider mb-2 text-center">Three Ways to Coach</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { tier: 'Partner', fee: '15%', desc: 'We set pricing, find venues, and fill your classes. You just coach.', badge: 'Most coaches start here' },
              { tier: 'Independent', fee: '15%', desc: 'Set your own rates, create your own programmes. We handle the rest.', badge: 'For established coaches' },
              { tier: 'Master', fee: '10%', desc: 'Build your academy on SkillPadi. Branded methodology, multiple coaches.', badge: 'By invitation' },
            ].map(t => (
              <div key={t.tier} className="card p-4">
                <div className="text-[8px] font-bold text-teal-600 uppercase tracking-wider mb-1">{t.badge}</div>
                <div className="font-serif text-base mb-0.5">{t.tier} Coach</div>
                <div className="text-[10px] text-slate-500 mb-2">{t.desc}</div>
                <div className="text-xs font-semibold text-slate-700">Platform fee: {t.fee}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application form */}
      <div className="max-w-lg mx-auto px-5 pb-16">
        <div className="card rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white">
            <h2 className="font-serif text-lg">Join as a Coach</h2>
            <p className="text-[11px] text-teal-100">Step {step} of 2 — {step === 1 ? 'About You' : 'Your Coaching'}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-3">
            {step === 1 && (
              <>
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" required placeholder="Coach Amaka Obi" value={form.name} onChange={set('name')} />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input className="input" type="email" required placeholder="amaka@email.com" value={form.email} onChange={set('email')} />
                </div>
                <div>
                  <label className="label">WhatsApp Number *</label>
                  <input className="input" type="tel" required placeholder="0812-345-6789" value={form.phone} onChange={set('phone')} />
                </div>
                <div>
                  <label className="label">City *</label>
                  <select className="input" value={form.city} onChange={set('city')}>
                    <option value="abuja">Abuja</option>
                    <option value="lagos">Lagos</option>
                  </select>
                </div>
                <div>
                  <label className="label">Sport / Skill Category *</label>
                  <select className="input" required value={form.categorySlug} onChange={set('categorySlug')}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => { if (form.name && form.email && form.phone && form.categorySlug) setStep(2); else toast.error('Please fill all required fields'); }}
                  className="btn-primary w-full justify-center py-3">
                  Continue →
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="label">Your Title</label>
                  <input className="input" placeholder="e.g. Head Swimming Instructor" value={form.title} onChange={set('title')} />
                </div>
                <div>
                  <label className="label">Years of Experience *</label>
                  <input className="input" type="number" required min="0" max="50" placeholder="e.g. 8" value={form.yearsExperience} onChange={set('yearsExperience')} />
                </div>
                <div>
                  <label className="label">Age Groups You Teach</label>
                  <input className="input" placeholder="e.g. 3-12" value={form.ageGroups} onChange={set('ageGroups')} />
                </div>
                <div>
                  <label className="label">Certifications</label>
                  <textarea className="input" rows={2} placeholder="e.g. STA Level 2, Lifeguard RLSS, CAF C License" value={form.certifications} onChange={set('certifications')} />
                </div>
                <div>
                  <label className="label">Preferred Venues</label>
                  <input className="input" placeholder="e.g. Transcorp Hilton Pool, Jabi Lake Turf" value={form.venues} onChange={set('venues')} />
                </div>
                <div>
                  <label className="label">Short Bio</label>
                  <textarea className="input" rows={3} placeholder="Tell parents about yourself, your coaching style, and what makes you great with kids." value={form.bio} onChange={set('bio')} />
                </div>
                <div>
                  <label className="label">Why SkillPadi?</label>
                  <textarea className="input" rows={2} placeholder="What made you interested in coaching on SkillPadi?" value={form.whySkillPadi} onChange={set('whySkillPadi')} />
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(1)} className="btn-outline flex-1 justify-center py-2.5">← Back</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-50">
                    {submitting ? 'Submitting...' : "Let's Go"}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        <p className="text-[10px] text-center text-slate-400 mt-4">
          All coaches go through our 14-point vetting process including background checks, credential verification, and safeguarding training.
        </p>
      </div>
    </div>
  );
}
