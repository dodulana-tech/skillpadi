'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const FACILITY_OPTIONS = [
  'Swimming pool', 'Football pitch', 'Tennis court', 'Basketball court',
  'Indoor hall', 'Open field', 'Clubhouse', 'Garden area',
];

const AREA_OPTIONS = [
  'Maitama', 'Asokoro', 'Wuse 2', 'Garki', 'Gwarinpa', 'Lugbe',
  'Jabi', 'Kado', 'Nbora', 'Lokogoma', 'Apo', 'Kubwa',
  'Lekki', 'Victoria Island', 'Ikoyi', 'Ajah', 'Other',
];

const STEPS = ['Community Details', 'Facilities', 'Contact Person', 'Review & Submit'];

const validateStep = (step, form) => {
  if (step === 1) return form.name?.trim() && form.type && form.area && form.estimatedHouseholds;
  if (step === 3) return form.contactName?.trim() && form.contactEmail?.trim() && form.contactPhone?.trim();
  return true;
};

export default function CommunityApplyPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', type: '', area: '', city: 'abuja',
    estimatedHouseholds: '', estimatedKids: '',
    facilities: [], venueProvided: true, venueNotes: '',
    contactName: '', contactRole: '', contactEmail: '', contactPhone: '',
    notes: '',
  });

  const setF = (field) => (e) => setForm(prev => ({
    ...prev,
    [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));

  const toggleFacility = (f) => setForm(prev => ({
    ...prev,
    facilities: prev.facilities.includes(f)
      ? prev.facilities.filter(x => x !== f)
      : [...prev.facilities, f],
  }));

  const next = () => {
    if (!validateStep(step, form)) { setError('Please fill in all required fields.'); return; }
    setError('');
    setStep(s => s + 1);
  };

  const submit = async () => {
    if (!validateStep(3, form)) { setError('Please fill in all required contact fields.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/communities/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-16 text-center">
        <div className="text-5xl mb-4">🏘️</div>
        <h1 className="font-serif text-2xl mb-3">Brilliant!</h1>
        <p className="text-slate-600 mb-2">We&apos;ll WhatsApp you within 24 hours to plan the first sessions at <strong>{form.name}</strong>.</p>
        <p className="text-sm text-slate-400 mb-8">Your estate is about to become way more active.</p>
        <Link href="/" className="btn-primary">← Back to SkillPadi</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-20 pb-16">
        <div className="mb-8">
          <h1 className="font-serif text-2xl mb-1">Bring SkillPadi to Your Estate</h1>
          <p className="text-slate-500 text-sm">Your facilities + our coaches = happy residents</p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full mb-1.5 transition-colors ${i + 1 <= step ? 'bg-teal-primary' : 'bg-slate-200'}`} />
              <div className={`text-[9px] font-semibold hidden sm:block ${i + 1 === step ? 'text-teal-primary' : 'text-slate-400'}`}>{label}</div>
            </div>
          ))}
        </div>

        <div className="card p-6 animate-fade-in">
          {/* Step 1: Community Details */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-sm mb-4">Community Details</h2>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Community / Estate Name <span className="text-red-400">*</span></label>
                <input className="input-field w-full text-sm" placeholder="e.g. Gwarinpa Estate, Brains & Hammers" value={form.name} onChange={setF('name')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Type <span className="text-red-400">*</span></label>
                  <select className="input-field w-full text-sm" value={form.type} onChange={setF('type')}>
                    <option value="">Select…</option>
                    <option value="estate">Gated Estate</option>
                    <option value="residential">Residential Compound</option>
                    <option value="community">Community</option>
                    <option value="compound">Housing Estate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">City <span className="text-red-400">*</span></label>
                  <select className="input-field w-full text-sm" value={form.city} onChange={setF('city')}>
                    <option value="abuja">Abuja</option>
                    <option value="lagos">Lagos</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Area <span className="text-red-400">*</span></label>
                <select className="input-field w-full text-sm" value={form.area} onChange={setF('area')}>
                  <option value="">Select neighbourhood…</option>
                  {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Estimated Households <span className="text-red-400">*</span></label>
                  <input className="input-field w-full text-sm" type="number" min={1} placeholder="e.g. 150" value={form.estimatedHouseholds} onChange={setF('estimatedHouseholds')} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Est. Children (3–16)</label>
                  <input className="input-field w-full text-sm" type="number" min={0} placeholder="e.g. 80" value={form.estimatedKids} onChange={setF('estimatedKids')} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Facilities */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold text-sm mb-4">Facilities Available</h2>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-2">Which facilities does your estate have?</label>
                <div className="grid grid-cols-2 gap-2">
                  {FACILITY_OPTIONS.map(f => (
                    <label key={f} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${form.facilities.includes(f) ? 'bg-teal-50 border-teal-300 text-teal-800' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={form.facilities.includes(f)} onChange={() => toggleFacility(f)} className="rounded" />
                      <span className="text-xs">{f}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-2">Would you provide the venue for SkillPadi sessions?</label>
                <div className="flex gap-3">
                  {[{ v: true, label: 'Yes — we have space' }, { v: false, label: 'No — coaches will arrange' }].map(o => (
                    <button key={String(o.v)} onClick={() => setForm(prev => ({ ...prev, venueProvided: o.v }))}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${form.venueProvided === o.v ? 'bg-teal-50 border-teal-300 text-teal-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {form.venueProvided && (
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Venue access notes</label>
                  <textarea className="input-field w-full text-sm resize-none" rows={2}
                    placeholder="e.g. Pool available Sat & Sun 8AM–12PM. Basketball court open daily."
                    value={form.venueNotes} onChange={setF('venueNotes')} />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Contact Person */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold text-sm mb-4">Contact Person</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Full Name <span className="text-red-400">*</span></label>
                  <input className="input-field w-full text-sm" placeholder="e.g. Chuka Obi" value={form.contactName} onChange={setF('contactName')} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Role</label>
                  <input className="input-field w-full text-sm" placeholder="e.g. Estate Manager" value={form.contactRole} onChange={setF('contactRole')} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Email <span className="text-red-400">*</span></label>
                <input className="input-field w-full text-sm" type="email" placeholder="contact@estate.ng" value={form.contactEmail} onChange={setF('contactEmail')} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">WhatsApp Number <span className="text-red-400">*</span></label>
                <input className="input-field w-full text-sm" type="tel" placeholder="08012345678" value={form.contactPhone} onChange={setF('contactPhone')} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Anything else we should know?</label>
                <textarea className="input-field w-full text-sm resize-none" rows={2}
                  placeholder="e.g. We have 2 underutilised tennis courts and a pool that's barely used on weekday mornings."
                  value={form.notes} onChange={setF('notes')} />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-3">
              <h2 className="font-bold text-sm mb-4">Review & Submit</h2>
              {[
                { label: 'Estate', value: `${form.name} (${form.type})` },
                { label: 'Location', value: `${form.area}, ${form.city}` },
                { label: 'Size', value: `~${form.estimatedHouseholds} households, ~${form.estimatedKids || '?'} children` },
                { label: 'Facilities', value: form.facilities.length > 0 ? form.facilities.join(', ') : 'None specified' },
                { label: 'Venue', value: form.venueProvided ? `Yes — ${form.venueNotes || 'available'}` : 'No' },
                { label: 'Contact', value: `${form.contactName} (${form.contactRole || form.contactEmail})` },
                { label: 'Phone', value: form.contactPhone },
              ].map(r => (
                <div key={r.label} className="flex gap-3 text-xs py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 w-20 shrink-0">{r.label}</span>
                  <span className="font-medium">{r.value}</span>
                </div>
              ))}
              <p className="text-[10px] text-slate-400 mt-3">
                By submitting, you agree that SkillPadi may contact you via WhatsApp to discuss the partnership.
              </p>
            </div>
          )}

          {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button onClick={() => { setStep(s => s - 1); setError(''); }} className="btn-outline flex-1">← Back</button>
            )}
            {step < 4 ? (
              <button onClick={next} className="btn-primary flex-1">
                {step === 3 ? 'Review →' : 'Next →'}
              </button>
            ) : (
              <button onClick={submit} disabled={submitting} className="btn-primary flex-1 disabled:opacity-60">
                {submitting ? 'Submitting…' : 'Get Started →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
