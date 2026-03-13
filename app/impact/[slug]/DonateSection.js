'use client';

import { useState } from 'react';
import { toast } from 'sonner';

const fmt = (n) => `\u20A6${Number(n).toLocaleString()}`;
const QUICK_AMOUNTS = [2000, 5000, 10000, 25000, 50000];

export default function DonateSection({ programId, programName }) {
  const [amount, setAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleDonate = async () => {
    const amt = Number(amount);
    if (!amt || amt < 1000) {
      toast.error('Minimum donation is \u20A61,000');
      return;
    }
    if (!isAnonymous && !donorName.trim()) {
      toast.error('Please enter your name or check "Donate anonymously"');
      return;
    }
    if (!donorEmail.trim()) {
      toast.error('Email is required for payment receipt');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/impact/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          programId,
          donorName: isAnonymous ? 'Anonymous' : donorName.trim(),
          donorEmail: donorEmail.trim(),
          donorPhone: donorPhone.trim() || undefined,
          isAnonymous,
          message: message.trim() || undefined,
          type: 'individual',
        }),
      });

      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error || 'Failed to initialize payment');
      }
    } catch (err) {
      toast.error('Payment error: ' + err.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="card p-5 mb-6" id="donate">
      <h2 className="font-bold text-sm mb-1">Support This Programme</h2>
      <p className="text-[11px] text-slate-500 mb-4">Every contribution helps a child access free coaching.</p>

      {/* Quick amount buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_AMOUNTS.map(q => (
          <button
            key={q}
            onClick={() => { setAmount(String(q)); setShowForm(true); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
              Number(amount) === q
                ? 'bg-teal-primary text-white border-teal-primary'
                : 'bg-white text-slate-600 border-slate-200 hover:border-teal-primary/50'
            }`}
          >
            {fmt(q)}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Or enter custom amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{'\u20A6'}</span>
          <input
            type="number"
            className="input-field text-sm w-full pl-7"
            placeholder="5,000"
            min={1000}
            value={amount}
            onChange={e => { setAmount(e.target.value); setShowForm(true); }}
          />
        </div>
      </div>

      {/* Expanded form */}
      {showForm && Number(amount) >= 1000 && (
        <div className="space-y-3 mb-4 animate-fade-in">
          {/* Anonymous toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-xs text-slate-600">Donate anonymously</span>
          </label>

          {!isAnonymous && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Your Name *</label>
              <input
                className="input-field text-sm w-full"
                placeholder="e.g. Ada Okafor"
                value={donorName}
                onChange={e => setDonorName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Email *</label>
            <input
              type="email"
              className="input-field text-sm w-full"
              placeholder="you@example.com"
              value={donorEmail}
              onChange={e => setDonorEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-600 mb-1">
              Phone <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              className="input-field text-sm w-full"
              placeholder="08012345678"
              value={donorPhone}
              onChange={e => setDonorPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-600 mb-1">
              Message <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="input-field text-sm w-full"
              rows={2}
              placeholder="Leave an encouraging message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>
      )}

      {/* Donate button */}
      <button
        onClick={handleDonate}
        disabled={submitting || !amount || Number(amount) < 1000}
        className="w-full py-3 bg-teal-primary text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? 'Processing...'
          : Number(amount) >= 1000
            ? `Donate ${fmt(Number(amount))}`
            : 'Select or enter amount'
        }
      </button>

      <p className="text-[9px] text-slate-400 text-center mt-2">
        Payments processed securely via Paystack. You will receive a receipt by email.
      </p>
    </div>
  );
}
