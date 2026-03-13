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
  const { isAuthenticated, dbUser, authFetch } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childGender, setChildGender] = useState('');
  const [selectedChildIdx, setSelectedChildIdx] = useState(null);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [isNewChild, setIsNewChild] = useState(false);
  const [savingGender, setSavingGender] = useState(false);

  const [addKit, setAddKit] = useState(false);
  const [kit, setKit] = useState(null);
  const [loadingKit, setLoadingKit] = useState(true);
  const [paying, setPaying] = useState(false);
  const [schoolPricing, setSchoolPricing] = useState(null); // { parentTotalPrice, schoolMarkup, schoolId }
  const [communityPricing, setCommunityPricing] = useState(null); // { residentTotalPrice, ... }
  const [impactDonation, setImpactDonation] = useState(0);
  const [impactProgram, setImpactProgram] = useState(null);

  const savedChildren = dbUser?.children || [];
  const hasChildren = savedChildren.length > 0;

  const cat = program.categoryId || {};
  const coach = program.coachId || {};
  const sup = SUPERVISION_MAP[program.supervision] || {};
  const programTotal = program.pricePerSession * program.sessions;
  const needsMembership = isAuthenticated && dbUser && !dbUser.membershipPaid;
  const progGender = program.gender || 'any';
  const genderLabel = progGender === 'female' ? 'girls' : 'boys';

  // Auto-select first saved child on open
  useEffect(() => {
    if (hasChildren && !useManualEntry && selectedChildIdx === null) {
      const child = savedChildren[0];
      setSelectedChildIdx(0);
      setChildName(child.name);
      setChildAge(String(child.age || ''));
      setChildGender(child.gender || '');
      setIsNewChild(false);
    }
  }, [hasChildren]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch school pricing if parent is affiliated with a school
  useEffect(() => {
    const schoolId = dbUser?.schoolId;
    if (!schoolId || !program._id) return;
    (async () => {
      try {
        const res = await fetch(`/api/schools/${schoolId}/pricing?programId=${program._id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.pricing) setSchoolPricing(data.pricing);
        }
      } catch { /* ignore — fall back to base price */ }
    })();
  }, [dbUser?.schoolId, program._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch community pricing if parent is a resident
  useEffect(() => {
    const communityId = dbUser?.communityId;
    if (!communityId || !program._id) return;
    (async () => {
      try {
        const res = await fetch(`/api/communities/${communityId}/pricing?programId=${program._id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.pricing) setCommunityPricing(data.pricing);
        }
      } catch { /* ignore */ }
    })();
  }, [dbUser?.communityId, program._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch active Impact program for cross-subsidy
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/impact/programs');
        if (res.ok) {
          const data = await res.json();
          const active = (data.programs || []).find(p => p.status === 'funding');
          if (active) setImpactProgram(active);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Fetch matching starter kit
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

  const selectChild = (idx) => {
    const child = savedChildren[idx];
    setSelectedChildIdx(idx);
    setChildName(child.name);
    setChildAge(String(child.age || ''));
    setChildGender(child.gender || '');
    setIsNewChild(false);
  };

  const switchToManual = () => {
    setUseManualEntry(true);
    setSelectedChildIdx(null);
    setChildName('');
    setChildAge('');
    setChildGender('');
    setIsNewChild(true);
  };

  const switchToSaved = () => {
    setUseManualEntry(false);
    setIsNewChild(false);
    if (savedChildren.length > 0) selectChild(0);
  };

  // Gender validation flags
  const genderBlocked = progGender !== 'any' && !!childGender && childGender !== progGender;
  const genderUnknown = progGender !== 'any' && !childGender && !!childName;

  const saveGenderToProfile = async (gender) => {
    setSavingGender(true);
    setChildGender(gender);
    if (selectedChildIdx !== null && isAuthenticated) {
      const updated = savedChildren.map((c, i) => i === selectedChildIdx ? { ...c, gender } : c);
      try {
        await authFetch('/api/users', { method: 'PATCH', body: JSON.stringify({ children: updated }) });
      } catch (e) { console.error('Failed to save gender', e); }
    }
    setSavingGender(false);
  };

  const ageWarning = childAge && childName && (
    Number(childAge) < (program.ageMin || 2) || Number(childAge) > (program.ageMax || 18)
  );

  const kitPrice = addKit && kit ? kit.kitPrice : 0;
  const membershipPrice = needsMembership ? MEMBERSHIP_FEE : 0;
  // School markup > community resident price > base price
  const effectiveProgramTotal = schoolPricing?.parentTotalPrice ?? communityPricing?.residentTotalPrice ?? programTotal;
  const effectivePricePerSession = schoolPricing?.parentPricePerSession ?? communityPricing?.residentPricePerSession ?? program.pricePerSession;
  const subtotal = effectiveProgramTotal + kitPrice + membershipPrice;
  const vat = Math.round(subtotal * VAT_RATE);
  const total = subtotal + vat + impactDonation;
  const spots = program.spotsTotal - program.spotsTaken;

  const handleContinueFromStep1 = async () => {
    if (!childName.trim() || !childAge) {
      toast.error("Please fill in your child's name and age");
      return;
    }
    if (genderBlocked) {
      toast.error(`This program is for ${genderLabel} only`);
      return;
    }
    if (genderUnknown) {
      toast.error("Please confirm your child's gender for this program");
      return;
    }
    // Save new child to profile before proceeding
    if (isNewChild && isAuthenticated && childName.trim() && childAge) {
      const newChild = { name: childName.trim(), age: Number(childAge), ...(childGender && { gender: childGender }) };
      try {
        await authFetch('/api/users', {
          method: 'PATCH',
          body: JSON.stringify({ children: [...savedChildren, newChild] }),
        });
      } catch (e) { console.error('Failed to save child to profile', e); }
    }
    setStep(2);
  };

  const handlePay = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/signup?redirect=/programs/${program.slug || program._id}`);
      return;
    }
    if (!childName.trim() || !childAge) {
      toast.error("Please enter your child's name and age");
      setStep(1);
      return;
    }

    setPaying(true);
    try {
      const items = [
        { type: 'enrollment', programId: program._id, amount: effectiveProgramTotal, label: program.name },
      ];
      if (addKit && kit) {
        items.push({ type: 'starter-kit', kitId: kit._id, amount: kit.kitPrice, label: kit.name });
      }
      if (needsMembership) {
        items.push({ type: 'membership', amount: MEMBERSHIP_FEE, label: 'SkillPadi Membership' });
      }
      if (impactDonation > 0 && impactProgram) {
        items.push({ type: 'impact-donation', amount: impactDonation, programId: impactProgram._id, label: `Impact: ${impactProgram.name}` });
      }

      const checkoutPayload = {
        items,
        childName: childName.trim(),
        childAge: Number(childAge),
        programId: program._id,
      };

      // Attach school revenue split if applicable
      if (schoolPricing && dbUser?.schoolId) {
        checkoutPayload.schoolId = String(dbUser.schoolId);
        checkoutPayload.schoolMarkup = schoolPricing.markupAmount * (schoolPricing.sessions || 1);
      }
      // Attach community revenue split if applicable
      if (!schoolPricing && communityPricing && dbUser?.communityId) {
        checkoutPayload.communityId = String(dbUser.communityId);
        checkoutPayload.communityMarkup = (communityPricing.residentPricePerSession - communityPricing.basePricePerSession) * (communityPricing.sessions || 1);
      }

      const res = await authFetch('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify(checkoutPayload),
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

        {/* ── Step 1: Child Info ─────────────────────────────────── */}
        {step === 1 && (
          <div className="p-5 space-y-3">
            {/* Program summary card */}
            <div className="card p-3" style={{ background: `${cat.color}06` }}>
              <div className="text-xs text-slate-600">
                <div className="font-semibold mb-1">{program.name}</div>
                <div>📍 {program.location}</div>
                <div>📅 {program.schedule} · {program.duration}min</div>
                <div>👶 Ages {program.ageRange} · {program.groupSize}</div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {progGender !== 'any' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-pink-100 text-pink-700">
                      {progGender === 'female' ? '👧 Girls Only' : '👦 Boys Only'}
                    </span>
                  )}
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[9px]">
                    {sup.icon} {sup.label}
                  </div>
                </div>
              </div>
            </div>

            {spots <= 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <div className="text-sm font-bold text-red-800 mb-1">Program is Full</div>
                <p className="text-xs text-red-600">WhatsApp us to join the waitlist.</p>
                <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_BUSINESS || ''}?text=Waitlist for ${program.name}`} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm mt-2 inline-flex">💬 Join Waitlist</a>
              </div>
            ) : hasChildren && !useManualEntry ? (
              /* ── Saved children dropdown ── */
              <>
                <div>
                  <label className="label">Select your child</label>
                  <select
                    className="input"
                    value={selectedChildIdx ?? 0}
                    onChange={(e) => selectChild(Number(e.target.value))}
                  >
                    {savedChildren.map((child, i) => (
                      <option key={i} value={i}>
                        {child.name} ({child.age} yr{child.age !== 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={switchToManual} className="text-[10px] text-teal-primary font-semibold hover:underline">
                  + Enroll a different child
                </button>

                {/* Age out-of-range warning */}
                {ageWarning && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[10px] text-amber-800">
                    ⚠️ {childName} is {childAge} but this program is for ages {program.ageRange}. The coach may not accept this enrollment.
                  </div>
                )}

                {/* Gender mismatch — blocking */}
                {genderBlocked && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[10px] text-red-800">
                    ❌ {program.name} is for {genderLabel} only. {childName} is registered as {childGender}.
                  </div>
                )}

                {/* Gender unknown — confirmation prompt */}
                {genderUnknown && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-[10px] text-blue-800">
                    <div className="font-semibold mb-2">This program is for {genderLabel} only. Please confirm {childName}&apos;s gender:</div>
                    <div className="flex gap-2">
                      <button onClick={() => saveGenderToProfile('male')} disabled={savingGender}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-semibold text-[10px] hover:bg-blue-200 disabled:opacity-50">
                        👦 Boy
                      </button>
                      <button onClick={() => saveGenderToProfile('female')} disabled={savingGender}
                        className="px-3 py-1 bg-pink-100 text-pink-800 rounded font-semibold text-[10px] hover:bg-pink-200 disabled:opacity-50">
                        👧 Girl
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleContinueFromStep1}
                  disabled={genderBlocked || genderUnknown}
                  className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </>
            ) : (
              /* ── Manual entry ── */
              <>
                {hasChildren && (
                  <button onClick={switchToSaved} className="text-[10px] text-teal-primary font-semibold hover:underline">
                    ← Pick from saved children
                  </button>
                )}
                <div>
                  <label className="label">Child&apos;s Name</label>
                  <input className="input" placeholder="e.g. Timi Adebayo" value={childName} onChange={(e) => setChildName(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="label">Age</label>
                  <input className="input" type="number" min={2} max={18} placeholder="e.g. 6" value={childAge} onChange={(e) => setChildAge(e.target.value)} />
                  {ageWarning && (
                    <p className="text-[10px] text-amber-600 mt-1">⚠️ {childName} is {childAge} but this program is for ages {program.ageRange}. The coach may not accept this enrollment.</p>
                  )}
                </div>

                {/* Gender required for gender-restricted programs */}
                {progGender !== 'any' && childName && (
                  <div>
                    <label className="label">Gender <span className="text-red-400">*</span></label>
                    <div className="flex gap-2">
                      {['male', 'female'].map((g) => (
                        <button
                          key={g}
                          onClick={() => setChildGender(g)}
                          className={`flex-1 py-2 text-[11px] font-semibold rounded-lg border transition-colors ${childGender === g
                            ? g === 'female' ? 'bg-pink-100 border-pink-300 text-pink-800' : 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                        >
                          {g === 'male' ? '👦 Boy' : '👧 Girl'}
                        </button>
                      ))}
                    </div>
                    {genderBlocked && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[10px] text-red-800 mt-2">
                        ❌ {program.name} is for {genderLabel} only.
                      </div>
                    )}
                  </div>
                )}

                {!hasChildren && (
                  <p className="text-[9px] text-slate-400">
                    💡 This child will be saved to your profile for next time.
                  </p>
                )}

                <button
                  onClick={handleContinueFromStep1}
                  disabled={genderBlocked}
                  className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Step 2: Starter Kit Upsell ─────────────────────────── */}
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

        {/* ── Step 3: Review & Pay ───────────────────────────────── */}
        {step === 3 && (
          <div className="p-5 space-y-3">
            <div className="text-sm font-bold mb-2">Order Summary</div>

            <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Child</span>
              <span className="font-semibold">{childName}, {childAge} yrs</span>
            </div>

            <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
              <div>
                <div className="font-semibold">{cat.icon} {program.name}</div>
                <div className="text-[10px] text-slate-400">
                  {program.sessions} sessions × {fmt(effectivePricePerSession)}
                </div>
              </div>
              <span className="font-semibold">{fmt(effectiveProgramTotal)}</span>
            </div>

            {addKit && kit && (
              <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                <div>
                  <div className="font-semibold">{kit.icon} {kit.name}</div>
                  <div className="text-[10px] text-slate-400">Starter kit — delivered at session 1</div>
                </div>
                <span className="font-semibold">{fmt(kit.kitPrice)}</span>
              </div>
            )}

            {needsMembership && (
              <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                <div>
                  <div className="font-semibold">🔐 SkillPadi Membership</div>
                  <div className="text-[10px] text-slate-400">One-time — unlocks all programs</div>
                </div>
                <span className="font-semibold">{fmt(MEMBERSHIP_FEE)}</span>
              </div>
            )}

            {/* Impact cross-subsidy */}
            {impactProgram && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 my-1">
                <div className="text-[11px] font-semibold text-teal-800 mb-1.5">
                  Help a child in {impactProgram.community || 'an underserved community'} learn {impactProgram.categoryId?.name || 'a skill'} too
                </div>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {[2500, 5000, 15000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setImpactDonation(impactDonation === amt ? 0 : amt)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${impactDonation === amt ? 'bg-teal-600 text-white' : 'bg-white border border-teal-200 text-teal-700 hover:bg-teal-100'}`}
                    >
                      {fmt(amt)}
                    </button>
                  ))}
                </div>
                <div className="text-[9px] text-teal-600">100% goes to SkillPadi Impact</div>
                {impactDonation > 0 && (
                  <div className="flex justify-between text-xs mt-2 pt-2 border-t border-teal-200">
                    <span className="text-teal-700 font-semibold">Impact donation</span>
                    <span className="text-teal-700 font-semibold">{fmt(impactDonation)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
              <span className="text-slate-400">VAT (7.5%)</span>
              <span className="text-slate-400">{fmt(vat)}</span>
            </div>

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
