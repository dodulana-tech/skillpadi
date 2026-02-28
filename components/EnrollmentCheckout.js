'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const VAT_RATE = 0.075;
const MEMBERSHIP_FEE = 15000;

const SUPERVISION_MAP = {
  'parent-present': { label: 'Parent Stays', icon: '👁️', desc: 'You stay at the venue during sessions.' },
  'drop-off': { label: 'Drop & Pick', icon: '🚗', desc: 'Drop off — coach WhatsApps you at start and end.' },
  'school-chaperone': { label: 'School Chaperone', icon: '🏫', desc: 'School staff chaperones the group.' },
  'nanny-driver': { label: 'Nanny/Driver', icon: '🙋', desc: 'Pre-registered nanny or driver can drop off.' },
};

export default function EnrollmentCheckout({ program, onClose }) {
  const { isAuthenticated, dbUser, authFetch, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: child info, 2: add-ons, 3: review & pay
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [addKit, setAddKit] = useState(false);
  const [kit, setKit] = useState(null);
  const [loadingKit, setLoadingKit] = useState(true);
  const [paying, setPaying] = useState(false);

  const cat = program.categoryId || {};
  const coach = program.coachId || {};
  const sup = SUPERVISION_MAP[program.supervision] || {};
  const programTotal = program.pricePerSession * program.sessions;
  const needsMembership = isAuthenticated && dbUser && !dbUser.membershipPaid;

  // Fetch matching starter kit for this category
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/shop/kits');
        if (res.ok) {
          const data = await res.json();
          const match = data.kits?.find((k) => k.categoryId?._id === cat._id || k.categoryId === cat._id);
          setKit(match || null);
        }
      } catch { /* ignore */ }
      setLoadingKit(false);
    })();
  }, [cat._id]);

  // Calculate totals
  const kitPrice = addKit && kit ? kit.kitPrice : 0;
  const membershipPrice = needsMembership ? MEMBERSHIP_FEE : 0;
  const subtotal = programTotal + kitPrice + membershipPrice;
  const vat = Math.round(subtotal * VAT_RATE);
  const total = subtotal + vat;
  const spots = program.spotsTotal - program.spotsTaken;

  const handlePay = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/signup?redirect=/programs/${program.slug || program._id}`);
      return;
    }

    if (!childName.trim() || !childAge) {
      toast.error('Please enter your child\'s name and age');
      setStep(1);
      return;
    }

    setPaying(true);
    try {
      // Build line items for the checkout
      const items = [
        { type: 'enrollment', programId: program._id, amount: programTotal, label: program.name },
      ];
      if (addKit && kit) {
        items.push({ type: 'starter-kit', kitId: kit._id, amount: kit.kitPrice, label: kit.name });
      }
      if (needsMembership) {
        items.push({ type: 'membership', amount: MEMBERSHIP_FEE, label: 'SkillPadi Membership' });
      }

      const res = await authFetch('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items,
          childName: childName.trim(),
          childAge: Number(childAge),
          programId: program._id,
        }),
      });

      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error || 'Payment failed to initialize');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      console.error(err);
    }
    setPaying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:w-[440px] sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between z-10">
          <div>
            <div className="font-serif text-lg">Enroll in {program.name}</div>
            <div className="text-[10px] text-slate-400">{cat.icon} {cat.name} · {coach.name}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 text-lg">✕</button>
        </div>

        {/* Step indicator */}
        <div className="px-5 pt-3">
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-teal-primary' : 'bg-slate-200'}`} />
            ))}
          </div>
          <div className="text-[9px] text-slate-400 mt-1">
            {step === 1 ? 'Child Details' : step === 2 ? 'Add-ons' : 'Review & Pay'}
          </div>
        </div>

        {/* Step 1: Child Info */}
        {step === 1 && (
          <div className="p-5 space-y-3">
            <div className="card p-3" style={{ background: `${cat.color}06` }}>
              <div className="text-xs text-slate-600">
                <div className="font-semibold mb-1">{program.name}</div>
                <div>📍 {program.location}</div>
                <div>📅 {program.schedule} · {program.duration}min</div>
                <div>👶 Ages {program.ageRange} · {program.groupSize}</div>
                <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded bg-amber-50 text-amber-800 text-[10px]">
                  {sup.icon} {sup.label} — {sup.desc}
                </div>
              </div>
            </div>

            {spots <= 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <div className="text-sm font-bold text-red-800 mb-1">Program is Full</div>
                <p className="text-xs text-red-600">WhatsApp us to join the waitlist.</p>
                <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_BUSINESS || ''}?text=Waitlist for ${program.name}`} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm mt-2 inline-flex">💬 Join Waitlist</a>
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Child&apos;s Name</label>
                  <input className="input" placeholder="e.g. Timi Adebayo" value={childName} onChange={(e) => setChildName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Age</label>
                  <input className="input" type="number" min={2} max={18} placeholder="e.g. 6" value={childAge} onChange={(e) => setChildAge(e.target.value)} />
                  {childAge && (Number(childAge) < (program.ageMin || 2) || Number(childAge) > (program.ageMax || 18)) && (
                    <p className="text-[10px] text-amber-600 mt-1">⚠️ This program is for ages {program.ageRange}</p>
                  )}
                </div>
                <button onClick={() => { if (childName.trim() && childAge) setStep(2); else toast.error('Please fill in both fields'); }}
                  className="btn-primary w-full justify-center py-3 text-sm">
                  Continue →
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 2: Starter Kit Upsell */}
        {step === 2 && (
          <div className="p-5 space-y-3">
            <div className="text-sm font-bold">Does {childName} need equipment?</div>

            {loadingKit ? (
              <div className="text-xs text-slate-400 py-4 text-center">Loading kits...</div>
            ) : kit ? (
              <button onClick={() => setAddKit(!addKit)}
                className={`w-full card p-4 text-left transition-all ${addKit ? 'ring-2 ring-teal-primary bg-teal-50/50' : 'hover:border-slate-300'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{kit.icon}</span>
                      <div>
                        <div className="font-bold text-sm">{kit.name}</div>
                        {kit.brand && <div className="text-[9px] text-slate-400">by {kit.brand}</div>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {kit.contents?.map((c, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-white border border-slate-100 text-[9px]">{c}</span>)}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-[10px] text-slate-400 line-through">{fmt(kit.individualPrice)}</div>
                    <div className="font-serif text-base">{fmt(kit.kitPrice)}</div>
                    <span className="badge badge-green text-[8px]">Save {Math.round(((kit.individualPrice - kit.kitPrice) / kit.individualPrice) * 100)}%</span>
                  </div>
                </div>
                <div className={`mt-2 text-center text-xs font-semibold ${addKit ? 'text-teal-primary' : 'text-slate-400'}`}>
                  {addKit ? '✓ Added to order' : 'Tap to add'}
                </div>
              </button>
            ) : (
              <div className="card p-4 text-center text-xs text-slate-400">
                No starter kit available for this category. You can browse the shop later.
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="btn-outline flex-1 justify-center py-2.5">← Back</button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1 justify-center py-2.5">Review Order →</button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Pay */}
        {step === 3 && (
          <div className="p-5 space-y-3">
            <div className="text-sm font-bold mb-2">Order Summary</div>

            {/* Child */}
            <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Child</span>
              <span className="font-semibold">{childName}, {childAge} yrs</span>
            </div>

            {/* Program */}
            <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
              <div>
                <div className="font-semibold">{cat.icon} {program.name}</div>
                <div className="text-[10px] text-slate-400">{program.sessions} sessions × {fmt(program.pricePerSession)}</div>
              </div>
              <span className="font-semibold">{fmt(programTotal)}</span>
            </div>

            {/* Kit */}
            {addKit && kit && (
              <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                <div>
                  <div className="font-semibold">{kit.icon} {kit.name}</div>
                  <div className="text-[10px] text-slate-400">Starter kit — delivered at session 1</div>
                </div>
                <span className="font-semibold">{fmt(kit.kitPrice)}</span>
              </div>
            )}

            {/* Membership */}
            {needsMembership && (
              <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                <div>
                  <div className="font-semibold">🔐 SkillPadi Membership</div>
                  <div className="text-[10px] text-slate-400">One-time — unlocks all programs</div>
                </div>
                <span className="font-semibold">{fmt(MEMBERSHIP_FEE)}</span>
              </div>
            )}

            {/* VAT */}
            <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
              <span className="text-slate-400">VAT (7.5%)</span>
              <span className="text-slate-400">{fmt(vat)}</span>
            </div>

            {/* Total */}
            <div className="flex justify-between items-end pt-1">
              <span className="text-sm font-bold">Total</span>
              <span className="font-serif text-2xl text-teal-primary">{fmt(total)}</span>
            </div>

            {!isAuthenticated ? (
              <button onClick={() => router.push(`/auth/signup?redirect=${encodeURIComponent(`/programs/${program.slug || program._id}`)}`)}
                className="btn-primary w-full justify-center py-3 text-sm">
                Sign Up to Pay →
              </button>
            ) : (
              <div className="space-y-2">
                <button onClick={handlePay} disabled={paying}
                  className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50">
                  {paying ? 'Redirecting to Paystack...' : `Pay ${fmt(total)} →`}
                </button>
                <button onClick={() => setStep(2)} className="btn-outline w-full justify-center py-2.5 text-xs">← Back</button>
              </div>
            )}

            <p className="text-[9px] text-center text-slate-400 pt-1">
              Secure payment via Paystack · Cards · Bank Transfer · USSD
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
