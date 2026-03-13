'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────────────
const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;
const ago = (d) => {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 3600000) return `${Math.round(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h ago`;
  return `${Math.round(ms / 86400000)}d ago`;
};
const toSlug = (s) => s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const autoInitials = (n) => n.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 4) || 'SP';
const arrFromText = (s) => (s || '').split('\n').map(x => x.trim()).filter(Boolean);
const dateStr = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

// ── Constants ────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'enquiries', label: 'Enquiries', icon: '📩' },
  { id: 'enrollments', label: 'Enrollments', icon: '🎓' },
  { id: 'members', label: 'Members', icon: '👨‍👩‍👧' },
  { id: 'coaches', label: 'Coaches', icon: '🏅' },
  { id: 'programs', label: 'Programs', icon: '📋' },
  { id: 'schools', label: 'Schools', icon: '🏫' },
  { id: 'communities', label: 'Estates', icon: '🏘️' },
  { id: 'tournaments', label: 'Tournaments', icon: '🏆' },
  { id: 'shop', label: 'Shop', icon: '🛍️' },
  { id: 'sponsors', label: 'Sponsors', icon: '🤝' },
  { id: 'impact', label: 'Impact', icon: '💚' },
  { id: 'revenue', label: 'Revenue', icon: '💳' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const SUPERVISION_OPTS = ['parent-present', 'drop-off', 'school-chaperone', 'nanny-driver'];

const VETTING_ITEMS = [
  { key: 'nin', label: 'NIN Verification', tier: 1 },
  { key: 'police', label: 'Police Check', tier: 1 },
  { key: 'address', label: 'Address Verified', tier: 1 },
  { key: 'photoMatch', label: 'Photo Match', tier: 1 },
  { key: 'coachingCert', label: 'Coaching Certificate', tier: 2 },
  { key: 'experience', label: 'Experience Verified', tier: 2 },
  { key: 'references', label: 'References Checked', tier: 2 },
  { key: 'firstAid', label: 'First Aid Certified', tier: 3 },
  { key: 'safeguarding', label: 'Safeguarding Training', tier: 3 },
  { key: 'sportSafety', label: 'Sport Safety Certified', tier: 3 },
  { key: 'reverification', label: 'Re-verification', tier: 4 },
  { key: 'insurance', label: 'Insurance Active', tier: 4 },
  { key: 'rating', label: 'Rating Maintained', tier: 4 },
  { key: 'incidents', label: 'No Incident History', tier: 4 },
];

const TIER_COLORS = {
  1: { pill: 'bg-blue-50 text-blue-700', label: 'Identity & Background' },
  2: { pill: 'bg-purple-50 text-purple-700', label: 'Professional Credentials' },
  3: { pill: 'bg-orange-50 text-orange-700', label: 'Child Safety' },
  4: { pill: 'bg-teal-50 text-teal-700', label: 'Ongoing Trust' },
};

// ── Modal context (stable refs for modal primitives) ─────────────
const ModalCtx = createContext({ onClose: () => {}, submitting: false });

const Overlay = ({ children }) => {
  const { onClose } = useContext(ModalCtx);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-8 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const ModalHeader = ({ title }) => {
  const { onClose } = useContext(ModalCtx);
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <h2 className="font-serif text-base font-bold text-slate-900">{title}</h2>
      <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
    </div>
  );
};

const ModalFooter = ({ onSubmit, submitLabel = 'Save' }) => {
  const { onClose, submitting } = useContext(ModalCtx);
  return (
    <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
      <button onClick={onClose} className="btn-outline text-xs px-4 py-2">Cancel</button>
      <button onClick={onSubmit} disabled={submitting}
        className="btn-primary text-xs px-5 py-2 disabled:opacity-60 disabled:cursor-not-allowed">
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
};

const ModalBody = ({ children }) => (
  <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">{children}</div>
);

const SectionHead = ({ title }) => (
  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider pt-1 pb-1.5 border-b border-slate-100">{title}</div>
);

const Row = ({ children }) => <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;

const FL = ({ label, req, children }) => (
  <div>
    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
      {label}{req && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const { isAuthenticated, isAdmin, loading, authFetch, dbUser } = useAuth();
  const router = useRouter();

  // ── Core data ──
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [kits, setKits] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [schools, setSchools] = useState([]);
  const [schoolTab, setSchoolTab] = useState('pending');
  const [approvingSchool, setApprovingSchool] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [communities, setCommunities] = useState([]);
  const [communityTab, setCommunityTab] = useState('pending');
  const [approvingCommunity, setApprovingCommunity] = useState(null);
  const [communityRejectReason, setCommunityRejectReason] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  // ── UI ──
  const [enqFilter, setEnqFilter] = useState('all');
  const [sideOpen, setSideOpen] = useState(false);
  const [coachSearch, setCoachSearch] = useState('');
  const [programSearch, setProgramSearch] = useState('');
  const [coachCityFilter, setCoachCityFilter] = useState('all');
  const [programCityFilter, setProgramCityFilter] = useState('all');

  // ── Modal ──
  const [modal, setModal] = useState(null);
  const [modalId, setModalId] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Award modal ──
  const [awardModal, setAwardModal] = useState(null); // { enr, achievements }
  const [awardAchId, setAwardAchId] = useState('');
  const [awarding, setAwarding] = useState(false);

  // ── Session popover ──
  const [sessionPop, setSessionPop] = useState(null); // { enrId, childName, msg, note, milestones, sessionsCompleted, total, programName }
  const [sessionPopping, setSessionPopping] = useState(false);

  // ── Bulk enrollment selection ──
  const [checkedEnrs, setCheckedEnrs] = useState(new Set());
  const [markingAll, setMarkingAll] = useState(false);

  // ── Term report ──
  const [reportModal, setReportModal] = useState(null); // { enr }
  const [reportStep, setReportStep] = useState(1);
  const [reportForm, setReportForm] = useState({
    attendancePresent: '', attendanceTotal: '', overallRating: 0,
    skills: [], strengths: [], improvements: [], coachNotes: '',
    recommendation: '', awardCertificate: false,
  });
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [strengthInput, setStrengthInput] = useState('');
  const [improvementInput, setImprovementInput] = useState('');

  // ── Impact tab ──
  const [impactPrograms, setImpactPrograms] = useState([]);
  const [impactStats, setImpactStats] = useState(null);
  const [impactTab, setImpactTab] = useState('proposals');
  const [impactLoading, setImpactLoading] = useState(false);

  // ── Auth guard ──
  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) {
      router.push(isAuthenticated ? '/dashboard/parent' : '/auth/login');
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  // ── Data loading ──
  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingData(true);
    try {
      const [sRes, eRes, enrRes, cRes, pRes, uRes, payRes, prodRes, kitRes, ordRes, tRes, schRes, comRes, spRes] = await Promise.all([
        authFetch('/api/admin/stats'),
        authFetch('/api/enquiries'),
        authFetch('/api/enrollments'),
        authFetch('/api/coaches?active=false'),
        authFetch('/api/programs?active=false'),
        authFetch('/api/users?role=parent'),
        authFetch('/api/payments/history'),
        authFetch('/api/shop/products?all=true'),
        authFetch('/api/shop/kits?all=true'),
        authFetch('/api/shop/orders'),
        authFetch('/api/tournaments'),
        authFetch('/api/schools'),
        authFetch('/api/communities'),
        authFetch('/api/sponsors?all=true'),
      ]);
      if (sRes.ok) {
        const sData = await sRes.json();
        setStats(sData);
        setCategories(sData.categories || []);
      }
      if (eRes.ok) setEnquiries((await eRes.json()).enquiries || []);
      if (enrRes.ok) setEnrollments((await enrRes.json()).enrollments || []);
      if (cRes.ok) setCoaches((await cRes.json()).coaches || []);
      if (pRes.ok) setPrograms((await pRes.json()).programs || []);
      if (uRes.ok) setUsers((await uRes.json()).users || []);
      if (payRes.ok) setPayments((await payRes.json()).payments || []);
      if (prodRes.ok) setProducts((await prodRes.json()).products || []);
      if (kitRes.ok) setKits((await kitRes.json()).kits || []);
      if (ordRes.ok) setOrders((await ordRes.json()).orders || []);
      if (tRes.ok) setTournaments((await tRes.json()).tournaments || []);
      if (schRes.ok) setSchools((await schRes.json()).schools || []);
      if (comRes.ok) setCommunities((await comRes.json()).communities || []);
      if (spRes.ok) setSponsors((await spRes.json()).sponsors || []);
    } catch (e) { console.error('Admin load error:', e); }
    setLoadingData(false);
  }, [isAdmin, authFetch]);

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin, loadData]);

  const refreshCoaches = async () => {
    const res = await authFetch('/api/coaches?active=false');
    if (res.ok) setCoaches((await res.json()).coaches || []);
  };
  const refreshPrograms = async () => {
    const res = await authFetch('/api/programs?active=false');
    if (res.ok) setPrograms((await res.json()).programs || []);
  };
  const refreshProducts = async () => {
    const res = await authFetch('/api/shop/products?all=true');
    if (res.ok) setProducts((await res.json()).products || []);
  };
  const refreshKits = async () => {
    const res = await authFetch('/api/shop/kits?all=true');
    if (res.ok) setKits((await res.json()).kits || []);
  };

  // ── Modal helpers ──
  const openModal = (type, data = {}, id = null) => {
    setModal(type);
    setModalId(id);
    setForm(data);
    setSubmitting(false);
  };
  const closeModal = () => { setModal(null); setModalId(null); setForm({}); setSubmitting(false); };
  const setF = (field) => (e) => setForm(prev => ({
    ...prev,
    [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));
  const setFv = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // ── Open helpers for edit / vetting ──
  const openCreateCoach = () => openModal('createCoach', { isActive: true });
  const openEditCoach = (c) => openModal('editCoach', {
    name: c.name, slug: c.slug, initials: c.initials,
    categoryId: c.categoryId?._id || c.categoryId,
    title: c.title || '', bio: c.bio || '',
    whatsapp: c.whatsapp || '', email: c.email || '',
    yearsExperience: c.yearsExperience ?? '', ageGroups: c.ageGroups || '',
    languages: (c.languages || []).join('\n'), venues: (c.venues || []).join('\n'),
    featuredOrder: c.featuredOrder ?? 0, isActive: c.isActive !== false,
    _slugManual: true, _initialsManual: true,
  }, c._id);

  const openVetting = (c) => {
    const init = {};
    VETTING_ITEMS.forEach(({ key }) => {
      init[`v_${key}_status`] = c.vetting?.[key]?.status || 'pending';
      init[`v_${key}_note`] = c.vetting?.[key]?.note || '';
    });
    openModal('vetting', init, c._id);
  };

  const openCreateProgram = () => openModal('createProgram', { isActive: true, supervision: 'parent-present' });
  const openEditProgram = (p) => openModal('editProgram', {
    name: p.name, slug: p.slug,
    categoryId: p.categoryId?._id || p.categoryId,
    coachId: p.coachId?._id || p.coachId,
    pricePerSession: p.pricePerSession, spotsTotal: p.spotsTotal,
    supervision: p.supervision, ageRange: p.ageRange || '',
    ageMin: p.ageMin ?? '', ageMax: p.ageMax ?? '',
    schedule: p.schedule || '', duration: p.duration ?? '',
    sessions: p.sessions ?? '', location: p.location || '',
    locationNote: p.locationNote || '',
    termStart: dateStr(p.termStart), termEnd: dateStr(p.termEnd),
    milestones: (p.milestones || []).join('\n'),
    highlights: (p.highlights || []).join('\n'),
    whatToBring: (p.whatToBring || []).join('\n'),
    safetyNote: p.safetyNote || '', gender: p.gender || 'any',
    isActive: p.isActive !== false, _slugManual: true,
  }, p._id);

  const openCreateProduct = () => openModal('createProduct', { inStock: true });
  const openCreateKit = () => openModal('createKit', { inStock: true });
  const openEditProduct = (p) => openModal('editProduct', {
    ...p,
    categoryId: p.categoryId?._id || p.categoryId,
    _slugManual: true,
  }, p._id);
  const openEditKit = (k) => openModal('editKit', {
    ...k,
    categoryId: k.categoryId?._id || k.categoryId,
    contents: Array.isArray(k.contents) ? k.contents.join('\n') : (k.contents || ''),
    _slugManual: true,
  }, k._id);

  // ── Existing actions ──
  const updateEnquiry = async (id, status) => {
    const res = await authFetch(`/api/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (res.ok) {
      setEnquiries(prev => prev.map(e => e._id === id ? { ...e, status } : e));
      toast.success(`Enquiry marked as ${status}`);
    }
  };
  const deleteEnquiry = async (id) => {
    if (!confirm('Delete this enquiry permanently?')) return;
    const res = await authFetch(`/api/enquiries/${id}`, { method: 'DELETE' });
    if (res.ok) { setEnquiries(prev => prev.filter(e => e._id !== id)); toast.success('Enquiry deleted'); }
  };
  const updateEnrollment = async (id, update) => {
    const res = await authFetch(`/api/enrollments/${id}`, { method: 'PATCH', body: JSON.stringify(update) });
    if (res.ok) {
      const data = await res.json();
      setEnrollments(prev => prev.map(e => e._id === id ? { ...e, ...data.enrollment } : e));
      toast.success('Enrollment updated');
    }
  };

  const openAwardModal = async (enr) => {
    const categoryId = enr.programId?.categoryId?._id || enr.programId?.categoryId;
    const url = categoryId ? `/api/achievements?categoryId=${categoryId}` : '/api/achievements';
    const res = await authFetch(url);
    const data = res.ok ? await res.json() : {};
    setAwardModal({ enr, achievements: data.achievements || [] });
    setAwardAchId('');
  };

  const submitAward = async () => {
    if (!awardAchId || !awardModal) return;
    setAwarding(true);
    const { enr } = awardModal;
    const res = await authFetch(`/api/passport/${encodeURIComponent(enr.childName)}/award`, {
      method: 'POST',
      body: JSON.stringify({ achievementId: awardAchId, userId: enr.userId?._id || enr.userId, programId: enr.programId?._id || enr.programId }),
    });
    setAwarding(false);
    if (res.ok) {
      toast.success('Achievement awarded!');
      setAwardModal(null);
      setAwardAchId('');
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to award achievement');
    }
  };
  // ── Session popover handlers ──
  const openSessionPop = (enr) => {
    const prog = enr.programId || {};
    const next = (enr.sessionsCompleted || 0) + 1;
    const total = prog.sessions || 0;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://skillpadi.com';
    const msg =
      `🌟 Great session today!\n\n` +
      `${enr.childName} just completed session ${next}${total ? `/${total}` : ''} of *${prog.name || 'their program'}*.\n\n` +
      `View progress: ${origin}/dashboard/parent`;
    setSessionPop({
      enrId: enr._id,
      childName: enr.childName,
      programName: prog.name || '',
      msg,
      note: '',
      milestones: prog.milestones || [],
      sessionsCompleted: enr.sessionsCompleted || 0,
      total,
    });
  };

  const submitSessionUpdate = async (notify) => {
    if (!sessionPop) return;
    setSessionPopping(true);
    const { enrId, msg, note, sessionsCompleted, total, childName, programName } = sessionPop;
    const newCount = sessionsCompleted + 1;

    const patchRes = await authFetch(`/api/enrollments/${enrId}`, {
      method: 'PATCH',
      body: JSON.stringify({ sessionsCompleted: newCount }),
    });
    if (!patchRes.ok) { toast.error('Failed to update session'); setSessionPopping(false); return; }
    const patchData = await patchRes.json();
    setEnrollments(prev => prev.map(e => e._id === enrId ? { ...e, ...patchData.enrollment } : e));

    if (notify) {
      await authFetch('/api/notifications/session-update', {
        method: 'POST',
        body: JSON.stringify({ enrollmentId: enrId, message: msg, note }),
      });
    }

    const milestone = patchData.newMilestone;
    const baseMsg = `Session ${newCount}${total ? `/${total}` : ''} recorded`;
    const milestoneMsg = milestone ? ` 🏅 Milestone: ${milestone}` : '';
    toast.success(notify ? `Updated & parent notified${milestoneMsg}` : `${baseMsg}${milestoneMsg}`);
    setSessionPop(null);
    setSessionPopping(false);
  };

  const markAllPresent = async () => {
    if (checkedEnrs.size === 0) return;
    setMarkingAll(true);
    const ids = [...checkedEnrs];
    await Promise.all(ids.map(id => {
      const enr = enrollments.find(e => e._id === id);
      if (!enr || enr.status !== 'active') return Promise.resolve();
      return authFetch(`/api/enrollments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ sessionsCompleted: (enr.sessionsCompleted || 0) + 1 }),
      }).then(res => res.ok ? res.json() : null).then(data => {
        if (data) setEnrollments(prev => prev.map(e => e._id === id ? { ...e, ...data.enrollment } : e));
      });
    }));
    toast.success(`${ids.length} session${ids.length > 1 ? 's' : ''} updated`);
    setCheckedEnrs(new Set());
    setMarkingAll(false);
  };

  const toggleCheckedEnr = (id) => setCheckedEnrs(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAllEnrs = () => {
    const active = enrollments.filter(e => e.status === 'active').map(e => e._id);
    if (active.every(id => checkedEnrs.has(id))) {
      setCheckedEnrs(new Set());
    } else {
      setCheckedEnrs(new Set(active));
    }
  };

  // ── Impact data loading ──
  const loadImpactData = useCallback(async () => {
    if (!isAdmin) return;
    setImpactLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        authFetch('/api/impact/programs'),
        authFetch('/api/impact/stats'),
      ]);
      if (pRes.ok) setImpactPrograms((await pRes.json()).programs || []);
      if (sRes.ok) setImpactStats(await sRes.json());
    } catch (e) { console.error('Impact load error:', e); }
    setImpactLoading(false);
  }, [isAdmin, authFetch]);

  useEffect(() => { if (isAdmin && tab === 'impact') loadImpactData(); }, [isAdmin, tab, loadImpactData]);

  const updateImpactProgram = async (id, update) => {
    const res = await authFetch(`/api/impact/programs/${id}`, { method: 'PATCH', body: JSON.stringify(update) });
    if (res.ok) {
      toast.success(`Programme ${update.status === 'funding' ? 'approved' : 'paused'}`);
      loadImpactData();
    } else {
      toast.error('Update failed');
    }
  };

  // ── Term report handlers ──
  const openReportModal = (enr) => {
    const prog = enr.programId || {};
    const skills = (prog.milestones || []).map(m => ({ name: m, beforeLevel: 'beginner', afterLevel: 'beginner', rating: 0 }));
    setReportForm({
      attendancePresent: enr.sessionsCompleted || '',
      attendanceTotal: prog.sessions || '',
      overallRating: 0,
      skills,
      strengths: [],
      improvements: [],
      coachNotes: '',
      recommendation: '',
      awardCertificate: false,
    });
    setReportStep(1);
    setReportModal({ enr });
  };

  const submitReport = async () => {
    if (!reportModal) return;
    setReportSubmitting(true);
    const { enr } = reportModal;
    const body = {
      attendance: { present: Number(reportForm.attendancePresent), total: Number(reportForm.attendanceTotal) },
      overallRating: reportForm.overallRating,
      skills: reportForm.skills,
      strengths: reportForm.strengths,
      improvements: reportForm.improvements,
      coachNotes: reportForm.coachNotes,
      recommendation: reportForm.recommendation,
      awardCertificate: reportForm.awardCertificate,
      publish: true,
    };
    const res = await authFetch(`/api/enrollments/${enr._id}/report`, { method: 'PUT', body: JSON.stringify(body) });
    setReportSubmitting(false);
    if (res.ok) {
      toast.success('Report published!');
      setReportModal(null);
      const enrRes = await authFetch('/api/enrollments');
      if (enrRes.ok) setEnrollments((await enrRes.json()).enrollments || []);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to publish report');
    }
  };

  // ── Coach tier change ──
  const changeCoachTier = async (id, tier) => {
    const res = await authFetch(`/api/coaches/${id}`, { method: 'PUT', body: JSON.stringify({ tier }) });
    if (res.ok) {
      setCoaches(prev => prev.map(c => c._id === id ? { ...c, tier } : c));
      toast.success(`Coach tier changed to ${tier}`);
    } else {
      toast.error('Failed to change tier');
    }
  };

  const processCoachPayout = async (coachId, coachName, pendingPayout) => {
    if (!confirm(`Mark ${fmt(pendingPayout)} as paid to ${coachName}?`)) return;
    const res = await authFetch(`/api/coaches/${coachId}`, { method: 'PUT', body: JSON.stringify({ pendingPayout: 0 }) });
    if (res.ok) {
      toast.success('Coach payout processed');
      await refreshCoaches();
    } else {
      toast.error('Failed to process payout');
    }
  };

  const toggleCoachActive = async (id, current) => {
    const res = await authFetch(`/api/coaches/${id}`, { method: 'PUT', body: JSON.stringify({ isActive: !current }) });
    if (res.ok) {
      setCoaches(prev => prev.map(c => c._id === id ? { ...c, isActive: !current } : c));
      toast.success(`Coach ${!current ? 'activated' : 'deactivated'}`);
    }
  };

  const generateInviteLink = async (coachId) => {
    const res = await authFetch(`/api/coaches/${coachId}/invite`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      const url = data.inviteUrl;
      try { await navigator.clipboard.writeText(url); toast.success('Invite link copied to clipboard!'); }
      catch { toast.success(`Invite link: ${url}`); }
      await refreshCoaches();
    } else {
      toast.error('Failed to generate invite link');
    }
  };

  const approveCoachApplication = async (enquiry) => {
    const appData = JSON.parse(enquiry.message || '{}');
    const cat = categories.find(c => c.slug === appData.categorySlug);
    if (!cat) { toast.error('Category not found'); return; }
    // Create coach record
    const body = {
      name: enquiry.parentName,
      slug: toSlug(enquiry.parentName),
      initials: autoInitials(enquiry.parentName),
      categoryId: cat._id,
      title: appData.title || undefined,
      bio: appData.bio || undefined,
      whatsapp: enquiry.phone,
      email: enquiry.email,
      yearsExperience: appData.yearsExperience ? Number(appData.yearsExperience) : undefined,
      ageGroups: appData.ageGroups || undefined,
      venues: appData.venues ? appData.venues.split(',').map(v => v.trim()).filter(Boolean) : [],
      city: appData.city || 'abuja',
      isActive: false, // will activate after they claim invite
    };
    const res = await authFetch('/api/coaches', { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) { toast.error('Failed to create coach'); return; }
    const created = await res.json();
    // Generate invite link
    const invRes = await authFetch(`/api/coaches/${created.coach._id}/invite`, { method: 'POST' });
    // Mark enquiry as contacted
    await authFetch(`/api/enquiries/${enquiry._id}`, { method: 'PATCH', body: JSON.stringify({ status: 'contacted', notes: 'Approved — invite generated' }) });
    if (invRes.ok) {
      const invData = await invRes.json();
      try { await navigator.clipboard.writeText(invData.inviteUrl); toast.success(`Coach created & invite link copied!`); }
      catch { toast.success(`Invite: ${invData.inviteUrl}`); }
    } else {
      toast.success('Coach created — generate invite from Coaches tab');
    }
    await refreshCoaches();
    // Refresh enquiries
    const eRes = await authFetch('/api/enquiries');
    if (eRes.ok) setEnquiries((await eRes.json()).enquiries || []);
  };

  const declineCoachApplication = async (enquiryId) => {
    const res = await authFetch(`/api/enquiries/${enquiryId}`, { method: 'PATCH', body: JSON.stringify({ status: 'declined', notes: 'Coach application declined' }) });
    if (res.ok) {
      setEnquiries(prev => prev.map(e => e._id === enquiryId ? { ...e, status: 'declined' } : e));
      toast.success('Application declined');
    }
  };
  const toggleProgramActive = async (id, current) => {
    const res = await authFetch(`/api/programs/${id}`, { method: 'PUT', body: JSON.stringify({ isActive: !current }) });
    if (res.ok) {
      setPrograms(prev => prev.map(p => p._id === id ? { ...p, isActive: !current } : p));
      toast.success(`Program ${!current ? 'activated' : 'deactivated'}`);
    }
  };
  const changeUserRole = async (id, currentRole) => {
    const newRole = prompt('New role (parent, coach, school, community, admin):', currentRole);
    if (!newRole || !['parent', 'coach', 'school', 'community', 'admin'].includes(newRole)) {
      if (newRole) toast.error('Invalid role'); return;
    }
    const res = await authFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) });
    if (res.ok) {
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role: newRole } : u));
      toast.success(`Role changed to ${newRole}`);
    }
  };

  // ── Create Coach ──
  const submitCreateCoach = async () => {
    if (!form.name?.trim() || !form.categoryId) { toast.error('Name and category are required'); return; }
    setSubmitting(true);
    const body = {
      name: form.name.trim(),
      slug: form.slug || toSlug(form.name),
      initials: form.initials || autoInitials(form.name),
      categoryId: form.categoryId,
      ...(form.title && { title: form.title }),
      ...(form.bio && { bio: form.bio }),
      ...(form.whatsapp && { whatsapp: form.whatsapp }),
      ...(form.email && { email: form.email }),
      ...(form.yearsExperience !== '' && !isNaN(form.yearsExperience) && { yearsExperience: Number(form.yearsExperience) }),
      ...(form.ageGroups && { ageGroups: form.ageGroups }),
      languages: arrFromText(form.languages),
      venues: arrFromText(form.venues),
      featuredOrder: Number(form.featuredOrder) || 0,
      isActive: form.isActive !== false,
    };
    const res = await authFetch('/api/coaches', { method: 'POST', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Coach created!');
      closeModal();
      await refreshCoaches();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to create coach');
    }
  };

  // ── Edit Coach ──
  const submitEditCoach = async () => {
    if (!form.name?.trim()) { toast.error('Name is required'); return; }
    setSubmitting(true);
    const body = {
      name: form.name.trim(),
      slug: form.slug || toSlug(form.name),
      initials: form.initials || autoInitials(form.name),
      categoryId: form.categoryId,
      title: form.title || undefined,
      bio: form.bio || undefined,
      whatsapp: form.whatsapp || undefined,
      email: form.email || undefined,
      ...(form.yearsExperience !== '' && !isNaN(form.yearsExperience) && { yearsExperience: Number(form.yearsExperience) }),
      ageGroups: form.ageGroups || undefined,
      languages: arrFromText(form.languages),
      venues: arrFromText(form.venues),
      featuredOrder: Number(form.featuredOrder) || 0,
      isActive: form.isActive !== false,
    };
    const res = await authFetch(`/api/coaches/${modalId}`, { method: 'PUT', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Coach updated!');
      closeModal();
      await refreshCoaches();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to update coach');
    }
  };

  // ── Update Vetting ──
  const submitVetting = async () => {
    setSubmitting(true);
    const vetting = {};
    VETTING_ITEMS.forEach(({ key }) => {
      vetting[key] = {
        status: form[`v_${key}_status`] || 'pending',
        note: form[`v_${key}_note`] || undefined,
        ...(form[`v_${key}_status`] === 'verified' ? { date: new Date().toISOString() } : {}),
      };
    });
    const res = await authFetch(`/api/coaches/${modalId}`, { method: 'PUT', body: JSON.stringify({ vetting }) });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Vetting updated!');
      closeModal();
      await refreshCoaches();
    } else {
      toast.error('Failed to update vetting');
    }
  };

  // ── Create Program ──
  const submitCreateProgram = async () => {
    if (!form.name?.trim() || !form.categoryId || !form.coachId || !form.pricePerSession || !form.spotsTotal || !form.supervision) {
      toast.error('Required: name, category, coach, price, spots, supervision'); return;
    }
    setSubmitting(true);
    const body = {
      name: form.name.trim(),
      slug: form.slug || toSlug(form.name),
      categoryId: form.categoryId,
      coachId: form.coachId,
      pricePerSession: Number(form.pricePerSession),
      spotsTotal: Number(form.spotsTotal),
      supervision: form.supervision,
      ...(form.ageRange && { ageRange: form.ageRange }),
      ...(form.ageMin !== '' && !isNaN(form.ageMin) && { ageMin: Number(form.ageMin) }),
      ...(form.ageMax !== '' && !isNaN(form.ageMax) && { ageMax: Number(form.ageMax) }),
      ...(form.schedule && { schedule: form.schedule }),
      ...(form.duration !== '' && !isNaN(form.duration) && { duration: Number(form.duration) }),
      ...(form.sessions !== '' && !isNaN(form.sessions) && { sessions: Number(form.sessions) }),
      ...(form.location && { location: form.location }),
      ...(form.locationNote && { locationNote: form.locationNote }),
      ...(form.termStart && { termStart: form.termStart }),
      ...(form.termEnd && { termEnd: form.termEnd }),
      milestones: arrFromText(form.milestones),
      highlights: arrFromText(form.highlights),
      whatToBring: arrFromText(form.whatToBring),
      ...(form.safetyNote && { safetyNote: form.safetyNote }),
      gender: form.gender || 'any',
      isActive: form.isActive !== false,
    };
    const res = await authFetch('/api/programs', { method: 'POST', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Program created!');
      closeModal();
      await refreshPrograms();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to create program');
    }
  };

  // ── Edit Program ──
  const submitEditProgram = async () => {
    if (!form.name?.trim()) { toast.error('Name is required'); return; }
    setSubmitting(true);
    const body = {
      name: form.name.trim(),
      slug: form.slug,
      categoryId: form.categoryId,
      coachId: form.coachId,
      pricePerSession: Number(form.pricePerSession),
      spotsTotal: Number(form.spotsTotal),
      supervision: form.supervision,
      ageRange: form.ageRange || undefined,
      ...(form.ageMin !== '' && !isNaN(form.ageMin) && { ageMin: Number(form.ageMin) }),
      ...(form.ageMax !== '' && !isNaN(form.ageMax) && { ageMax: Number(form.ageMax) }),
      schedule: form.schedule || undefined,
      ...(form.duration !== '' && !isNaN(form.duration) && { duration: Number(form.duration) }),
      ...(form.sessions !== '' && !isNaN(form.sessions) && { sessions: Number(form.sessions) }),
      location: form.location || undefined,
      locationNote: form.locationNote || undefined,
      termStart: form.termStart || undefined,
      termEnd: form.termEnd || undefined,
      milestones: arrFromText(form.milestones),
      highlights: arrFromText(form.highlights),
      whatToBring: arrFromText(form.whatToBring),
      safetyNote: form.safetyNote || undefined,
      gender: form.gender || 'any',
      isActive: form.isActive !== false,
    };
    const res = await authFetch(`/api/programs/${modalId}`, { method: 'PUT', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Program updated!');
      closeModal();
      await refreshPrograms();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to update program');
    }
  };

  // ── Create Product ──
  const submitCreateProduct = async () => {
    if (!form.name?.trim() || !form.price) { toast.error('Name and price are required'); return; }
    setSubmitting(true);
    const body = {
      name: form.name.trim(),
      slug: form.slug || toSlug(form.name),
      price: Number(form.price),
      ...(form.categoryId && { categoryId: form.categoryId }),
      ...(form.brand && { brand: form.brand }),
      ...(form.description && { description: form.description }),
      inStock: form.inStock !== false,
    };
    const res = await authFetch('/api/shop/products', { method: 'POST', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Product created!');
      closeModal();
      await refreshProducts();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to create product');
    }
  };

  // ── Edit Product ──
  const submitEditProduct = async () => {
    if (!form.name?.trim() || !form.price) { toast.error('Name and price are required'); return; }
    setSubmitting(true);
    const body = {
      name: form.name, slug: form.slug || toSlug(form.name),
      price: Number(form.price),
      ...(form.categoryId && { categoryId: form.categoryId }),
      ...(form.brand && { brand: form.brand }),
      ...(form.description && { description: form.description }),
      inStock: form.inStock !== false,
    };
    const res = await authFetch(`/api/shop/products/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Product updated!');
      closeModal();
      await refreshProducts();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to update product');
    }
  };

  // ── Edit Starter Kit ──
  const submitEditKit = async () => {
    if (!form.name?.trim() || !form.categoryId || !form.kitPrice || !form.individualPrice) {
      toast.error('Required: name, category, kit price, individual price'); return;
    }
    setSubmitting(true);
    const contentsArr = typeof form.contents === 'string'
      ? form.contents.split('\n').map(s => s.trim()).filter(Boolean)
      : (form.contents || []);
    const body = {
      name: form.name, slug: form.slug || toSlug(form.name),
      categoryId: form.categoryId,
      icon: form.icon || undefined,
      contents: contentsArr,
      individualPrice: Number(form.individualPrice),
      kitPrice: Number(form.kitPrice),
      ...(form.brand && { brand: form.brand }),
      ...(form.description && { description: form.description }),
      inStock: form.inStock !== false,
    };
    const res = await authFetch(`/api/shop/kits/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Starter kit updated!');
      closeModal();
      await refreshKits();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to update kit');
    }
  };

  // ── Create Starter Kit ──
  const submitCreateKit = async () => {
    if (!form.name?.trim() || !form.categoryId || !form.kitPrice || !form.individualPrice) {
      toast.error('Required: name, category, kit price, individual price'); return;
    }
    setSubmitting(true);
    const body = {
      name: form.name.trim(),
      slug: form.slug || toSlug(form.name),
      categoryId: form.categoryId,
      ...(form.icon && { icon: form.icon }),
      contents: arrFromText(form.contents),
      individualPrice: Number(form.individualPrice),
      kitPrice: Number(form.kitPrice),
      ...(form.brand && { brand: form.brand }),
      ...(form.description && { description: form.description }),
      inStock: form.inStock !== false,
    };
    const res = await authFetch('/api/shop/kits', { method: 'POST', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Starter kit created!');
      closeModal();
      await refreshKits();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to create kit');
    }
  };

  // ── Loading guard ──
  if (loading || !isAdmin) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <img src="/logomark.svg" alt="SkillPadi" className="w-10 h-10 mx-auto mb-3 animate-pulse" />
        <p className="text-slate-400 text-xs">Loading admin...</p>
      </div>
    </div>
  );

  // ── Computed ──
  const ov = stats?.overview || {};
  const rev = stats?.revenue || {};
  const newEnq = enquiries.filter(e => e.status === 'new').length;
  const activeEnr = enrollments.filter(e => e.status === 'active').length;
  const filteredCoaches = coaches
    .filter(c => !coachSearch || c.name.toLowerCase().includes(coachSearch.toLowerCase()) || c.title?.toLowerCase().includes(coachSearch.toLowerCase()))
    .filter(c => coachCityFilter === 'all' || (c.city || 'abuja') === coachCityFilter);
  const filteredPrograms = programs
    .filter(p => !programSearch || p.name.toLowerCase().includes(programSearch.toLowerCase()) || p.coachId?.name?.toLowerCase().includes(programSearch.toLowerCase()))
    .filter(p => programCityFilter === 'all' || (p.city || 'abuja') === programCityFilter);
  const coachApplications = enquiries.filter(e => e.source === 'coach-application' && e.status === 'new');

  // ── Form field shorthands ──
  const fVal = (field) => form[field] ?? '';
  const fChk = (field) => !!form[field];

  // ════════════════════════════════════════════════════════
  // MODALS
  // ════════════════════════════════════════════════════════
  const inp = (field, extra = {}) => ({
    value: fVal(field),
    onChange: setF(field),
    className: 'input-field text-xs w-full',
    ...extra,
  });

  const CatSelect = ({ field, required }) => (
    <FL label="Category" req={required}>
      <select {...inp(field)} className="input-field text-xs w-full">
        <option value="">— Select category —</option>
        {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
      </select>
    </FL>
  );

  const CheckField = ({ field, label: lbl }) => (
    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
      <input type="checkbox" className="w-3.5 h-3.5 rounded accent-teal-600"
        checked={fChk(field)} onChange={setF(field)} />
      {lbl}
    </label>
  );

  // ── Coach Create / Edit Modal ──
  const CoachModal = () => {
    const isEdit = modal === 'editCoach';
    const onNameChange = (e) => {
      const n = e.target.value;
      setForm(prev => ({
        ...prev, name: n,
        slug: prev._slugManual ? prev.slug : toSlug(n),
        initials: prev._initialsManual ? prev.initials : autoInitials(n),
      }));
    };
    return (
      <Overlay>
        <ModalHeader title={isEdit ? 'Edit Coach' : 'Add New Coach'} />
        <ModalBody>
          <SectionHead title="Basic Info" />
          <Row>
            <FL label="Full Name" req>
              <input className="input-field text-xs w-full" value={fVal('name')} onChange={onNameChange} placeholder="e.g. Taiwo Adeyemi" />
            </FL>
            <CatSelect field="categoryId" required />
          </Row>
          <Row>
            <FL label="Slug (auto-generated)">
              <input className="input-field text-xs w-full font-mono" value={fVal('slug')}
                onChange={e => { setF('slug')(e); setFv('_slugManual', true); }}
                placeholder="e.g. taiwo-adeyemi" />
            </FL>
            <FL label="Initials (max 4)">
              <input className="input-field text-xs w-full" value={fVal('initials')}
                onChange={e => { setF('initials')(e); setFv('_initialsManual', true); }}
                placeholder="e.g. TA" maxLength={4} />
            </FL>
          </Row>
          <Row>
            <FL label="Title / Specialisation">
              <input {...inp('title')} placeholder="e.g. Head Swimming Coach" />
            </FL>
            <FL label="Years Experience">
              <input {...inp('yearsExperience', { type: 'number', min: 0, placeholder: '5' })} />
            </FL>
          </Row>
          <Row>
            <FL label="Age Groups">
              <input {...inp('ageGroups')} placeholder="e.g. 3-12" />
            </FL>
            <FL label="Featured Order (0 = first)">
              <input {...inp('featuredOrder', { type: 'number', min: 0, placeholder: '0' })} />
            </FL>
          </Row>

          <SectionHead title="Contact" />
          <Row>
            <FL label="WhatsApp Number">
              <input {...inp('whatsapp')} placeholder="234801234567" />
            </FL>
            <FL label="Email">
              <input {...inp('email', { type: 'email' })} placeholder="coach@email.com" />
            </FL>
          </Row>

          <SectionHead title="Profile" />
          <FL label="Bio">
            <textarea {...inp('bio')} className="input-field text-xs w-full resize-none" rows={3}
              placeholder="Brief professional bio..." />
          </FL>
          <Row>
            <FL label="Languages (one per line)">
              <textarea {...inp('languages')} className="input-field text-xs w-full resize-none" rows={2}
                placeholder={'English\nHausa\nYoruba'} />
            </FL>
            <FL label="Venues (one per line)">
              <textarea {...inp('venues')} className="input-field text-xs w-full resize-none" rows={2}
                placeholder={'Wuse Leisure Centre\nGarki Pool'} />
            </FL>
          </Row>
          <CheckField field="isActive" label="Active (visible on site)" />
        </ModalBody>
        <ModalFooter onSubmit={isEdit ? submitEditCoach : submitCreateCoach}
          submitLabel={isEdit ? 'Update Coach' : 'Create Coach'} />
      </Overlay>
    );
  };

  // ── Vetting Modal ──
  const VettingModal = () => {
    const coach = coaches.find(c => c._id === modalId);
    return (
      <Overlay>
        <ModalHeader title={`Vetting: ${coach?.name || '...'}`} />
        <ModalBody>
          <p className="text-[11px] text-slate-500 bg-blue-50 rounded-lg px-3 py-2">
            Shield level auto-calculates on save. Tiers 1–2 = <strong>Verified</strong>. All 4 tiers = <strong>Certified</strong>.
          </p>
          {[1, 2, 3, 4].map(tier => (
            <div key={tier}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[tier].pill}`}>
                  Tier {tier}
                </span>
                <span className="text-[10px] text-slate-500">{TIER_COLORS[tier].label}</span>
              </div>
              <div className="space-y-1.5">
                {VETTING_ITEMS.filter(v => v.tier === tier).map(({ key, label: lbl }) => {
                  const status = fVal(`v_${key}_status`) || 'pending';
                  const statusColors = {
                    verified: 'border-emerald-200 bg-emerald-50/50',
                    failed: 'border-red-200 bg-red-50/50',
                    expired: 'border-amber-200 bg-amber-50/50',
                    na: 'border-slate-200 bg-slate-50',
                    pending: 'border-slate-200 bg-white',
                  };
                  return (
                    <div key={key} className={`flex items-center gap-3 p-2.5 rounded-lg border ${statusColors[status]}`}>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-slate-700">{lbl}</div>
                        <input className="input-field text-[10px] mt-1 py-1 w-full"
                          placeholder="Note (optional)"
                          value={fVal(`v_${key}_note`)}
                          onChange={e => setFv(`v_${key}_note`, e.target.value)} />
                      </div>
                      <select className="input-field text-[10px] w-24 py-1 shrink-0"
                        value={status}
                        onChange={e => setFv(`v_${key}_status`, e.target.value)}>
                        {['pending', 'verified', 'failed', 'na', 'expired'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </ModalBody>
        <ModalFooter onSubmit={submitVetting} submitLabel="Save Vetting" />
      </Overlay>
    );
  };

  // ── Program Create / Edit Modal ──
  const ProgramModal = () => {
    const isEdit = modal === 'editProgram';
    const onNameChange = (e) => {
      const n = e.target.value;
      setForm(prev => ({ ...prev, name: n, slug: prev._slugManual ? prev.slug : toSlug(n) }));
    };
    const activeCoaches = coaches.filter(c => c.isActive);
    return (
      <Overlay>
        <ModalHeader title={isEdit ? 'Edit Program' : 'Add New Program'} />
        <ModalBody>
          <SectionHead title="Basic Info" />
          <Row>
            <FL label="Program Name" req>
              <input className="input-field text-xs w-full" value={fVal('name')} onChange={onNameChange}
                placeholder="e.g. Beginner Swimming – Wuse" />
            </FL>
            <FL label="Slug (auto-generated)">
              <input className="input-field text-xs w-full font-mono" value={fVal('slug')}
                onChange={e => { setF('slug')(e); setFv('_slugManual', true); }} />
            </FL>
          </Row>
          <Row>
            <CatSelect field="categoryId" required />
            <FL label="Coach" req>
              <select {...inp('coachId')} className="input-field text-xs w-full">
                <option value="">— Select coach —</option>
                {activeCoaches.map(c => (
                  <option key={c._id} value={c._id}>{c.name} ({c.categoryId?.icon || ''})</option>
                ))}
              </select>
            </FL>
          </Row>

          <SectionHead title="Pricing & Capacity" />
          <Row>
            <FL label="Price per Session (₦)" req>
              <input {...inp('pricePerSession', { type: 'number', min: 0, placeholder: '5000' })} />
            </FL>
            <FL label="Total Spots" req>
              <input {...inp('spotsTotal', { type: 'number', min: 1, placeholder: '8' })} />
            </FL>
          </Row>

          <SectionHead title="Schedule & Structure" />
          <Row>
            <FL label="Schedule">
              <input {...inp('schedule')} placeholder="Mon & Wed, 9:00 AM" />
            </FL>
            <FL label="Supervision" req>
              <select {...inp('supervision')} className="input-field text-xs w-full">
                <option value="">— Select —</option>
                {SUPERVISION_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FL>
          </Row>
          <Row>
            <FL label="Duration (minutes)">
              <input {...inp('duration', { type: 'number', min: 0, placeholder: '60' })} />
            </FL>
            <FL label="Total Sessions in Term">
              <input {...inp('sessions', { type: 'number', min: 1, placeholder: '12' })} />
            </FL>
          </Row>
          <Row>
            <FL label="Term Start">
              <input {...inp('termStart', { type: 'date' })} />
            </FL>
            <FL label="Term End">
              <input {...inp('termEnd', { type: 'date' })} />
            </FL>
          </Row>

          <SectionHead title="Ages, Gender & Location" />
          <div className="grid grid-cols-3 gap-3">
            <FL label="Age Range (display)">
              <input {...inp('ageRange')} placeholder="3–5 yrs" />
            </FL>
            <FL label="Age Min">
              <input {...inp('ageMin', { type: 'number', min: 0, placeholder: '3' })} />
            </FL>
            <FL label="Age Max">
              <input {...inp('ageMax', { type: 'number', min: 0, placeholder: '5' })} />
            </FL>
          </div>
          <Row>
            <FL label="Gender Restriction">
              <select {...inp('gender')} className="input-field text-xs w-full">
                <option value="any">Any gender</option>
                <option value="female">👧 Girls Only</option>
                <option value="male">👦 Boys Only</option>
              </select>
            </FL>
          </Row>
          <Row>
            <FL label="Location">
              <input {...inp('location')} placeholder="Wuse Leisure Centre" />
            </FL>
            <FL label="Location Note">
              <input {...inp('locationNote')} placeholder="Pool entrance, left side" />
            </FL>
          </Row>

          <SectionHead title="Content (one item per line)" />
          <Row>
            <FL label="Milestones">
              <textarea {...inp('milestones')} className="input-field text-xs w-full resize-none" rows={3}
                placeholder={'Water Comfort\nFloating Basics\nBasic Strokes'} />
            </FL>
            <FL label="Highlights">
              <textarea {...inp('highlights')} className="input-field text-xs w-full resize-none" rows={3}
                placeholder={'Small groups\nCertified coach\nProgress reports'} />
            </FL>
          </Row>
          <Row>
            <FL label="What to Bring">
              <textarea {...inp('whatToBring')} className="input-field text-xs w-full resize-none" rows={2}
                placeholder={'Swimsuit\nTowel\nWater bottle'} />
            </FL>
            <FL label="Safety Note">
              <textarea {...inp('safetyNote')} className="input-field text-xs w-full resize-none" rows={2}
                placeholder="Any safety requirements..." />
            </FL>
          </Row>
          <CheckField field="isActive" label="Active (visible on site)" />
        </ModalBody>
        <ModalFooter onSubmit={isEdit ? submitEditProgram : submitCreateProgram}
          submitLabel={isEdit ? 'Update Program' : 'Create Program'} />
      </Overlay>
    );
  };

  // ── Product Modal ──
  const ProductModal = () => {
    const isEdit = modal === 'editProduct';
    const onNameChange = (e) => {
      const n = e.target.value;
      setForm(prev => ({ ...prev, name: n, slug: prev._slugManual ? prev.slug : toSlug(n) }));
    };
    return (
      <Overlay>
        <ModalHeader title={isEdit ? 'Edit Product' : 'Add New Product'} />
        <ModalBody>
          <SectionHead title="Product Details" />
          <Row>
            <FL label="Product Name" req>
              <input className="input-field text-xs w-full" value={fVal('name')} onChange={onNameChange}
                placeholder="e.g. Speedo Adult Goggles" />
            </FL>
            <FL label="Slug (auto-generated)">
              <input className="input-field text-xs w-full font-mono" value={fVal('slug')}
                onChange={e => { setF('slug')(e); setFv('_slugManual', true); }} />
            </FL>
          </Row>
          <Row>
            <FL label="Price (₦)" req>
              <input {...inp('price', { type: 'number', min: 0, placeholder: '3500' })} />
            </FL>
            <CatSelect field="categoryId" />
          </Row>
          <FL label="Brand">
            <input {...inp('brand')} placeholder="Speedo, Adidas, Nike..." />
          </FL>
          <FL label="Description">
            <textarea {...inp('description')} className="input-field text-xs w-full resize-none" rows={2}
              placeholder="Brief product description..." />
          </FL>
          <CheckField field="inStock" label="In Stock" />
        </ModalBody>
        <ModalFooter onSubmit={isEdit ? submitEditProduct : submitCreateProduct}
          submitLabel={isEdit ? 'Save Changes' : 'Create Product'} />
      </Overlay>
    );
  };

  // ── Starter Kit Modal ──
  const KitModal = () => {
    const isEdit = modal === 'editKit';
    const onNameChange = (e) => {
      const n = e.target.value;
      setForm(prev => ({ ...prev, name: n, slug: prev._slugManual ? prev.slug : toSlug(n) }));
    };
    const saving = fVal('individualPrice') && fVal('kitPrice')
      ? Math.max(0, Number(fVal('individualPrice')) - Number(fVal('kitPrice')))
      : 0;
    const savingsPct = fVal('individualPrice') && saving > 0
      ? Math.round((saving / Number(fVal('individualPrice'))) * 100)
      : 0;
    return (
      <Overlay>
        <ModalHeader title={isEdit ? 'Edit Starter Kit' : 'Add New Starter Kit'} />
        <ModalBody>
          <SectionHead title="Kit Details" />
          <Row>
            <FL label="Kit Name" req>
              <input className="input-field text-xs w-full" value={fVal('name')} onChange={onNameChange}
                placeholder="e.g. Swimming Starter Kit" />
            </FL>
            <CatSelect field="categoryId" required />
          </Row>
          <Row>
            <FL label="Slug (auto-generated)">
              <input className="input-field text-xs w-full font-mono" value={fVal('slug')}
                onChange={e => { setF('slug')(e); setFv('_slugManual', true); }} />
            </FL>
            <FL label="Icon (emoji)">
              <input {...inp('icon')} placeholder="🏊" className="input-field text-xs w-full text-xl" />
            </FL>
          </Row>

          <SectionHead title="Pricing" />
          <Row>
            <FL label="Individual Price (₦) — total if bought separately" req>
              <input {...inp('individualPrice', { type: 'number', min: 0, placeholder: '8000' })} />
            </FL>
            <FL label="Kit Price (₦) — discounted bundle price" req>
              <input {...inp('kitPrice', { type: 'number', min: 0, placeholder: '5000' })} />
            </FL>
          </Row>
          {saving > 0 && (
            <div className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 font-semibold">
              Saving: {fmt(saving)} ({savingsPct}% off)
            </div>
          )}

          <SectionHead title="Contents & Info" />
          <FL label="Kit Contents (one item per line)" req>
            <textarea {...inp('contents')} className="input-field text-xs w-full resize-none" rows={4}
              placeholder={'Swim goggles\nSwim cap\nTowel\nWater bottle'} />
          </FL>
          <Row>
            <FL label="Brand">
              <input {...inp('brand')} placeholder="Speedo, Arena..." />
            </FL>
            <FL label="Description">
              <input {...inp('description')} placeholder="Brief kit description" />
            </FL>
          </Row>
          <CheckField field="inStock" label="In Stock" />
        </ModalBody>
        <ModalFooter onSubmit={isEdit ? submitEditKit : submitCreateKit}
          submitLabel={isEdit ? 'Save Changes' : 'Create Starter Kit'} />
      </Overlay>
    );
  };

  // ── Tournament submit handlers ──
  const submitCreateTournament = async () => {
    setSubmitting(true);
    const body = {
      name: form.name, type: form.type || 'individual',
      date: form.date || undefined,
      registrationDeadline: form.registrationDeadline || undefined,
      status: form.status || 'upcoming',
      venue: form.venue || undefined, city: form.city || 'abuja',
      ageRange: form.ageRange || undefined,
      maxTeams: form.maxTeams ? Number(form.maxTeams) : undefined,
      entryFee: form.entryFee != null ? Number(form.entryFee) : 0,
      prizes: form.prizes || undefined,
      description: form.description || undefined,
      categoryId: form.categoryId || undefined,
      isActive: form.isActive !== false,
      sponsorId: form.sponsorId || undefined,
    };
    const res = await authFetch('/api/tournaments', { method: 'POST', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setTournaments(prev => [data.tournament, ...prev]);
      toast.success('Tournament created');
      closeModal();
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || 'Create failed');
    }
  };

  const submitEditTournament = async () => {
    setSubmitting(true);
    const body = {
      name: form.name, type: form.type,
      date: form.date || undefined,
      registrationDeadline: form.registrationDeadline || undefined,
      status: form.status,
      venue: form.venue || undefined, city: form.city,
      ageRange: form.ageRange || undefined,
      maxTeams: form.maxTeams ? Number(form.maxTeams) : undefined,
      entryFee: form.entryFee != null ? Number(form.entryFee) : 0,
      prizes: form.prizes || undefined,
      description: form.description || undefined,
      categoryId: form.categoryId || undefined,
      isActive: form.isActive !== false,
      sponsorId: form.sponsorId || undefined,
    };
    const res = await authFetch(`/api/tournaments/${modalId}`, { method: 'PUT', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setTournaments(prev => prev.map(t => t._id === modalId ? data.tournament : t));
      toast.success('Tournament updated');
      closeModal();
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || 'Update failed');
    }
  };

  // ── Create Sponsor ──
  const submitCreateSponsor = async () => {
    if (!form.name?.trim()) { toast.error('Sponsor name is required'); return; }
    setSubmitting(true);
    const body = {
      name: form.name.trim(),
      tagline: form.tagline?.trim() || undefined,
      logo: form.logo?.trim() || undefined,
      website: form.website?.trim() || undefined,
      contactName: form.contactName?.trim() || undefined,
      contactEmail: form.contactEmail?.trim() || undefined,
      contactPhone: form.contactPhone?.trim() || undefined,
      type: form.type || 'general',
      active: form.active !== false,
      notes: form.notes?.trim() || undefined,
    };
    const res = await authFetch('/api/sponsors', { method: 'POST', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setSponsors(prev => [...prev, data.sponsor]);
      toast.success('Sponsor created');
      closeModal();
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || 'Create failed');
    }
  };

  // ── Edit Sponsor ──
  const submitEditSponsor = async () => {
    setSubmitting(true);
    const body = {
      name: form.name?.trim(),
      tagline: form.tagline?.trim() || null,
      logo: form.logo?.trim() || null,
      website: form.website?.trim() || null,
      contactName: form.contactName?.trim() || null,
      contactEmail: form.contactEmail?.trim() || null,
      contactPhone: form.contactPhone?.trim() || null,
      type: form.type,
      active: form.active !== false,
      notes: form.notes?.trim() || null,
    };
    const res = await authFetch(`/api/sponsors/${modalId}`, { method: 'PUT', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setSponsors(prev => prev.map(s => s._id === modalId ? data.sponsor : s));
      toast.success('Sponsor updated');
      closeModal();
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || 'Update failed');
    }
  };

  // ── Delete Sponsor ──
  const deleteSponsor = async (id) => {
    if (!confirm('Delete this sponsor? This cannot be undone.')) return;
    const res = await authFetch(`/api/sponsors/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSponsors(prev => prev.filter(s => s._id !== id));
      toast.success('Sponsor deleted');
    } else {
      toast.error('Delete failed');
    }
  };

  const submitTournamentResults = async () => {
    setSubmitting(true);
    let results;
    try { results = JSON.parse(form.results || '[]'); } catch { toast.error('Invalid JSON for results'); setSubmitting(false); return; }
    const res = await authFetch(`/api/tournaments/${modalId}`, { method: 'PUT', body: JSON.stringify({ results, status: 'completed' }) });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setTournaments(prev => prev.map(t => t._id === modalId ? data.tournament : t));
      toast.success('Results saved & tournament completed');
      closeModal();
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error || 'Update failed');
    }
  };

  // ── School approval handlers ──
  const approveSchool = async (schoolId) => {
    setApprovingSchool(schoolId + '_approving');
    const res = await authFetch(`/api/schools/${schoolId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`School approved! Invite code: ${data.inviteCode}`);
      const sRes = await authFetch('/api/schools');
      if (sRes.ok) setSchools((await sRes.json()).schools || []);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to approve school');
    }
    setApprovingSchool(null);
  };

  const rejectSchool = async (schoolId) => {
    const reason = rejectReason.trim() || undefined;
    setApprovingSchool(schoolId + '_rejecting');
    const res = await authFetch(`/api/schools/${schoolId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', reason }),
    });
    if (res.ok) {
      toast.success('School application rejected');
      setRejectReason('');
      const sRes = await authFetch('/api/schools');
      if (sRes.ok) setSchools((await sRes.json()).schools || []);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to reject school');
    }
    setApprovingSchool(null);
  };

  const submitCreateSchool = async () => {
    if (!form.name?.trim()) { toast.error('School name is required'); return; }
    setSubmitting(true);
    const slug = toSlug(form.name);
    const body = {
      name: form.name.trim(),
      slug: form.slug || slug,
      schoolType: form.schoolType || undefined,
      area: form.area || undefined,
      city: form.city || 'abuja',
      address: form.address || undefined,
      contactName: form.contactName || undefined,
      contactRole: form.contactRole || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      estimatedStudents: form.estimatedStudents ? Number(form.estimatedStudents) : undefined,
      defaultMarkupPercent: form.defaultMarkupPercent ? Number(form.defaultMarkupPercent) : 15,
      status: form.status || 'approved', // admin-created schools are auto-approved
    };
    const res = await authFetch('/api/schools', { method: 'POST', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      toast.success('School created!');
      closeModal();
      const sRes = await authFetch('/api/schools');
      if (sRes.ok) setSchools((await sRes.json()).schools || []);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to create school');
    }
  };

  const processSchoolPayout = async (schoolId, schoolName, pendingPayout) => {
    if (!confirm(`Mark ₦${Number(pendingPayout).toLocaleString()} as paid to ${schoolName}?`)) return;
    const res = await authFetch(`/api/schools/${schoolId}`, {
      method: 'PUT',
      body: JSON.stringify({ pendingPayout: 0 }),
    });
    if (res.ok) {
      toast.success('Payout processed — pendingPayout reset to ₦0');
      const sRes = await authFetch('/api/schools');
      if (sRes.ok) setSchools((await sRes.json()).schools || []);
    } else {
      toast.error('Failed to process payout');
    }
  };

  const approveCommunity = async (communityId) => {
    setApprovingCommunity(communityId + '_approving');
    const res = await authFetch(`/api/communities/${communityId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Estate activated! Invite code: ${data.inviteCode}`);
      const r = await authFetch('/api/communities');
      if (r.ok) setCommunities((await r.json()).communities || []);
    } else {
      toast.error('Failed to activate estate');
    }
    setApprovingCommunity(null);
  };

  const rejectCommunity = async (communityId) => {
    const reason = communityRejectReason.trim() || undefined;
    setApprovingCommunity(communityId + '_rejecting');
    const res = await authFetch(`/api/communities/${communityId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', reason }),
    });
    if (res.ok) {
      toast.success('Partnership paused');
      setCommunityRejectReason('');
      const r = await authFetch('/api/communities');
      if (r.ok) setCommunities((await r.json()).communities || []);
    } else {
      toast.error('Failed to update estate');
    }
    setApprovingCommunity(null);
  };

  const submitCreateCommunity = async () => {
    if (!form.name?.trim()) { toast.error('Community name is required'); return; }
    setSubmitting(true);
    const slug = toSlug(form.name);
    const body = {
      name: form.name.trim(),
      slug: form.slug || slug,
      type: form.type || 'estate',
      area: form.area || undefined,
      city: form.city || 'abuja',
      contactName: form.contactName || undefined,
      contactRole: form.contactRole || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      estimatedHouseholds: form.estimatedHouseholds ? Number(form.estimatedHouseholds) : undefined,
      defaultMarkupPercent: form.defaultMarkupPercent ? Number(form.defaultMarkupPercent) : 10,
      venueProvided: form.venueProvided !== false,
      status: 'approved',
    };
    const res = await authFetch('/api/communities', { method: 'POST', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Estate created!');
      closeModal();
      const r = await authFetch('/api/communities');
      if (r.ok) setCommunities((await r.json()).communities || []);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to create estate');
    }
  };

  const processCommunityPayout = async (communityId, communityName, pendingPayout) => {
    if (!confirm(`Mark ₦${Number(pendingPayout).toLocaleString()} as paid to ${communityName}?`)) return;
    const res = await authFetch(`/api/communities/${communityId}`, {
      method: 'PUT',
      body: JSON.stringify({ pendingPayout: 0 }),
    });
    if (res.ok) {
      toast.success('Payout processed');
      const r = await authFetch('/api/communities');
      if (r.ok) setCommunities((await r.json()).communities || []);
    } else {
      toast.error('Failed to process payout');
    }
  };

  const CommunityModal = () => (
    <Overlay>
      <ModalHeader title="Add Estate / Community" />
      <ModalBody>
        <Row>
          <FL label="Estate Name" req>
            <input className="input-field text-xs w-full" value={fVal('name')} onChange={e => {
              const n = e.target.value;
              setForm(prev => ({ ...prev, name: n, slug: prev._slugManual ? prev.slug : toSlug(n) }));
            }} placeholder="e.g. Gwarinpa Estate" />
          </FL>
          <FL label="Type">
            <select className="input-field text-xs w-full" value={fVal('type') || 'estate'} onChange={setF('type')}>
              <option value="estate">Gated Estate</option>
              <option value="residential">Residential Compound</option>
              <option value="community">Community</option>
              <option value="compound">Housing Estate</option>
            </select>
          </FL>
        </Row>
        <Row>
          <FL label="Area">
            <input {...inp('area')} placeholder="e.g. Maitama, Gwarinpa" />
          </FL>
          <FL label="City">
            <select className="input-field text-xs w-full" value={fVal('city') || 'abuja'} onChange={setF('city')}>
              <option value="abuja">Abuja</option>
              <option value="lagos">Lagos</option>
            </select>
          </FL>
        </Row>
        <SectionHead title="Contact" />
        <Row>
          <FL label="Contact Name">
            <input {...inp('contactName')} placeholder="e.g. Mr. Chuka Obi" />
          </FL>
          <FL label="Role">
            <input {...inp('contactRole')} placeholder="e.g. Estate Manager" />
          </FL>
        </Row>
        <Row>
          <FL label="Phone">
            <input {...inp('phone')} placeholder="08012345678" />
          </FL>
          <FL label="Email">
            <input {...inp('email', { type: 'email' })} placeholder="estate@email.ng" />
          </FL>
        </Row>
        <SectionHead title="Commercial" />
        <Row>
          <FL label="Default Markup %">
            <input {...inp('defaultMarkupPercent', { type: 'number', min: 0, max: 30 })} placeholder="10" />
          </FL>
          <FL label="Est. Households">
            <input {...inp('estimatedHouseholds', { type: 'number', min: 0 })} placeholder="e.g. 150" />
          </FL>
        </Row>
      </ModalBody>
      <ModalFooter onSubmit={submitCreateCommunity} submitLabel="Create Estate" />
    </Overlay>
  );

  const SchoolModal = () => (
    <Overlay>
      <ModalHeader title="Add School" />
      <ModalBody>
        <Row>
          <FL label="School Name" req>
            <input className="input-field text-xs w-full" value={fVal('name')} onChange={e => {
              const n = e.target.value;
              setForm(prev => ({ ...prev, name: n, slug: prev._slugManual ? prev.slug : toSlug(n) }));
            }} placeholder="e.g. Greenfield Academy" />
          </FL>
          <FL label="Type">
            <select className="input-field text-xs w-full" value={fVal('schoolType')} onChange={setF('schoolType')}>
              <option value="">— select —</option>
              {[
                { id: 'nursery', label: 'Nursery (ages 2–5)' },
                { id: 'primary', label: 'Primary (ages 6–11)' },
                { id: 'secondary', label: 'Secondary (ages 12–17)' },
                { id: 'nursery-primary', label: 'Nursery & Primary (ages 2–11)' },
                { id: 'primary-secondary', label: 'Primary & Secondary (ages 6–17)' },
                { id: 'all-through', label: 'All-through (ages 2–17)' },
              ].map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </FL>
        </Row>
        <Row>
          <FL label="Area / Neighbourhood">
            <input {...inp('area')} placeholder="e.g. Maitama, Wuse 2" />
          </FL>
          <FL label="City">
            <select className="input-field text-xs w-full" value={fVal('city') || 'abuja'} onChange={setF('city')}>
              <option value="abuja">Abuja</option>
              <option value="lagos">Lagos</option>
            </select>
          </FL>
        </Row>
        <FL label="Address">
          <input {...inp('address')} placeholder="Full street address" />
        </FL>
        <SectionHead title="Contact" />
        <Row>
          <FL label="Contact Name">
            <input {...inp('contactName')} placeholder="e.g. Mrs. Amaka Okafor" />
          </FL>
          <FL label="Role">
            <input {...inp('contactRole')} placeholder="e.g. Principal, P.E. Head" />
          </FL>
        </Row>
        <Row>
          <FL label="Phone">
            <input {...inp('phone')} placeholder="08012345678" />
          </FL>
          <FL label="Email">
            <input {...inp('email', { type: 'email' })} placeholder="school@email.com" />
          </FL>
        </Row>
        <SectionHead title="Pricing" />
        <Row>
          <FL label="Default Markup %">
            <input {...inp('defaultMarkupPercent', { type: 'number', min: 0, max: 50 })} placeholder="15" />
          </FL>
          <FL label="Est. Students">
            <input {...inp('estimatedStudents', { type: 'number', min: 0 })} placeholder="e.g. 200" />
          </FL>
        </Row>
      </ModalBody>
      <ModalFooter onSubmit={submitCreateSchool} submitLabel="Create School" />
    </Overlay>
  );

  const SponsorModal = () => {
    const isEdit = modal === 'editSponsor';
    const TYPE_OPTS = ['general', 'category', 'tournament', 'product', 'platform'];
    return (
      <Overlay>
        <ModalHeader title={isEdit ? 'Edit Sponsor' : 'New Sponsor'} />
        <ModalBody>
          <Row>
            <FL label="Name" req>
              <input {...inp('name')} placeholder="e.g. Speedo Nigeria" />
            </FL>
            <FL label="Type">
              <select className="input-field text-xs w-full" value={fVal('type') || 'general'} onChange={setF('type')}>
                {TYPE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FL>
          </Row>
          <FL label="Tagline">
            <input {...inp('tagline')} placeholder="e.g. Presented by Speedo" />
          </FL>
          <Row>
            <FL label="Logo URL">
              <input {...inp('logo')} placeholder="https://..." />
            </FL>
            <FL label="Website">
              <input {...inp('website')} placeholder="https://..." />
            </FL>
          </Row>
          <SectionHead title="Contact" />
          <Row>
            <FL label="Contact Name">
              <input {...inp('contactName')} placeholder="e.g. Chidi Obi" />
            </FL>
            <FL label="Contact Email">
              <input {...inp('contactEmail')} placeholder="chidi@speedo.com" />
            </FL>
          </Row>
          <FL label="Contact Phone">
            <input {...inp('contactPhone')} placeholder="0812..." />
          </FL>
          <FL label="Internal Notes">
            <textarea {...inp('notes')} className="input-field text-xs w-full resize-none" rows={2} placeholder="Deal terms, renewal date..." />
          </FL>
          <CheckField field="active" label="Active (visible on platform)" />
        </ModalBody>
        <ModalFooter
          onSubmit={isEdit ? submitEditSponsor : submitCreateSponsor}
          submitLabel={isEdit ? 'Save Changes' : 'Create Sponsor'}
        />
      </Overlay>
    );
  };

  const TournamentModal = () => {
    const isEdit = modal === 'editTournament';
    const STATUS_OPTS = ['upcoming', 'registration', 'in-progress', 'completed', 'cancelled'];
    const TYPE_OPTS = ['individual', 'team', 'relay', 'league', 'knockout'];
    return (
      <Overlay>
        <ModalHeader title={isEdit ? 'Edit Tournament' : 'New Tournament'} />
        <ModalBody>
          <Row>
            <FL label="Name" req>
              <input {...inp('name')} placeholder="e.g. Swimming Relay Term 1" />
            </FL>
            <FL label="Type" req>
              <select className="input-field text-xs w-full" value={fVal('type') || 'individual'} onChange={setF('type')}>
                {TYPE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FL>
          </Row>
          <Row>
            <FL label="Category">
              <select className="input-field text-xs w-full" value={fVal('categoryId')} onChange={setF('categoryId')}>
                <option value="">— none —</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
              </select>
            </FL>
            <FL label="Status">
              <select className="input-field text-xs w-full" value={fVal('status') || 'upcoming'} onChange={setF('status')}>
                {STATUS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FL>
          </Row>
          <Row>
            <FL label="Date"><input {...inp('date', { type: 'date' })} /></FL>
            <FL label="Registration Deadline"><input {...inp('registrationDeadline', { type: 'date' })} /></FL>
          </Row>
          <Row>
            <FL label="Venue"><input {...inp('venue')} placeholder="e.g. Abuja National Stadium" /></FL>
            <FL label="City">
              <select className="input-field text-xs w-full" value={fVal('city') || 'abuja'} onChange={setF('city')}>
                <option value="abuja">Abuja</option>
                <option value="lagos">Lagos</option>
              </select>
            </FL>
          </Row>
          <Row>
            <FL label="Age Range"><input {...inp('ageRange')} placeholder="e.g. 5-12 yrs" /></FL>
            <FL label="Max Teams (0 = unlimited)"><input {...inp('maxTeams', { type: 'number', min: 0 })} placeholder="16" /></FL>
          </Row>
          <Row>
            <FL label="Entry Fee (₦, 0 = free)"><input {...inp('entryFee', { type: 'number', min: 0 })} /></FL>
            <FL label="Prizes"><input {...inp('prizes')} placeholder="e.g. Medals + certificates" /></FL>
          </Row>
          <FL label="Description">
            <textarea {...inp('description')} className="input-field text-xs w-full resize-none" rows={3}
              placeholder="Brief description visible to parents..." />
          </FL>
          <FL label="Sponsor">
            <select className="input-field text-xs w-full" value={fVal('sponsorId') || ''} onChange={setF('sponsorId')}>
              <option value="">— none —</option>
              {sponsors.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </FL>
          <CheckField field="isActive" label="Active (visible on site)" />
        </ModalBody>
        <ModalFooter
          onSubmit={isEdit ? submitEditTournament : submitCreateTournament}
          submitLabel={isEdit ? 'Save Changes' : 'Create Tournament'}
        />
      </Overlay>
    );
  };

  const TournamentResultsModal = () => (
    <Overlay>
      <ModalHeader title="Update Results" />
      <ModalBody>
        <p className="text-[11px] text-slate-500 mb-3">
          Paste results as JSON array. Each entry: <code className="bg-slate-100 px-1 rounded text-[10px]">{`{"position":1,"teamName":"...","points":100,"notes":"..."}`}</code>
        </p>
        <FL label="Results JSON">
          <textarea value={fVal('results')} onChange={setF('results')}
            className="input-field text-xs w-full font-mono resize-none" rows={8}
            placeholder={`[\n  {"position":1,"teamName":"Team Alpha","points":100},\n  {"position":2,"teamName":"Team Beta","points":80}\n]`} />
        </FL>
        <p className="text-[10px] text-amber-700 mt-2">Saving will mark the tournament as <strong>completed</strong> and auto-award TOURNAMENT_WIN to position-1 teams.</p>
      </ModalBody>
      <ModalFooter onSubmit={submitTournamentResults} submitLabel="Save Results & Complete" />
    </Overlay>
  );

  // ════════════════════════════════════════════════════════
  // JSX
  // ════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── Modal portal (context keeps Overlay/ModalHeader/ModalFooter stable across re-renders) ── */}
      <ModalCtx.Provider value={{ onClose: closeModal, submitting }}>
        {modal === 'createCommunity' && CommunityModal()}
        {modal === 'createSchool' && SchoolModal()}
        {(modal === 'createCoach' || modal === 'editCoach') && CoachModal()}
        {modal === 'vetting' && VettingModal()}
        {(modal === 'createProgram' || modal === 'editProgram') && ProgramModal()}
        {(modal === 'createProduct' || modal === 'editProduct') && ProductModal()}
        {(modal === 'createKit' || modal === 'editKit') && KitModal()}
        {(modal === 'createSponsor' || modal === 'editSponsor') && SponsorModal()}
        {(modal === 'createTournament' || modal === 'editTournament') && TournamentModal()}
        {modal === 'tournamentResults' && TournamentResultsModal()}
      </ModalCtx.Provider>

      {/* ── Term Report Modal ── */}
      {reportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-8 overflow-y-auto" onClick={() => !reportSubmitting && setReportModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-serif text-base font-bold text-slate-900">Term Report</h2>
                <div className="text-[10px] text-slate-400 mt-0.5">{reportModal.enr.childName} — {reportModal.enr.programId?.name || 'Program'}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setReportStep(s)}
                      className={`w-6 h-6 rounded-full text-[9px] font-bold ${reportStep === s ? 'bg-teal-primary text-white' : reportStep > s ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <button onClick={() => setReportModal(null)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Step 1: Attendance + Overall Rating */}
              {reportStep === 1 && (
                <>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider pb-1 border-b border-slate-100">Attendance & Overall Rating</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Sessions Present</label>
                      <input type="number" min="0" className="input-field text-xs w-full"
                        value={reportForm.attendancePresent}
                        onChange={e => setReportForm(prev => ({ ...prev, attendancePresent: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Total Sessions</label>
                      <input type="number" min="0" className="input-field text-xs w-full"
                        value={reportForm.attendanceTotal}
                        onChange={e => setReportForm(prev => ({ ...prev, attendanceTotal: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-2">Overall Rating</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <button key={star} onClick={() => setReportForm(prev => ({ ...prev, overallRating: star }))}
                          className={`text-2xl transition-colors ${reportForm.overallRating >= star ? 'text-amber-400' : 'text-slate-200'}`}>
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Skills Assessment */}
              {reportStep === 2 && (
                <>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider pb-1 border-b border-slate-100">Skills Assessment</div>
                  {reportForm.skills.length === 0 && (
                    <p className="text-[11px] text-slate-400 text-center py-4">No milestones defined for this programme. Add skills manually below.</p>
                  )}
                  <div className="space-y-3">
                    {reportForm.skills.map((skill, i) => (
                      <div key={i} className="bg-slate-50 rounded-lg p-3">
                        <div className="font-semibold text-[11px] mb-2">{skill.name}</div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-1">Before</label>
                            <select className="input-field text-[10px] w-full py-1"
                              value={skill.beforeLevel}
                              onChange={e => {
                                const updated = [...reportForm.skills];
                                updated[i] = { ...updated[i], beforeLevel: e.target.value };
                                setReportForm(prev => ({ ...prev, skills: updated }));
                              }}>
                              {['beginner','developing','competent','proficient','advanced'].map(l => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-1">After</label>
                            <select className="input-field text-[10px] w-full py-1"
                              value={skill.afterLevel}
                              onChange={e => {
                                const updated = [...reportForm.skills];
                                updated[i] = { ...updated[i], afterLevel: e.target.value };
                                setReportForm(prev => ({ ...prev, skills: updated }));
                              }}>
                              {['beginner','developing','competent','proficient','advanced'].map(l => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-1">Rating</label>
                            <div className="flex gap-0.5 pt-1">
                              {[1,2,3,4,5].map(star => (
                                <button key={star} onClick={() => {
                                  const updated = [...reportForm.skills];
                                  updated[i] = { ...updated[i], rating: star };
                                  setReportForm(prev => ({ ...prev, skills: updated }));
                                }}
                                  className={`text-sm ${skill.rating >= star ? 'text-amber-400' : 'text-slate-200'}`}>★</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => {
                    const name = prompt('Skill name:');
                    if (name) setReportForm(prev => ({ ...prev, skills: [...prev.skills, { name, beforeLevel: 'beginner', afterLevel: 'beginner', rating: 0 }] }));
                  }} className="btn-outline text-[10px] px-3 py-1.5">+ Add Skill</button>
                </>
              )}

              {/* Step 3: Strengths, Improvements, Notes */}
              {reportStep === 3 && (
                <>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider pb-1 border-b border-slate-100">Qualitative Feedback</div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Strengths</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {reportForm.strengths.map((s, i) => (
                        <span key={i} className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                          {s}
                          <button onClick={() => setReportForm(prev => ({ ...prev, strengths: prev.strengths.filter((_, j) => j !== i) }))}
                            className="text-emerald-400 hover:text-emerald-700 leading-none">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input className="input-field text-xs flex-1" placeholder="Add a strength..."
                        value={strengthInput} onChange={e => setStrengthInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && strengthInput.trim()) { setReportForm(prev => ({ ...prev, strengths: [...prev.strengths, strengthInput.trim()] })); setStrengthInput(''); }}} />
                      <button onClick={() => { if (strengthInput.trim()) { setReportForm(prev => ({ ...prev, strengths: [...prev.strengths, strengthInput.trim()] })); setStrengthInput(''); }}}
                        className="btn-outline text-[10px] px-2 py-1">Add</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Areas to Improve</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {reportForm.improvements.map((s, i) => (
                        <span key={i} className="bg-amber-50 text-amber-700 text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                          {s}
                          <button onClick={() => setReportForm(prev => ({ ...prev, improvements: prev.improvements.filter((_, j) => j !== i) }))}
                            className="text-amber-400 hover:text-amber-700 leading-none">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input className="input-field text-xs flex-1" placeholder="Add an area to improve..."
                        value={improvementInput} onChange={e => setImprovementInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && improvementInput.trim()) { setReportForm(prev => ({ ...prev, improvements: [...prev.improvements, improvementInput.trim()] })); setImprovementInput(''); }}} />
                      <button onClick={() => { if (improvementInput.trim()) { setReportForm(prev => ({ ...prev, improvements: [...prev.improvements, improvementInput.trim()] })); setImprovementInput(''); }}}
                        className="btn-outline text-[10px] px-2 py-1">Add</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Coach Notes</label>
                    <textarea className="input-field text-xs w-full resize-none" rows={3}
                      placeholder="General observations, progress notes..."
                      value={reportForm.coachNotes}
                      onChange={e => setReportForm(prev => ({ ...prev, coachNotes: e.target.value }))} />
                  </div>
                </>
              )}

              {/* Step 4: Recommendation */}
              {reportStep === 4 && (
                <>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider pb-1 border-b border-slate-100">Recommendation</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'repeat', label: 'Repeat Level', desc: 'Child should repeat this programme for stronger foundations', icon: '🔄' },
                      { id: 'advance', label: 'Advance', desc: 'Ready for the next level in this sport', icon: '⬆️' },
                      { id: 'new-sport', label: 'Try New Sport', desc: 'Would benefit from exploring a different activity', icon: '🌟' },
                      { id: 'private', label: 'Private Sessions', desc: 'Recommend 1-on-1 coaching for accelerated progress', icon: '🎯' },
                    ].map(r => (
                      <button key={r.id}
                        onClick={() => setReportForm(prev => ({ ...prev, recommendation: r.id }))}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          reportForm.recommendation === r.id
                            ? 'border-teal-primary bg-teal-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        <div className="text-xl mb-1">{r.icon}</div>
                        <div className="font-bold text-xs">{r.label}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Step 5: Review + Publish */}
              {reportStep === 5 && (
                <>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider pb-1 border-b border-slate-100">Review & Publish</div>
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-[10px] font-semibold text-slate-500 mb-1">Attendance</div>
                      <div className="text-sm font-bold">{reportForm.attendancePresent}/{reportForm.attendanceTotal} sessions</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-[10px] font-semibold text-slate-500 mb-1">Overall Rating</div>
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${reportForm.overallRating >= s ? 'text-amber-400' : 'text-slate-200'}`}>★</span>)}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-[10px] font-semibold text-slate-500 mb-1">Skills ({reportForm.skills.length})</div>
                      {reportForm.skills.map((sk, i) => (
                        <div key={i} className="text-[11px]">{sk.name}: {sk.beforeLevel} → {sk.afterLevel} {'★'.repeat(sk.rating)}</div>
                      ))}
                    </div>
                    {reportForm.strengths.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-[10px] font-semibold text-slate-500 mb-1">Strengths</div>
                        <div className="flex flex-wrap gap-1">{reportForm.strengths.map((s,i) => <span key={i} className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">{s}</span>)}</div>
                      </div>
                    )}
                    {reportForm.improvements.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-[10px] font-semibold text-slate-500 mb-1">Areas to Improve</div>
                        <div className="flex flex-wrap gap-1">{reportForm.improvements.map((s,i) => <span key={i} className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full">{s}</span>)}</div>
                      </div>
                    )}
                    {reportForm.recommendation && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-[10px] font-semibold text-slate-500 mb-1">Recommendation</div>
                        <div className="text-sm font-bold capitalize">{reportForm.recommendation.replace('-', ' ')}</div>
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none mt-2">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded accent-teal-600"
                      checked={reportForm.awardCertificate}
                      onChange={e => setReportForm(prev => ({ ...prev, awardCertificate: e.target.checked }))} />
                    Award completion certificate
                  </label>
                </>
              )}
            </div>

            <div className="flex justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setReportStep(s => Math.max(1, s - 1))} disabled={reportStep === 1}
                className="btn-outline text-xs px-4 py-2 disabled:opacity-40">← Back</button>
              <div className="flex gap-2">
                <button onClick={() => setReportModal(null)} className="btn-outline text-xs px-4 py-2">Cancel</button>
                {reportStep < 5 ? (
                  <button onClick={() => setReportStep(s => s + 1)} className="btn-primary text-xs px-5 py-2">Next →</button>
                ) : (
                  <button onClick={submitReport} disabled={reportSubmitting}
                    className="btn-primary text-xs px-5 py-2 disabled:opacity-60">
                    {reportSubmitting ? 'Publishing...' : '📋 Publish Report'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Award Achievement Modal ── */}
      {awardModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setAwardModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm">Award Achievement</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{awardModal.enr.childName}</div>
              </div>
              <button onClick={() => setAwardModal(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5">
              {awardModal.achievements.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4">No achievements found for this category.</p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {awardModal.achievements.map(ach => (
                    <label key={ach._id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${awardAchId === ach._id ? 'border-amber-400 bg-amber-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <input type="radio" name="achievement" value={ach._id} checked={awardAchId === ach._id} onChange={() => setAwardAchId(ach._id)} className="accent-amber-500" />
                      <span className="text-xl">{ach.icon || '🏅'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold">{ach.name}</div>
                        <div className="text-[9px] text-slate-400 truncate">{ach.description}</div>
                        <div className="text-[9px] text-amber-600 mt-0.5">{ach.points} pts · {ach.rarity}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={submitAward} disabled={!awardAchId || awarding}
                  className="btn-primary btn-sm flex-1 disabled:opacity-60 disabled:cursor-not-allowed">
                  {awarding ? 'Awarding...' : 'Award Badge'}
                </button>
                <button onClick={() => setAwardModal(null)} className="btn-outline btn-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Session Update Popover ── */}
      {sessionPop && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !sessionPopping && setSessionPop(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm">+1 Session — {sessionPop.childName}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {sessionPop.sessionsCompleted + 1}{sessionPop.total ? `/${sessionPop.total}` : ''} · {sessionPop.programName}
                </div>
              </div>
              <button onClick={() => setSessionPop(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Pre-filled message */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Parent message</label>
                <textarea
                  rows={4}
                  value={sessionPop.msg}
                  onChange={e => setSessionPop(prev => ({ ...prev, msg: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-teal-primary/30"
                />
              </div>
              {/* Milestone pills */}
              {sessionPop.milestones.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Programme milestones</div>
                  <div className="flex flex-wrap gap-1.5">
                    {sessionPop.milestones.map((m, i) => {
                      const threshold = Math.round(((i + 1) / sessionPop.milestones.length) * (sessionPop.total || 1));
                      const triggered = (sessionPop.sessionsCompleted + 1) === threshold;
                      return (
                        <span
                          key={i}
                          onClick={() => setSessionPop(prev => ({ ...prev, msg: prev.msg + `\n\n🏅 Milestone reached: ${m}` }))}
                          className={`text-[10px] px-2 py-1 rounded-full border cursor-pointer transition-colors ${triggered ? 'bg-amber-50 border-amber-300 text-amber-700 font-semibold ring-1 ring-amber-300' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                          title={triggered ? `Triggered at session ${threshold}!` : `Triggered at session ${threshold}`}
                        >
                          {triggered && '🏅 '}{m}
                        </span>
                      );
                    })}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">Tap a milestone to append it to the message</div>
                </div>
              )}
              {/* Coach note */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Coach note (optional)</label>
                <input
                  type="text"
                  value={sessionPop.note}
                  onChange={e => setSessionPop(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="e.g. Great form today, working on breathing technique"
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-teal-primary/30"
                />
              </div>
              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => submitSessionUpdate(true)}
                  disabled={sessionPopping}
                  className="btn-primary btn-sm flex-1 text-xs disabled:opacity-60"
                >
                  {sessionPopping ? 'Updating...' : '📲 Update & Notify Parent'}
                </button>
                <button
                  onClick={() => submitSessionUpdate(false)}
                  disabled={sessionPopping}
                  className="btn-outline btn-sm text-xs disabled:opacity-60"
                >
                  Update Quietly
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside className="w-52 bg-white border-r border-slate-200/80 min-h-screen shrink-0 hidden lg:flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logomark.svg" alt="SkillPadi" className="w-7 h-7" />
            <span className="font-serif text-sm text-teal-primary">SkillPadi</span>
          </Link>
          <div className="text-[9px] text-slate-400 mt-1">Admin Panel</div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${tab === t.id ? 'bg-teal-primary/8 text-teal-primary font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <span className="text-sm">{t.icon}</span>
              <span>{t.label}</span>
              {t.id === 'enquiries' && newEnq > 0 && <span className="ml-auto bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{newEnq}</span>}
              {t.id === 'enrollments' && activeEnr > 0 && <span className="ml-auto text-[9px] text-slate-400">{activeEnr}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-primary text-white text-[9px] font-bold flex items-center justify-center">{dbUser?.name?.[0]}</div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-slate-700 truncate">{dbUser?.name}</div>
              <div className="text-[8px] text-slate-400 truncate">{dbUser?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between">
        <button onClick={() => setSideOpen(true)} className="p-1.5">
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-serif text-sm text-teal-primary">Admin</span>
        <Link href="/" className="text-[10px] text-slate-400">View Site →</Link>
      </div>

      {/* ── Mobile Sidebar Overlay ── */}
      {sideOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setSideOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-64 bg-white h-full shadow-xl p-3 space-y-0.5">
            <div className="flex justify-between items-center mb-3 px-2">
              <span className="font-serif text-sm text-teal-primary">Admin</span>
              <button onClick={() => setSideOpen(false)} className="text-slate-400">✕</button>
            </div>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); setSideOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium ${tab === t.id ? 'bg-teal-primary/8 text-teal-primary' : 'text-slate-500'}`}>
                <span>{t.icon}</span><span>{t.label}</span>
                {t.id === 'enquiries' && newEnq > 0 && <span className="ml-auto bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{newEnq}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-4 lg:p-6 max-w-6xl">

          {/* ════════ DASHBOARD ════════ */}
          {tab === 'dashboard' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Dashboard</h1>
              {loadingData ? <p className="text-sm text-slate-400">Loading...</p> : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[
                      { l: 'Revenue', v: fmt(ov.totalRevenue || 0), sub: `${rev.payments || 0} transactions`, color: 'text-emerald-700' },
                      { l: 'Active Kids', v: ov.activeEnrollments || 0, sub: `${ov.totalChildren || 0} total children` },
                      { l: 'Coaches', v: ov.totalCoaches || 0, sub: `${ov.certifiedCoaches || 0} certified` },
                      { l: 'New Enquiries', v: newEnq, sub: `${enquiries.length} total`, color: newEnq > 0 ? 'text-red-600' : '' },
                    ].map((s) => (
                      <div key={s.l} className="bg-white rounded-xl border border-slate-200/80 p-4">
                        <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{s.l}</div>
                        <div className={`font-serif text-2xl mt-1 ${s.color || 'text-slate-900'}`}>{s.v}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-bold text-xs">Program Capacity</div>
                        <span className="text-[10px] text-slate-400">{ov.usedSpots || 0}/{ov.totalSpots || 0} spots</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${(ov.capacityPercent || 0) > 85 ? 'bg-red-500' : (ov.capacityPercent || 0) > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${ov.capacityPercent || 0}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1.5">{ov.capacityPercent || 0}% filled</div>
                      <div className="mt-3 space-y-1.5">
                        {programs.slice(0, 5).map((p) => {
                          const filled = pct(p.spotsTaken, p.spotsTotal);
                          return (
                            <div key={p._id} className="flex items-center gap-2 text-[10px]">
                              <span className="text-slate-600 truncate flex-1">{p.categoryId?.icon} {p.name}</span>
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${filled >= 90 ? 'bg-red-500' : filled >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${filled}%` }} />
                              </div>
                              <span className="text-slate-400 w-12 text-right">{p.spotsTaken}/{p.spotsTotal}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                      <div className="font-bold text-xs mb-3">Revenue Breakdown</div>
                      {rev.byType && Object.entries(rev.byType).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(rev.byType).sort((a, b) => b[1] - a[1]).map(([type, amt]) => (
                            <div key={type} className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: type === 'enrollment' ? '#0F766E' : type === 'membership' ? '#7C3AED' : type === 'product' ? '#CA8A04' : '#64748b' }} />
                              <span className="text-[11px] text-slate-600 flex-1 capitalize">{type.replace('-', ' ')}</span>
                              <span className="text-[11px] font-semibold">{fmt(amt)}</span>
                              <span className="text-[9px] text-slate-400 w-10 text-right">{pct(amt, ov.totalRevenue || 1)}%</span>
                            </div>
                          ))}
                          <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between text-xs">
                            <span className="text-slate-500">VAT Collected</span>
                            <span className="font-semibold">{fmt(rev.tax || 0)}</span>
                          </div>
                        </div>
                      ) : <p className="text-[11px] text-slate-400">No revenue data yet.</p>}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-bold text-xs">Recent Enquiries</div>
                        <button onClick={() => setTab('enquiries')} className="text-[10px] text-teal-primary font-semibold">View All →</button>
                      </div>
                      {enquiries.slice(0, 4).map((enq) => (
                        <div key={enq._id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                          <div>
                            <div className="text-[11px] font-semibold">{enq.parentName}</div>
                            <div className="text-[9px] text-slate-400">{enq.childName} · {enq.phone}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`badge ${enq.status === 'new' ? 'badge-red' : enq.status === 'contacted' ? 'badge-amber' : 'badge-green'}`}>{enq.status}</span>
                            <span className="text-[8px] text-slate-400">{ago(enq.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                      {enquiries.length === 0 && <p className="text-[11px] text-slate-400 text-center py-4">No enquiries yet.</p>}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-bold text-xs">Recent Enrollments</div>
                        <button onClick={() => setTab('enrollments')} className="text-[10px] text-teal-primary font-semibold">View All →</button>
                      </div>
                      {enrollments.slice(0, 4).map((enr) => (
                        <div key={enr._id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                          <div>
                            <div className="text-[11px] font-semibold">{enr.childName}</div>
                            <div className="text-[9px] text-slate-400">{enr.programId?.name} · {enr.sessionsCompleted || 0}/{enr.programId?.sessions || 0}</div>
                          </div>
                          <span className={`badge ${enr.status === 'active' ? 'badge-green' : enr.status === 'completed' ? 'badge-blue' : 'badge-amber'}`}>{enr.status}</span>
                        </div>
                      ))}
                      {enrollments.length === 0 && <p className="text-[11px] text-slate-400 text-center py-4">No enrollments yet.</p>}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════ ENQUIRIES ════════ */}
          {tab === 'enquiries' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h1 className="font-serif text-xl">Enquiries <span className="text-sm font-sans text-slate-400">({enquiries.length})</span></h1>
                <div className="flex gap-1 flex-wrap">
                  {['all', 'new', 'contacted', 'enrolled', 'declined'].map(f => (
                    <button key={f} onClick={() => setEnqFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${enqFilter === f ? 'bg-teal-primary text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                      {f === 'new' && newEnq > 0 && <span className="ml-1 text-[8px]">({newEnq})</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {enquiries.filter(e => enqFilter === 'all' || e.status === enqFilter).map(enq => (
                  <div key={enq._id} className={`bg-white rounded-xl border p-4 ${enq.status === 'new' ? 'border-red-200 bg-red-50/30' : 'border-slate-200/80'}`}>
                    <div className="flex justify-between mb-2">
                      <div>
                        <div className="font-bold text-sm">{enq.parentName}</div>
                        <div className="text-[10px] text-slate-500">{enq.phone} · {enq.email || 'no email'}</div>
                        <div className="text-[10px] text-slate-500">Child: {enq.childName || '—'} ({enq.childAge || '—'}yrs) · Source: {enq.source}</div>
                      </div>
                      <div className="text-right">
                        <span className={`badge ${enq.status === 'new' ? 'badge-red' : enq.status === 'contacted' ? 'badge-amber' : enq.status === 'enrolled' ? 'badge-green' : 'badge-gray'}`}>{enq.status}</span>
                        <div className="text-[8px] text-slate-400 mt-1">{ago(enq.createdAt)}</div>
                      </div>
                    </div>
                    {enq.message && <p className="text-[11px] text-slate-600 italic bg-slate-50 rounded-lg p-2 mb-2">&ldquo;{enq.message}&rdquo;</p>}
                    {enq.programId?.name && <div className="text-[10px] text-teal-primary font-semibold mb-2">Program: {enq.programId.name}</div>}
                    <div className="flex gap-1.5 flex-wrap">
                      {enq.status === 'new' && <button onClick={() => updateEnquiry(enq._id, 'contacted')} className="btn-primary btn-sm text-[10px]">Mark Contacted ✓</button>}
                      {enq.status === 'contacted' && <button onClick={() => updateEnquiry(enq._id, 'enrolled')} className="btn-primary btn-sm text-[10px]">Mark Enrolled ✓</button>}
                      <a href={`https://wa.me/${(enq.phone || '').replace(/^0/, '234')}?text=${encodeURIComponent(`Hi ${enq.parentName}, this is SkillPadi!`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="btn-sm bg-[#25D366] text-white rounded-lg text-[10px] font-semibold px-2.5 py-1">
                        💬 WhatsApp
                      </a>
                      {!['declined', 'enrolled'].includes(enq.status) && <button onClick={() => updateEnquiry(enq._id, 'declined')} className="btn-outline btn-sm text-[10px] text-red-500 border-red-200">Decline</button>}
                      <button onClick={() => deleteEnquiry(enq._id)} className="btn-sm text-[10px] text-slate-400 hover:text-red-500">🗑️</button>
                    </div>
                  </div>
                ))}
                {enquiries.filter(e => enqFilter === 'all' || e.status === enqFilter).length === 0 && (
                  <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-400 text-sm">No enquiries found.</div>
                )}
              </div>
            </div>
          )}

          {/* ════════ ENROLLMENTS ════════ */}
          {tab === 'enrollments' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h1 className="font-serif text-xl">Enrollments <span className="text-sm font-sans text-slate-400">({enrollments.length})</span></h1>
                {checkedEnrs.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{checkedEnrs.size} selected</span>
                    <button
                      onClick={markAllPresent}
                      disabled={markingAll}
                      className="btn-primary btn-sm text-xs px-3 py-1.5"
                    >
                      {markingAll ? 'Updating...' : `✅ Mark All Present (+1)`}
                    </button>
                    <button onClick={() => setCheckedEnrs(new Set())} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        className="rounded"
                        onChange={toggleAllEnrs}
                        checked={enrollments.filter(e => e.status === 'active').length > 0 &&
                          enrollments.filter(e => e.status === 'active').every(e => checkedEnrs.has(e._id))}
                      />
                    </th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Child</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Program</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Parent</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Progress</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Status</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Actions</th>
                  </tr></thead>
                  <tbody>
                    {enrollments.map(enr => {
                      const prog = enr.programId || {};
                      const done = pct(enr.sessionsCompleted || 0, prog.sessions || 1);
                      return (
                        <tr key={enr._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="p-3">
                            {enr.status === 'active' && (
                              <input
                                type="checkbox"
                                className="rounded"
                                checked={checkedEnrs.has(enr._id)}
                                onChange={() => toggleCheckedEnr(enr._id)}
                              />
                            )}
                          </td>
                          <td className="p-3"><div className="font-semibold">{enr.childName}</div><div className="text-[9px] text-slate-400">{enr.childAge ? `${enr.childAge} yrs` : ''}</div></td>
                          <td className="p-3">{prog.categoryId?.icon} {prog.name}</td>
                          <td className="p-3 text-[10px]">{enr.userId?.name || '—'}<br /><span className="text-slate-400">{enr.userId?.phone || enr.userId?.email}</span></td>
                          <td className="p-3">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-teal-primary" style={{ width: `${done}%` }} /></div>
                            <span className="text-[9px] text-slate-400">{enr.sessionsCompleted || 0}/{prog.sessions || 0}</span>
                          </td>
                          <td className="p-3"><span className={`badge ${enr.status === 'active' ? 'badge-green' : enr.status === 'completed' ? 'badge-blue' : 'badge-amber'}`}>{enr.status}</span></td>
                          <td className="p-3">
                            <div className="flex gap-1 flex-wrap">
                              {enr.status === 'active' && (
                                <button
                                  onClick={() => openSessionPop(enr)}
                                  className="btn-outline btn-sm text-[9px] font-bold"
                                >+1 Session</button>
                              )}
                              {enr.status === 'active' && (
                                <button onClick={() => updateEnrollment(enr._id, { status: 'completed' })}
                                  className="btn-sm text-[9px] bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-2 py-1 font-semibold">Complete</button>
                              )}
                              {enr.status === 'active' && (
                                <button onClick={() => updateEnrollment(enr._id, { status: 'paused' })}
                                  className="btn-sm text-[9px] bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2 py-1 font-semibold">Pause</button>
                              )}
                              {enr.status === 'paused' && (
                                <button onClick={() => updateEnrollment(enr._id, { status: 'active' })}
                                  className="btn-sm text-[9px] bg-green-50 text-green-700 border border-green-200 rounded-lg px-2 py-1 font-semibold">Resume</button>
                              )}
                              {!['cancelled', 'completed'].includes(enr.status) && (
                                <button onClick={() => { if (confirm('Cancel this enrollment?')) updateEnrollment(enr._id, { status: 'cancelled' }); }}
                                  className="btn-sm text-[9px] bg-red-50 text-red-600 border border-red-200 rounded-lg px-2 py-1 font-semibold">Cancel</button>
                              )}
                              <button onClick={() => openAwardModal(enr)}
                                className="btn-sm text-[9px] bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2 py-1 font-semibold">🏅 Award</button>
                              {enr.status === 'completed' && (
                                <button onClick={() => openReportModal(enr)}
                                  className="btn-sm text-[9px] bg-purple-50 text-purple-700 border border-purple-200 rounded-lg px-2 py-1 font-semibold">📝 Write Report</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {enrollments.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No enrollments yet.</div>}
              </div>
            </div>
          )}

          {/* ════════ MEMBERS ════════ */}
          {tab === 'members' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Members <span className="text-sm font-sans text-slate-400">({users.length})</span></h1>
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Parent</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Contact</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Children</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Membership</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Joined</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Actions</th>
                  </tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-3 font-semibold">{u.name || '—'}</td>
                        <td className="p-3 text-[10px]">{u.email}<br /><span className="text-slate-400">{u.phone || '—'}</span></td>
                        <td className="p-3 text-[10px]">{u.children?.length > 0 ? u.children.map(c => `${c.name} (${c.age})`).join(', ') : <span className="text-slate-400">—</span>}</td>
                        <td className="p-3"><span className={`badge ${u.membershipPaid ? 'badge-green' : 'badge-amber'}`}>{u.membershipPaid ? 'Active' : 'Pending'}</span></td>
                        <td className="p-3 text-[10px] text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="p-3">
                          <button onClick={() => changeUserRole(u._id, u.role)} className="btn-outline btn-sm text-[9px]">{u.role} ✎</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No members yet.</div>}
              </div>
            </div>
          )}

          {/* ════════ COACHES ════════ */}
          {tab === 'coaches' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h1 className="font-serif text-xl">Coaches <span className="text-sm font-sans text-slate-400">({coaches.length})</span></h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    className="input-field text-xs py-1.5 w-28"
                    value={coachCityFilter}
                    onChange={e => setCoachCityFilter(e.target.value)}>
                    <option value="all">All Cities</option>
                    <option value="abuja">🏙️ Abuja</option>
                    <option value="lagos">🌊 Lagos</option>
                  </select>
                  <input
                    className="input-field text-xs py-1.5 w-40"
                    placeholder="Search coaches..."
                    value={coachSearch}
                    onChange={e => setCoachSearch(e.target.value)}
                  />
                  <button onClick={openCreateCoach} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                    <span className="text-sm leading-none">+</span> Add Coach
                  </button>
                </div>
              </div>

              {loadingData ? (
                <p className="text-sm text-slate-400">Loading...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredCoaches.map(c => {
                    const cat = c.categoryId || {};
                    const vettedCount = VETTING_ITEMS.filter(v => c.vetting?.[v.key]?.status === 'verified' || c.vetting?.[v.key]?.status === 'na').length;
                    return (
                      <div key={c._id} className={`bg-white rounded-xl border p-4 ${!c.isActive ? 'opacity-60 border-slate-200' : 'border-slate-200/80'}`}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ background: `linear-gradient(135deg, ${cat.color || '#0F766E'}, ${cat.color || '#0F766E'}88)` }}>
                            {c.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className="font-bold text-sm truncate">{c.name}</div>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                c.tier === 'master' ? 'bg-purple-100 text-purple-700' :
                                c.tier === 'independent' ? 'bg-blue-100 text-blue-700' :
                                'bg-teal-100 text-teal-700'
                              }`}>{(c.tier || 'partner').charAt(0).toUpperCase() + (c.tier || 'partner').slice(1)}</span>
                            </div>
                            <div className="text-[10px] truncate" style={{ color: cat.color || '#64748b' }}>{cat.icon} {c.title || cat.name}</div>
                          </div>
                          {!c.isActive && <span className="badge badge-gray text-[8px] shrink-0">Inactive</span>}
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className={`badge ${c.shieldLevel === 'certified' ? 'badge-green' : c.shieldLevel === 'verified' ? 'badge-blue' : 'badge-amber'}`}>
                            🛡️ {c.shieldLevel}
                          </span>
                          {c.rating > 0 && <span className="text-[10px] text-slate-400">⭐ {c.rating} ({c.reviewCount})</span>}
                          {c.yearsExperience > 0 && <span className="text-[10px] text-slate-400">{c.yearsExperience}y exp</span>}
                        </div>

                        {/* Tier + Payout */}
                        <div className="flex items-center gap-2 mb-3">
                          <select
                            className="input-field text-[10px] py-1 w-28"
                            value={c.tier || 'partner'}
                            onChange={e => changeCoachTier(c._id, e.target.value)}
                          >
                            <option value="partner">Partner</option>
                            <option value="independent">Independent</option>
                            <option value="master">Master</option>
                          </select>
                          {c.pendingPayout > 0 && (
                            <button
                              onClick={() => processCoachPayout(c._id, c.name, c.pendingPayout)}
                              className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-2 py-1 font-semibold hover:bg-emerald-100 transition-colors"
                            >
                              💳 Pay {fmt(c.pendingPayout)}
                            </button>
                          )}
                        </div>

                        {/* Vetting progress bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                            <span>Vetting</span>
                            <span>{vettedCount}/14</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${vettedCount === 14 ? 'bg-emerald-500' : vettedCount >= 7 ? 'bg-blue-500' : 'bg-amber-500'}`}
                              style={{ width: `${(vettedCount / 14) * 100}%` }} />
                          </div>
                        </div>

                        {c.whatsapp && <div className="text-[10px] text-slate-400 mb-2">📱 {c.whatsapp}</div>}

                        <div className="flex gap-1.5 flex-wrap">
                          <Link href={`/coaches/${c.slug}`} className="btn-outline btn-sm text-[9px]">View</Link>
                          <button onClick={() => openEditCoach(c)} className="btn-outline btn-sm text-[9px]">Edit ✎</button>
                          <button onClick={() => openVetting(c)} className="btn-sm text-[9px] bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-2 py-1 font-semibold">🛡️ Vetting</button>
                          <button onClick={() => toggleCoachActive(c._id, c.isActive)}
                            className={`btn-sm text-[9px] rounded-lg font-semibold px-2 py-1 ${c.isActive ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                            {c.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => generateInviteLink(c._id)}
                            className="btn-sm text-[9px] bg-purple-50 text-purple-600 border border-purple-200 rounded-lg px-2 py-1 font-semibold hover:bg-purple-100 transition-colors">
                            {c.inviteStatus === 'claimed' ? '✅ Claimed' : '🔗 Invite'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!loadingData && filteredCoaches.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center">
                  <div className="text-2xl mb-2">🏅</div>
                  <div className="text-sm text-slate-500 mb-3">{coachSearch ? 'No coaches match your search.' : 'No coaches yet.'}</div>
                  {!coachSearch && <button onClick={openCreateCoach} className="btn-primary text-xs px-4 py-2">+ Add First Coach</button>}
                </div>
              )}

              {/* Coach-Created Programs Awaiting Approval */}
              {!loadingData && (() => {
                const coachPrograms = programs.filter(p => p.createdBy === 'coach' && !p.isActive);
                if (coachPrograms.length === 0) return null;
                return (
                  <div className="mt-6">
                    <h2 className="font-serif text-sm font-bold mb-3">Coach Programs Awaiting Approval ({coachPrograms.length})</h2>
                    <div className="space-y-2">
                      {coachPrograms.map(p => (
                        <div key={p._id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs">{p.categoryId?.icon} {p.name}</div>
                            <div className="text-[10px] text-slate-500">by {p.coachId?.name || '—'} · {p.schedule || 'No schedule'} · {fmt(p.pricePerSession)}/session</div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => openEditProgram(p)} className="btn-outline btn-sm text-[9px]">Review</button>
                            <button onClick={() => toggleProgramActive(p._id, false)}
                              className="btn-sm text-[9px] bg-emerald-500 text-white rounded-lg px-2 py-1 font-semibold hover:bg-emerald-600">Approve</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Coach Applications */}
              {!loadingData && coachApplications.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-serif text-sm font-bold mb-3">Coach Applications ({coachApplications.length})</h2>
                  <div className="space-y-2">
                    {coachApplications.map(app => {
                      let appData = {};
                      try { appData = JSON.parse(app.message || '{}'); } catch {}
                      const cat = categories.find(c => c.slug === appData.categorySlug);
                      return (
                        <div key={app._id} className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm">{app.parentName}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {cat?.icon} {appData.categoryName || appData.categorySlug} · {appData.city || 'abuja'} · {appData.yearsExperience || '?'}y exp
                              </div>
                              <div className="text-[10px] text-slate-500">{app.email} · {app.phone}</div>
                              {appData.title && <div className="text-[10px] text-slate-600 mt-1">{appData.title}</div>}
                              {appData.bio && <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{appData.bio}</div>}
                              {appData.certifications && <div className="text-[10px] text-slate-400 mt-0.5">Certs: {appData.certifications}</div>}
                              <div className="text-[9px] text-slate-300 mt-1">{ago(app.createdAt)}</div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => approveCoachApplication(app)}
                                className="btn-sm text-[9px] bg-emerald-500 text-white rounded-lg px-3 py-1.5 font-semibold hover:bg-emerald-600">Approve</button>
                              <button onClick={() => declineCoachApplication(app._id)}
                                className="btn-sm text-[9px] bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-1.5 font-semibold hover:bg-red-100">Decline</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════ PROGRAMS ════════ */}
          {tab === 'programs' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h1 className="font-serif text-xl">Programs <span className="text-sm font-sans text-slate-400">({programs.length})</span></h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    className="input-field text-xs py-1.5 w-28"
                    value={programCityFilter}
                    onChange={e => setProgramCityFilter(e.target.value)}>
                    <option value="all">All Cities</option>
                    <option value="abuja">🏙️ Abuja</option>
                    <option value="lagos">🌊 Lagos</option>
                  </select>
                  <input
                    className="input-field text-xs py-1.5 w-40"
                    placeholder="Search programs..."
                    value={programSearch}
                    onChange={e => setProgramSearch(e.target.value)}
                  />
                  <button onClick={openCreateProgram} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                    <span className="text-sm leading-none">+</span> Add Program
                  </button>
                </div>
              </div>

              {loadingData ? (
                <p className="text-sm text-slate-400">Loading...</p>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200/80 overflow-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Program</th>
                      <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Coach</th>
                      <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Schedule</th>
                      <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Capacity</th>
                      <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Gender</th>
                      <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Price/Session</th>
                      <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Revenue Pot.</th>
                      <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Actions</th>
                    </tr></thead>
                    <tbody>
                      {filteredPrograms.map(p => {
                        const filled = pct(p.spotsTaken, p.spotsTotal);
                        return (
                          <tr key={p._id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${!p.isActive ? 'opacity-60' : ''}`}>
                            <td className="p-3">
                              <div className="font-semibold">{p.categoryId?.icon} {p.name}</div>
                              <div className="text-[9px] text-slate-400">Ages {p.ageRange} · {p.supervision}</div>
                              {!p.isActive && <span className="badge badge-gray text-[8px] mt-0.5">Inactive</span>}
                            </td>
                            <td className="p-3 text-[11px]">{p.coachId?.name || '—'}</td>
                            <td className="p-3 text-[10px]">
                              {p.schedule || '—'}
                              <br /><span className="text-slate-400">{p.duration ? `${p.duration}min` : ''} {p.sessions ? `· ${p.sessions} sessions` : ''}</span>
                            </td>
                            <td className="p-3">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${filled >= 90 ? 'bg-red-500' : filled >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${filled}%` }} />
                              </div>
                              <span className="text-[9px] text-slate-400">{p.spotsTaken}/{p.spotsTotal} ({filled}%)</span>
                            </td>
                            <td className="p-3">
                              {!p.gender || p.gender === 'any'
                                ? <span className="text-slate-400 text-[9px]">Any</span>
                                : <span className={`badge text-[8px] ${p.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {p.gender === 'female' ? '👧 Girls' : '👦 Boys'}
                                  </span>
                              }
                            </td>
                            <td className="p-3 font-semibold">{fmt(p.pricePerSession)}</td>
                            <td className="p-3 font-semibold text-emerald-700">{fmt(p.pricePerSession * (p.sessions || 1) * p.spotsTotal)}</td>
                            <td className="p-3">
                              <div className="flex gap-1 flex-wrap">
                                <button onClick={() => openEditProgram(p)} className="btn-outline btn-sm text-[9px]">Edit ✎</button>
                                <button onClick={() => toggleProgramActive(p._id, p.isActive)}
                                  className={`btn-sm text-[9px] rounded-lg font-semibold px-2 py-1 ${p.isActive ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                                  {p.isActive ? 'Off' : 'On'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredPrograms.length === 0 && (
                    <div className="p-10 text-center">
                      <div className="text-2xl mb-2">📋</div>
                      <div className="text-sm text-slate-500 mb-3">{programSearch ? 'No programs match your search.' : 'No programs yet.'}</div>
                      {!programSearch && <button onClick={openCreateProgram} className="btn-primary text-xs px-4 py-2">+ Add First Program</button>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════════ TOURNAMENTS ════════ */}
          {tab === 'tournaments' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h1 className="font-serif text-xl">Tournaments <span className="text-sm font-sans text-slate-400">({tournaments.length})</span></h1>
                <button onClick={() => openModal('createTournament', { status: 'upcoming', isActive: true, entryFee: 0 })} className="btn-primary text-xs px-3 py-2">+ New Tournament</button>
              </div>
              <div className="space-y-3">
                {tournaments.map(t => {
                  const cat = t.categoryId || {};
                  const spotsLeft = t.maxTeams ? t.maxTeams - (t.teams?.length || 0) : null;
                  return (
                    <div key={t._id} className="bg-white rounded-xl border border-slate-200/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {cat.icon && <span>{cat.icon}</span>}
                            <div className="font-semibold text-sm">{t.name}</div>
                          </div>
                          <div className="text-[10px] text-slate-400 space-y-0.5">
                            {t.date && <div>📅 {new Date(t.date).toLocaleDateString()}</div>}
                            {t.venue && <div>📍 {t.venue}</div>}
                            <div>👥 {t.teams?.length || 0} teams{t.maxTeams ? ` / ${t.maxTeams}` : ''}{spotsLeft !== null && spotsLeft > 0 ? ` · ${spotsLeft} spots left` : ''}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`badge ${t.status === 'registration' ? 'badge-green' : t.status === 'in-progress' ? 'bg-red-100 text-red-700' : t.status === 'completed' ? 'badge-blue' : 'badge-amber'}`}>
                            {t.status}
                          </span>
                          {t.entryFee === 0 && <span className="text-[8px] text-teal-600 font-semibold">Free</span>}
                          {t.entryFee > 0 && <span className="text-[10px] font-semibold">₦{Number(t.entryFee).toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-3 pt-3 border-t border-slate-50">
                        <button
                          onClick={() => openModal('editTournament', {
                            name: t.name, slug: t.slug || '',
                            categoryId: t.categoryId?._id || t.categoryId || '',
                            type: t.type || 'individual',
                            status: t.status, date: dateStr(t.date),
                            registrationDeadline: dateStr(t.registrationDeadline),
                            venue: t.venue || '', city: t.city || 'abuja',
                            ageRange: t.ageRange || '', maxTeams: t.maxTeams || '',
                            entryFee: t.entryFee ?? 0, prizes: t.prizes || '',
                            description: t.description || '', isActive: t.isActive !== false,
                          }, t._id)}
                          className="btn-outline btn-sm text-[9px]">Edit</button>
                        {t.status !== 'completed' && (
                          <button
                            onClick={() => openModal('tournamentResults', { results: JSON.stringify(t.results || []) }, t._id)}
                            className="btn-sm text-[9px] bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2 py-1 font-semibold">
                            Update Results
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {tournaments.length === 0 && (
                  <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center text-slate-400 text-sm">
                    No tournaments yet. Create one to get started.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════ SHOP ════════ */}
          {tab === 'shop' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Shop</h1>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Starter Kits */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-xs">🎁 Starter Kits ({kits.length})</div>
                    <button onClick={openCreateKit} className="btn-primary text-[10px] px-2.5 py-1">+ Add Kit</button>
                  </div>
                  {kits.length === 0 ? (
                    <div className="py-6 text-center">
                      <div className="text-slate-400 text-[11px] mb-2">No starter kits yet.</div>
                      <button onClick={openCreateKit} className="btn-outline text-[10px] px-3 py-1">+ Create First Kit</button>
                    </div>
                  ) : kits.map(k => (
                    <div key={k._id} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold">{k.icon} {k.name}</div>
                        <div className="text-[9px] text-slate-400">{k.brand || ''} · {k.sold || 0} sold · {k.contents?.length || 0} items</div>
                        <div className="text-[9px] text-emerald-600 font-semibold">
                          Save {fmt(k.individualPrice - k.kitPrice)} ({Math.round(((k.individualPrice - k.kitPrice) / k.individualPrice) * 100)}%)
                        </div>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <div className="text-[11px] font-semibold">{fmt(k.kitPrice)}</div>
                        <div className="text-[9px] text-slate-400 line-through">{fmt(k.individualPrice)}</div>
                        <span className={`badge ${k.inStock ? 'badge-green' : 'badge-gray'} text-[8px]`}>{k.inStock ? 'In stock' : 'Out'}</span>
                        <button onClick={() => openEditKit(k)} className="block text-[9px] text-indigo-600 hover:text-indigo-800 font-semibold mt-0.5">Edit</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Products */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-xs">🛒 Products ({products.length})</div>
                    <button onClick={openCreateProduct} className="btn-primary text-[10px] px-2.5 py-1">+ Add Product</button>
                  </div>
                  {products.length === 0 ? (
                    <div className="py-6 text-center">
                      <div className="text-slate-400 text-[11px] mb-2">No products yet.</div>
                      <button onClick={openCreateProduct} className="btn-outline text-[10px] px-3 py-1">+ Create First Product</button>
                    </div>
                  ) : products.map(p => (
                    <div key={p._id} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold">{p.categoryId?.icon} {p.name}</div>
                        <div className="text-[9px] text-slate-400">{p.brand || ''} · {p.sold || 0} sold</div>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <span className="text-[11px] font-semibold">{fmt(p.price)}</span>
                        <br />
                        <span className={`badge ${p.inStock ? 'badge-green' : 'badge-gray'} text-[8px]`}>{p.inStock ? 'In stock' : 'Out'}</span>
                        <button onClick={() => openEditProduct(p)} className="block text-[9px] text-indigo-600 hover:text-indigo-800 font-semibold mt-0.5">Edit</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Orders */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                  <div className="font-bold text-xs mb-3">📦 Recent Orders ({orders.length})</div>
                  {orders.length > 0 ? orders.slice(0, 10).map(o => (
                    <div key={o._id} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <div className="text-[11px] font-semibold">{o.items?.length} item{o.items?.length !== 1 ? 's' : ''}</div>
                        <div className="text-[9px] text-slate-400">{ago(o.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-semibold">{fmt(o.total)}</div>
                        <span className={`badge ${o.status === 'delivered' ? 'badge-green' : 'badge-amber'}`}>{o.status || 'pending'}</span>
                      </div>
                    </div>
                  )) : <p className="text-[11px] text-slate-400 text-center py-4">No orders yet.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ════════ SCHOOLS ════════ */}
          {tab === 'schools' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h1 className="font-serif text-xl">Schools</h1>
                <div className="flex gap-2">
                  <a href="/schools/apply" target="_blank" rel="noreferrer" className="btn-outline text-[10px] px-2.5 py-1">View Apply Page ↗</a>
                  <button onClick={() => openModal('createSchool', { city: 'abuja', status: 'approved', defaultMarkupPercent: 15 })} className="btn-primary text-[10px] px-2.5 py-1">+ Add School</button>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 mb-4 border-b border-slate-200">
                {[
                  { id: 'pending', label: `New Partnerships (${schools.filter(s => s.status === 'pending').length})` },
                  { id: 'approved', label: `Active (${schools.filter(s => s.status === 'approved').length})` },
                  { id: 'all', label: `All (${schools.length})` },
                ].map(st => (
                  <button key={st.id} onClick={() => setSchoolTab(st.id)}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-t-lg -mb-px transition-colors ${
                      schoolTab === st.id ? 'bg-white border border-b-white border-slate-200 text-teal-primary' : 'text-slate-400 hover:text-slate-600'
                    }`}>{st.label}</button>
                ))}
              </div>

              {(() => {
                const filtered = schools.filter(s =>
                  schoolTab === 'all' ? true :
                  schoolTab === 'pending' ? s.status === 'pending' :
                  s.status === 'approved'
                );
                if (filtered.length === 0) return (
                  <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center text-slate-400 text-sm">
                    No {schoolTab === 'all' ? '' : schoolTab} schools.
                  </div>
                );
                return (
                  <div className="space-y-4">
                    {filtered.map(sch => (
                      <div key={sch._id} className="bg-white rounded-xl border border-slate-200/80 p-5">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <div className="font-bold text-sm">{sch.name}</div>
                              <span className={`badge ${sch.status === 'approved' ? 'badge-green' : sch.status === 'rejected' ? 'badge-red' : 'badge-amber'} text-[9px]`}>
                                {sch.status === 'pending' ? 'Setting up' : sch.status === 'approved' ? 'Active' : sch.status === 'rejected' ? 'Paused' : sch.status}
                              </span>
                              {sch.schoolType && <span className="badge badge-gray text-[9px]">{sch.schoolType}</span>}
                            </div>
                            <div className="text-[10px] text-slate-500 mb-2">
                              📍 {sch.area || '—'}{sch.address ? ` · ${sch.address}` : ''}
                              {sch.estimatedStudents ? ` · ~${sch.estimatedStudents} students` : ''}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[10px]">
                              {sch.contactName && <div><span className="text-slate-400">Contact:</span> <strong>{sch.contactName}</strong>{sch.contactRole ? ` (${sch.contactRole})` : ''}</div>}
                              {sch.phone && <div><span className="text-slate-400">Phone:</span> <strong>{sch.phone}</strong></div>}
                              {sch.email && <div><span className="text-slate-400">Email:</span> <strong>{sch.email}</strong></div>}
                              {sch.activeStudents > 0 && <div><span className="text-slate-400">Enrolled:</span> <strong>{sch.activeStudents} students</strong></div>}
                              {sch.applicationDate && <div><span className="text-slate-400">Applied:</span> {new Date(sch.applicationDate).toLocaleDateString()}</div>}
                              {sch.defaultMarkupPercent !== undefined && <div><span className="text-slate-400">Markup:</span> <strong>{sch.defaultMarkupPercent}%</strong></div>}
                              {sch.totalEarnings > 0 && <div><span className="text-slate-400">Total Earned:</span> <strong className="text-teal-primary">{fmt(sch.totalEarnings)}</strong></div>}
                              {sch.pendingPayout > 0 && <div><span className="text-slate-400">Pending Payout:</span> <strong className="text-amber-600">{fmt(sch.pendingPayout)}</strong></div>}
                            </div>
                            {sch.interestedCategories?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {sch.interestedCategories.map(c => (
                                  <span key={c._id || c} className="badge badge-blue text-[8px]">{c.icon} {c.name}</span>
                                ))}
                              </div>
                            )}
                            {sch.facilities?.length > 0 && (
                              <div className="text-[9px] text-slate-400 mt-1">
                                Facilities: {sch.facilities.join(', ')}
                              </div>
                            )}
                            {sch.notes && <div className="text-[10px] text-slate-500 mt-1 italic">&ldquo;{sch.notes}&rdquo;</div>}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 shrink-0">
                            {sch.phone && (
                              <a href={`https://wa.me/${sch.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${sch.contactName || 'there'}, this is SkillPadi regarding your school application for ${sch.name}.`)}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-[10px] font-semibold rounded-lg hover:bg-green-600 transition-colors">
                                💬 WhatsApp
                              </a>
                            )}
                            {sch.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => approveSchool(sch._id)}
                                  disabled={approvingSchool === sch._id + '_approving'}
                                  className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-60 transition-colors">
                                  {approvingSchool === sch._id + '_approving' ? '…' : '✓ Activate'}
                                </button>
                                <div className="flex gap-1">
                                  <input
                                    className="input-field text-[10px] px-2 py-1 w-28"
                                    placeholder="Reason (opt.)"
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                  />
                                  <button
                                    onClick={() => rejectSchool(sch._id)}
                                    disabled={approvingSchool === sch._id + '_rejecting'}
                                    className="px-2.5 py-1 bg-slate-400 text-white text-[10px] font-semibold rounded-lg hover:bg-slate-500 disabled:opacity-60 transition-colors">
                                    {approvingSchool === sch._id + '_rejecting' ? '…' : 'Not Now'}
                                  </button>
                                </div>
                              </>
                            )}
                            {sch.status === 'approved' && sch.pendingPayout > 0 && (
                              <button
                                onClick={() => processSchoolPayout(sch._id, sch.name, sch.pendingPayout)}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-lg hover:bg-emerald-100 transition-colors">
                                💳 Process Payout ({fmt(sch.pendingPayout)})
                              </button>
                            )}
                            {sch.status === 'approved' && (
                              <button
                                onClick={async () => {
                                  await authFetch(`/api/schools/${sch._id}`, { method: 'PUT', body: JSON.stringify({ status: 'suspended', isActive: false }) });
                                  toast.success('School suspended');
                                  const r = await authFetch('/api/schools');
                                  if (r.ok) setSchools((await r.json()).schools || []);
                                }}
                                className="px-3 py-1.5 bg-slate-200 text-slate-600 text-[10px] font-semibold rounded-lg hover:bg-slate-300 transition-colors">
                                Suspend
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ════════ ESTATES / COMMUNITIES ════════ */}
          {tab === 'communities' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h1 className="font-serif text-xl">Estates & Communities</h1>
                <div className="flex gap-2">
                  <a href="/communities/apply" target="_blank" rel="noreferrer" className="btn-outline text-[10px] px-2.5 py-1">View Apply Page ↗</a>
                  <button onClick={() => openModal('createCommunity', { city: 'abuja', type: 'estate', venueProvided: true, defaultMarkupPercent: 10 })} className="btn-primary text-[10px] px-2.5 py-1">+ Add Estate</button>
                </div>
              </div>

              <div className="flex gap-1 mb-4 border-b border-slate-200">
                {[
                  { id: 'pending', label: `New Partnerships (${communities.filter(c => c.status === 'pending').length})` },
                  { id: 'approved', label: `Active (${communities.filter(c => c.status === 'approved').length})` },
                  { id: 'all', label: `All (${communities.length})` },
                ].map(st => (
                  <button key={st.id} onClick={() => setCommunityTab(st.id)}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-t-lg -mb-px transition-colors ${
                      communityTab === st.id ? 'bg-white border border-b-white border-slate-200 text-teal-primary' : 'text-slate-400 hover:text-slate-600'
                    }`}>{st.label}</button>
                ))}
              </div>

              {(() => {
                const filtered = communities.filter(c =>
                  communityTab === 'all' ? true :
                  communityTab === 'pending' ? c.status === 'pending' :
                  c.status === 'approved'
                );
                if (filtered.length === 0) return (
                  <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center text-slate-400 text-sm">
                    No {communityTab === 'all' ? '' : communityTab} estates found.
                  </div>
                );
                return (
                  <div className="space-y-4">
                    {filtered.map(com => (
                      <div key={com._id} className="bg-white rounded-xl border border-slate-200/80 p-5">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <div className="font-bold text-sm">{com.name}</div>
                              <span className={`badge ${com.status === 'approved' ? 'badge-green' : com.status === 'rejected' ? 'badge-red' : 'badge-amber'} text-[9px]`}>
                                {com.status === 'pending' ? 'Setting up' : com.status === 'approved' ? 'Active' : com.status}
                              </span>
                              {com.type && <span className="badge badge-gray text-[9px]">{com.type}</span>}
                              {com.venueProvided && <span className="badge badge-blue text-[9px]">🏟️ Venue</span>}
                            </div>
                            <div className="text-[10px] text-slate-500 mb-2">
                              📍 {com.area || '—'}{com.city ? `, ${com.city}` : ''}
                              {com.estimatedHouseholds ? ` · ~${com.estimatedHouseholds} households` : ''}
                              {com.estimatedKids ? ` · ~${com.estimatedKids} kids` : ''}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[10px]">
                              {com.contactName && <div><span className="text-slate-400">Contact:</span> <strong>{com.contactName}</strong></div>}
                              {com.phone && <div><span className="text-slate-400">Phone:</span> <strong>{com.phone}</strong></div>}
                              {com.activeResidents > 0 && <div><span className="text-slate-400">Residents:</span> <strong>{com.activeResidents}</strong></div>}
                              {com.defaultMarkupPercent !== undefined && <div><span className="text-slate-400">Markup:</span> <strong>{com.defaultMarkupPercent}%</strong></div>}
                              {com.totalEarnings > 0 && <div><span className="text-slate-400">Earned:</span> <strong className="text-teal-primary">{fmt(com.totalEarnings)}</strong></div>}
                              {com.pendingPayout > 0 && <div><span className="text-slate-400">Payout due:</span> <strong className="text-amber-600">{fmt(com.pendingPayout)}</strong></div>}
                            </div>
                            {com.facilities?.length > 0 && (
                              <div className="text-[9px] text-slate-400 mt-1.5">
                                Facilities: {(com.facilities || []).map(f => typeof f === 'string' ? f : f.type).join(', ')}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 shrink-0">
                            {com.phone && (
                              <a href={`https://wa.me/${com.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${com.contactName || 'there'}, this is SkillPadi regarding your estate partnership for ${com.name}.`)}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-[10px] font-semibold rounded-lg hover:bg-green-600 transition-colors">
                                💬 WhatsApp
                              </a>
                            )}
                            {com.status === 'pending' && (
                              <>
                                <button onClick={() => approveCommunity(com._id)}
                                  disabled={approvingCommunity === com._id + '_approving'}
                                  className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-60 transition-colors">
                                  {approvingCommunity === com._id + '_approving' ? '…' : '✓ Activate'}
                                </button>
                                <div className="flex gap-1">
                                  <input className="input-field text-[10px] px-2 py-1 w-28" placeholder="Reason (opt.)"
                                    value={communityRejectReason} onChange={e => setCommunityRejectReason(e.target.value)} />
                                  <button onClick={() => rejectCommunity(com._id)}
                                    disabled={approvingCommunity === com._id + '_rejecting'}
                                    className="px-2.5 py-1 bg-slate-400 text-white text-[10px] font-semibold rounded-lg hover:bg-slate-500 disabled:opacity-60 transition-colors">
                                    {approvingCommunity === com._id + '_rejecting' ? '…' : 'Not Now'}
                                  </button>
                                </div>
                              </>
                            )}
                            {com.status === 'approved' && com.pendingPayout > 0 && (
                              <button onClick={() => processCommunityPayout(com._id, com.name, com.pendingPayout)}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-lg hover:bg-emerald-100 transition-colors">
                                💳 Pay {fmt(com.pendingPayout)}
                              </button>
                            )}
                            {com.status === 'approved' && (
                              <button onClick={async () => {
                                await authFetch(`/api/communities/${com._id}`, { method: 'PUT', body: JSON.stringify({ status: 'suspended', isActive: false }) });
                                toast.success('Estate suspended');
                                const r = await authFetch('/api/communities');
                                if (r.ok) setCommunities((await r.json()).communities || []);
                              }} className="px-3 py-1.5 bg-slate-200 text-slate-600 text-[10px] font-semibold rounded-lg hover:bg-slate-300 transition-colors">Suspend</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ════════ SPONSORS ════════ */}
          {tab === 'sponsors' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg">Brand Sponsors & Partners</h2>
                <button onClick={() => openModal('createSponsor', { active: true, type: 'general' })} className="btn-primary text-xs px-3 py-2">+ New Sponsor</button>
              </div>
              {sponsors.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">No sponsors yet. Add your first brand partner.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sponsors.map(sp => (
                    <div key={sp._id} className="bg-white rounded-xl border border-slate-200/80 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-bold text-sm">{sp.name}</div>
                          {sp.tagline && <div className="text-[10px] text-slate-400 mt-0.5">{sp.tagline}</div>}
                        </div>
                        <span className={`badge text-[9px] ${sp.active ? 'badge-green' : 'badge-amber'}`}>{sp.active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 space-y-0.5 mb-3">
                        <div className="capitalize">Type: {sp.type}</div>
                        {sp.contactName && <div>Contact: {sp.contactName}</div>}
                        {sp.contactEmail && <div>{sp.contactEmail}</div>}
                        {sp.website && <a href={sp.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline block">{sp.website}</a>}
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button onClick={() => openModal('editSponsor', { ...sp, sponsorId: sp._id }, sp._id)} className="btn-outline text-[10px] px-2 py-1">Edit</button>
                        <button onClick={() => deleteSponsor(sp._id)} className="text-[10px] text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:border-red-400 transition-colors">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════ IMPACT ════════ */}
          {tab === 'impact' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h1 className="font-serif text-xl">Impact Programmes</h1>
                <button onClick={loadImpactData} className="btn-outline text-[10px] px-2.5 py-1">↻ Refresh</button>
              </div>

              {/* Impact stats */}
              {impactStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {[
                    { l: 'Total Programmes', v: impactStats.totalPrograms || 0, icon: '📋' },
                    { l: 'Children Enrolled', v: impactStats.totalChildren || 0, icon: '👧' },
                    { l: 'Total Donations', v: fmt(impactStats.totalDonations || 0), icon: '💚' },
                    { l: 'Funding Progress', v: `${impactStats.avgFundingPercent || 0}%`, icon: '📊' },
                  ].map(s => (
                    <div key={s.l} className="bg-white rounded-xl border border-slate-200/80 p-4">
                      <div className="text-[9px] uppercase font-bold text-slate-400">{s.icon} {s.l}</div>
                      <div className="font-serif text-xl mt-1">{s.v}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Impact sub-tabs */}
              <div className="flex gap-1 mb-4 border-b border-slate-200">
                {[
                  { id: 'proposals', label: 'Proposals' },
                  { id: 'programmes', label: 'Programmes' },
                  { id: 'children', label: 'Children' },
                  { id: 'donations', label: 'Donations' },
                ].map(st => (
                  <button key={st.id} onClick={() => setImpactTab(st.id)}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-t-lg -mb-px transition-colors ${
                      impactTab === st.id ? 'bg-white border border-b-white border-slate-200 text-teal-primary' : 'text-slate-400 hover:text-slate-600'
                    }`}>{st.label}</button>
                ))}
              </div>

              {impactLoading ? <p className="text-sm text-slate-400">Loading impact data...</p> : (
                <>
                  {/* PROPOSALS */}
                  {impactTab === 'proposals' && (() => {
                    const proposals = impactPrograms.filter(p => p.status === 'proposed');
                    return proposals.length === 0 ? (
                      <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center text-slate-400 text-sm">No pending proposals.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {proposals.map(prog => (
                          <div key={prog._id} className="bg-white rounded-xl border border-slate-200/80 p-5">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <div className="font-bold text-sm">{prog.name}</div>
                                <div className="text-[10px] text-slate-400">{prog.categoryId?.icon} {prog.categoryId?.name} · {prog.city || 'abuja'}</div>
                              </div>
                              <span className="badge badge-amber text-[9px]">Proposed</span>
                            </div>
                            {prog.description && <p className="text-[11px] text-slate-500 mb-3">{prog.description}</p>}
                            <div className="text-[10px] text-slate-500 space-y-0.5 mb-3">
                              {prog.targetChildren && <div>Target: {prog.targetChildren} children</div>}
                              {prog.fundingGoal && <div>Funding goal: {fmt(prog.fundingGoal)}</div>}
                              {prog.coachId?.name && <div>Coach: {prog.coachId.name}</div>}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => updateImpactProgram(prog._id, { status: 'funding' })}
                                className="btn-primary text-[10px] px-3 py-1.5 flex-1">Approve → Funding</button>
                              <button onClick={() => updateImpactProgram(prog._id, { status: 'paused' })}
                                className="btn-outline text-[10px] px-3 py-1.5">Decline</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* PROGRAMMES */}
                  {impactTab === 'programmes' && (
                    <div className="space-y-3">
                      {impactPrograms.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center text-slate-400 text-sm">No impact programmes yet.</div>
                      ) : impactPrograms.map(prog => {
                        const fundPct = prog.fundingGoal ? Math.min(100, Math.round(((prog.fundingRaised || 0) / prog.fundingGoal) * 100)) : 0;
                        return (
                          <div key={prog._id} className="bg-white rounded-xl border border-slate-200/80 p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <div className="font-bold text-sm">{prog.name}</div>
                                  <span className={`badge text-[9px] ${
                                    prog.status === 'active' ? 'badge-green' :
                                    prog.status === 'funding' ? 'badge-blue' :
                                    prog.status === 'proposed' ? 'badge-amber' :
                                    prog.status === 'completed' ? 'badge-gray' : 'badge-red'
                                  }`}>{prog.status}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mb-2">
                                  {prog.categoryId?.icon} {prog.categoryId?.name} · {prog.enrollmentCount || 0} enrolled
                                  {prog.targetChildren ? ` / ${prog.targetChildren} target` : ''}
                                </div>
                                {prog.fundingGoal > 0 && (
                                  <div className="mb-2">
                                    <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                                      <span>Funding: {fmt(prog.fundingRaised || 0)} / {fmt(prog.fundingGoal)}</span>
                                      <span>{fundPct}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${fundPct >= 100 ? 'bg-emerald-500' : fundPct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                        style={{ width: `${fundPct}%` }} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* CHILDREN */}
                  {impactTab === 'children' && (
                    <div className="space-y-4">
                      {impactPrograms.filter(p => (p.children || p.enrollments || []).length > 0).length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center text-slate-400 text-sm">No children enrolled in impact programmes yet.</div>
                      ) : impactPrograms.filter(p => (p.children || p.enrollments || []).length > 0).map(prog => (
                        <div key={prog._id} className="bg-white rounded-xl border border-slate-200/80 p-4">
                          <div className="font-bold text-xs mb-2">{prog.categoryId?.icon} {prog.name}</div>
                          <div className="space-y-1">
                            {(prog.children || prog.enrollments || []).map((child, i) => (
                              <div key={i} className="flex items-center gap-2 text-[11px] py-1 border-b border-slate-50 last:border-0">
                                <span className="font-semibold">{child.childName || child.name}</span>
                                {child.age && <span className="text-slate-400">{child.age} yrs</span>}
                                {child.parentName && <span className="text-slate-400 ml-auto">{child.parentName}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* DONATIONS */}
                  {impactTab === 'donations' && (
                    <div className="bg-white rounded-xl border border-slate-200/80 overflow-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Donor</th>
                          <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Programme</th>
                          <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Amount</th>
                          <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Status</th>
                          <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Date</th>
                        </tr></thead>
                        <tbody>
                          {(impactStats?.donations || []).map((d, i) => (
                            <tr key={d._id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="p-3 font-semibold">{d.donorName || d.donor?.name || 'Anonymous'}</td>
                              <td className="p-3 text-[10px]">{d.programName || d.program?.name || '—'}</td>
                              <td className="p-3 font-semibold text-emerald-700">{fmt(d.amount)}</td>
                              <td className="p-3"><span className={`badge ${d.status === 'success' ? 'badge-green' : d.status === 'pending' ? 'badge-amber' : 'badge-red'}`}>{d.status || 'success'}</span></td>
                              <td className="p-3 text-[10px] text-slate-400">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(!impactStats?.donations || impactStats.donations.length === 0) && (
                        <div className="p-8 text-center text-slate-400 text-sm">No donations recorded yet.</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ════════ REVENUE ════════ */}
          {tab === 'revenue' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Revenue</h1>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { l: 'Gross Revenue', v: fmt(rev.total || ov.totalRevenue || 0), color: 'text-emerald-700' },
                  { l: 'VAT Collected', v: fmt(rev.tax || ov.totalTax || 0) },
                  { l: 'Transactions', v: rev.payments || payments.length },
                  { l: 'Conversion', v: `${ov.conversionRate || 0}%`, sub: 'enquiry → enrolled' },
                ].map(s => (
                  <div key={s.l} className="bg-white rounded-xl border border-slate-200/80 p-4">
                    <div className="text-[9px] uppercase font-bold text-slate-400">{s.l}</div>
                    <div className={`font-serif text-xl mt-1 ${s.color || ''}`}>{s.v}</div>
                    {s.sub && <div className="text-[9px] text-slate-400">{s.sub}</div>}
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                <div className="font-bold text-xs mb-3">Transaction History</div>
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-100">
                      <th className="text-left p-2 text-[9px] uppercase font-bold text-slate-400">Reference</th>
                      <th className="text-left p-2 text-[9px] uppercase font-bold text-slate-400">Description</th>
                      <th className="text-left p-2 text-[9px] uppercase font-bold text-slate-400">Amount</th>
                      <th className="text-left p-2 text-[9px] uppercase font-bold text-slate-400">Channel</th>
                      <th className="text-left p-2 text-[9px] uppercase font-bold text-slate-400">Status</th>
                      <th className="text-left p-2 text-[9px] uppercase font-bold text-slate-400">Date</th>
                    </tr></thead>
                    <tbody>
                      {payments.slice(0, 50).map(p => (
                        <tr key={p._id} className="border-b border-slate-50">
                          <td className="p-2 text-[10px] font-mono text-slate-400">{p.reference?.slice(0, 15)}…</td>
                          <td className="p-2">{p.description}</td>
                          <td className="p-2 font-semibold">{fmt(p.totalAmount)}</td>
                          <td className="p-2 text-slate-400">{p.channel || '—'}</td>
                          <td className="p-2"><span className={`badge ${p.status === 'success' ? 'badge-green' : p.status === 'pending' ? 'badge-amber' : 'badge-red'}`}>{p.status}</span></td>
                          <td className="p-2 text-[10px] text-slate-400">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ago(p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {payments.length === 0 && <p className="text-[11px] text-slate-400 text-center py-4">No payments yet.</p>}
              </div>
            </div>
          )}

          {/* ════════ SETTINGS ════════ */}
          {tab === 'settings' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Settings</h1>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200/80 p-5">
                  <div className="font-bold text-xs mb-3">💰 Pricing</div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Membership Fee</span><span className="font-semibold">₦15,000 (one-time)</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">VAT Rate</span><span className="font-semibold">7.5%</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Insurance/Session</span><span className="font-semibold">₦500</span></div>
                    <div className="flex justify-between py-1.5"><span className="text-slate-500">Insurance/Term</span><span className="font-semibold">₦3,000</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-5">
                  <div className="font-bold text-xs mb-3">🔗 Integrations</div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">MongoDB</span><span className="badge badge-green">Connected</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Firebase Auth</span><span className="badge badge-green">Active</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Paystack</span><span className="badge badge-green">Configured</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">WhatsApp</span><span className={`badge ${process.env.NEXT_PUBLIC_WA_BUSINESS ? 'badge-green' : 'badge-amber'}`}>{process.env.NEXT_PUBLIC_WA_BUSINESS ? 'Configured' : 'Not Set'}</span></div>
                    <div className="flex justify-between py-1.5"><span className="text-slate-500">Sanity Blog</span><span className={`badge ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ? 'badge-green' : 'badge-amber'}`}>{process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ? 'Connected' : 'Not Set'}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-5">
                  <div className="font-bold text-xs mb-3">📊 Platform Info</div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Admin Email</span><span className="font-semibold">{dbUser?.email}</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Total Parents</span><span className="font-semibold">{ov.totalParents || 0}</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Total Programs</span><span className="font-semibold">{ov.totalPrograms || 0}</span></div>
                    <div className="flex justify-between py-1.5"><span className="text-slate-500">Schools</span><span className="font-semibold">{ov.schools || 0}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-5">
                  <div className="font-bold text-xs mb-3">🏷️ Categories & Sponsors</div>
                  <div className="space-y-2 text-[11px]">
                    {stats?.categories?.map(c => (
                      <div key={c._id} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                        <span>{c.icon} {c.name}</span>
                        <span className="text-slate-400">{c.sponsorId?.name || 'No sponsor'} · {c.programCount || 0} programs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
