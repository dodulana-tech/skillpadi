'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const CATEGORIES = [
  { id: 'swimming', label: 'Swimming', icon: '🏊' },
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'taekwondo', label: 'Taekwondo', icon: '🥋' },
  { id: 'piano', label: 'Piano', icon: '🎹' },
  { id: 'chess', label: 'Chess', icon: '♟️' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
  { id: 'coding', label: 'Coding', icon: '💻' },
];

const FACILITIES = [
  { id: 'pool', label: 'Swimming Pool' },
  { id: 'football-pitch', label: 'Football Pitch' },
  { id: 'indoor-hall', label: 'Indoor Hall' },
  { id: 'open-field', label: 'Open Field' },
  { id: 'music-room', label: 'Music Room' },
  { id: 'computer-lab', label: 'Computer Lab' },
  { id: 'none', label: 'None currently' },
];

const SCHOOL_TYPES = [
  { id: 'nursery', label: 'Nursery (ages 2–5)' },
  { id: 'primary', label: 'Primary (ages 6–11)' },
  { id: 'secondary', label: 'Secondary (ages 12–17)' },
  { id: 'nursery-primary', label: 'Nursery & Primary (ages 2–11)' },
  { id: 'primary-secondary', label: 'Primary & Secondary (ages 6–17)' },
  { id: 'all-through', label: 'All-through (ages 2–17)' },
];

const AREAS = [
  'Maitama', 'Wuse', 'Wuse 2', 'Garki', 'Asokoro', 'Jabi',
  'Gwarinpa', 'Life Camp', 'Kubwa', 'Apo', 'Lugbe',
  'Lekki', 'Ikoyi', 'Victoria Island', 'Ajah', 'Surulere',
  'Yaba', 'Ikeja', 'Other',
];

const STEPS = [
  { id: 1, label: 'School Details', icon: '🏫' },
  { id: 2, label: 'Contact Person', icon: '👤' },
  { id: 3, label: 'Programs', icon: '📚' },
  { id: 4, label: 'Review', icon: '✅' },
];

export default function SchoolApplyPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    // Step 1
    schoolName: '',
    schoolType: '',
    area: '',
    address: '',
    estimatedStudents: '',
    website: '',
    // Step 2
    contactName: '',
    contactRole: '',
    contactEmail: '',
    contactPhone: '',
    // Step 3
    interestedCategories: [],
    initialStudents: '',
    facilities: [],
    notes: '',
    // Step 4
    confirmed: false,
  });

  // Fetch real categories from API
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => {
      if (d.categories?.length) setCategories(d.categories);
    }).catch(() => {});
  }, []);

  const sf = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const toggleArray = (field, val) => {
    setForm(prev => {
      const arr = prev[field] || [];
      return {
        ...prev,
        [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val],
      };
    });
  };

  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (!form.schoolName.trim()) return setError('School name is required'), false;
      if (!form.schoolType) return setError('Please select the school type'), false;
      if (!form.area) return setError('Please select your area'), false;
      if (!form.address.trim()) return setError('Address is required'), false;
    }
    if (step === 2) {
      if (!form.contactName.trim()) return setError('Contact name is required'), false;
      if (!form.contactEmail.trim()) return setError('Email is required'), false;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) return setError('Please enter a valid email'), false;
      if (!form.contactPhone.trim()) return setError('Phone number is required'), false;
    }
    if (step === 4) {
      if (!form.confirmed) return setError('Please confirm you are authorized to represent this school'), false;
    }
    return true;
  };

  const next = () => {
    if (validateStep()) setStep(s => s + 1);
  };
  const back = () => { setError(''); setStep(s => s - 1); };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/schools/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: form.schoolName.trim(),
          schoolType: form.schoolType,
          area: form.area,
          address: form.address.trim(),
          estimatedStudents: form.estimatedStudents ? Number(form.estimatedStudents) : undefined,
          website: form.website.trim() || undefined,
          contactName: form.contactName.trim(),
          contactRole: form.contactRole.trim() || undefined,
          contactEmail: form.contactEmail.trim().toLowerCase(),
          contactPhone: form.contactPhone.trim(),
          interestedCategories: form.interestedCategories,
          initialStudents: form.initialStudents ? Number(form.initialStudents) : undefined,
          facilities: form.facilities,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Submission failed. Please try again.');
      }
    } catch (e) {
      setError('Network error. Please check your connection and try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-cream">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-28 pb-16 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="font-serif text-3xl mb-3">Welcome aboard!</h1>
          <p className="text-slate-600 text-sm mb-6">
            We&apos;ll WhatsApp you within 24 hours to get everything set up.
          </p>
          <div className="card p-5 mb-6 text-left bg-teal-primary/5 border-teal-primary/20">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3">What happens next</div>
            <div className="space-y-2">
              {[
                'Our team reviews your details',
                'We WhatsApp you to plan the first sessions',
                'You receive a school invite code',
                'Parents enroll their children using your code',
              ].map((step, i) => (
                <div key={i} className="flex gap-3 text-sm text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-teal-primary/10 text-teal-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
          <Link href="/" className="btn-primary">Back to SkillPadi</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏫</div>
          <h1 className="font-serif text-3xl mb-2">Partner With SkillPadi</h1>
          <p className="text-slate-500 text-sm">
            Bring structured P.E. and extracurricular programs to your school.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                step === s.id
                  ? 'bg-teal-primary text-white'
                  : step > s.id
                  ? 'bg-teal-primary/20 text-teal-primary'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                <span>{step > s.id ? '✓' : s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-4 sm:w-8 ${step > s.id ? 'bg-teal-primary' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="card p-6">
          {/* ── STEP 1: School Details ── */}
          {step === 1 && (
            <div>
              <div className="font-bold text-base mb-5">School Details</div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">School Name <span className="text-red-400">*</span></label>
                  <input className="input-field w-full" placeholder="e.g. Greenfield Academy" value={form.schoolName} onChange={sf('schoolName')} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">School Type <span className="text-red-400">*</span></label>
                  <select className="input-field w-full" value={form.schoolType} onChange={sf('schoolType')}>
                    <option value="">Select type…</option>
                    {SCHOOL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Area <span className="text-red-400">*</span></label>
                    <select className="input-field w-full" value={form.area} onChange={sf('area')}>
                      <option value="">Select area…</option>
                      {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Est. No. of Students</label>
                    <input className="input-field w-full" type="number" min={0} placeholder="e.g. 300" value={form.estimatedStudents} onChange={sf('estimatedStudents')} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Full Address <span className="text-red-400">*</span></label>
                  <input className="input-field w-full" placeholder="e.g. 12 Aminu Kano Crescent, Wuse 2, Abuja" value={form.address} onChange={sf('address')} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Website <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input className="input-field w-full" placeholder="https://yourschool.edu.ng" value={form.website} onChange={sf('website')} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Contact Person ── */}
          {step === 2 && (
            <div>
              <div className="font-bold text-base mb-5">Contact Person</div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Full Name <span className="text-red-400">*</span></label>
                    <input className="input-field w-full" placeholder="e.g. Chike Obi" value={form.contactName} onChange={sf('contactName')} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Your Role at School</label>
                    <input className="input-field w-full" placeholder="e.g. Head of Sports" value={form.contactRole} onChange={sf('contactRole')} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Email Address <span className="text-red-400">*</span></label>
                  <input className="input-field w-full" type="email" placeholder="contact@yourschool.edu.ng" value={form.contactEmail} onChange={sf('contactEmail')} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Phone / WhatsApp <span className="text-red-400">*</span></label>
                  <input className="input-field w-full" type="tel" placeholder="+234 801 234 5678" value={form.contactPhone} onChange={sf('contactPhone')} />
                  <p className="text-[10px] text-slate-400 mt-1">We will WhatsApp you at this number within 24 hours.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Programs of Interest ── */}
          {step === 3 && (
            <div>
              <div className="font-bold text-base mb-5">Programs of Interest</div>
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-2">Programs you&apos;d like for your students</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleArray('interestedCategories', cat.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                          form.interestedCategories.includes(cat.id)
                            ? 'bg-teal-primary text-white border-teal-primary'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-teal-primary/40'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">How many students would you like to enroll initially?</label>
                  <input className="input-field w-full sm:w-48" type="number" min={1} placeholder="e.g. 50" value={form.initialStudents} onChange={sf('initialStudents')} />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-2">Facilities available at your school</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FACILITIES.map(f => (
                      <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.facilities.includes(f.id)}
                          onChange={() => toggleArray('facilities', f.id)}
                          className="rounded border-slate-300 text-teal-primary focus:ring-teal-primary"
                        />
                        <span className="text-xs text-slate-600">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Additional notes <span className="text-slate-400 font-normal">(optional)</span></label>
                  <textarea
                    className="input-field w-full resize-none"
                    rows={3}
                    placeholder="Any special requirements, preferences, or questions..."
                    value={form.notes}
                    onChange={sf('notes')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Review & Submit ── */}
          {step === 4 && (
            <div>
              <div className="font-bold text-base mb-5">Review & Confirm</div>
              <div className="space-y-4">
                <Section title="School Details">
                  <Row label="Name">{form.schoolName}</Row>
                  <Row label="Type">{SCHOOL_TYPES.find(t => t.id === form.schoolType)?.label || form.schoolType}</Row>
                  <Row label="Area">{form.area}</Row>
                  <Row label="Address">{form.address}</Row>
                  {form.estimatedStudents && <Row label="Est. Students">{form.estimatedStudents}</Row>}
                  {form.website && <Row label="Website">{form.website}</Row>}
                </Section>

                <Section title="Contact Person">
                  <Row label="Name">{form.contactName}</Row>
                  {form.contactRole && <Row label="Role">{form.contactRole}</Row>}
                  <Row label="Email">{form.contactEmail}</Row>
                  <Row label="Phone">{form.contactPhone}</Row>
                </Section>

                <Section title="Programs & Facilities">
                  {form.interestedCategories.length > 0 && (
                    <Row label="Programs">
                      <div className="flex flex-wrap gap-1">
                        {form.interestedCategories.map(id => {
                          const c = CATEGORIES.find(c => c.id === id);
                          return c ? <span key={id} className="badge badge-green text-[9px]">{c.icon} {c.label}</span> : null;
                        })}
                      </div>
                    </Row>
                  )}
                  {form.initialStudents && <Row label="Initial Enrollment">{form.initialStudents} students</Row>}
                  {form.facilities.length > 0 && (
                    <Row label="Facilities">
                      <div className="flex flex-wrap gap-1">
                        {form.facilities.map(id => {
                          const f = FACILITIES.find(f => f.id === id);
                          return f ? <span key={id} className="badge badge-gray text-[9px]">{f.label}</span> : null;
                        })}
                      </div>
                    </Row>
                  )}
                  {form.notes && <Row label="Notes">{form.notes}</Row>}
                </Section>

                <label className="flex items-start gap-3 cursor-pointer mt-4 p-3 rounded-xl border border-slate-200 hover:border-teal-primary/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.confirmed}
                    onChange={sf('confirmed')}
                    className="mt-0.5 rounded border-slate-300 text-teal-primary focus:ring-teal-primary"
                  />
                  <span className="text-xs text-slate-600">
                    I confirm that I am authorized to represent <strong>{form.schoolName || 'this school'}</strong> and that the information provided is accurate.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <div>
              {step > 1 && (
                <button onClick={back} className="btn-outline btn-sm">← Back</button>
              )}
            </div>
            <div>
              {step < 4 ? (
                <button onClick={next} className="btn-primary btn-sm">
                  Continue →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary btn-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting…' : "Let's Go"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          Already a partner?{' '}
          <Link href="/school" className="text-teal-primary font-semibold hover:underline">
            Go to School Portal →
          </Link>
        </p>
      </div>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">{title}</div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex gap-3 px-4 py-2.5 text-xs">
      <span className="text-slate-400 w-24 shrink-0">{label}</span>
      <span className="text-slate-700 font-medium">{children}</span>
    </div>
  );
}
