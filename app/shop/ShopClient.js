'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const VAT_RATE = 0.075;

export function ShopClient({ categories, products, kits }) {
  const { isAuthenticated, authFetch } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('kits');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [paying, setPaying] = useState(false);

  const fk = filter === 'all' ? kits : kits.filter((k) => k.categoryId?._id === filter);
  const fp = filter === 'all' ? products : products.filter((p) => p.categoryId?._id === filter || !p.categoryId);

  const addToCart = (item, type) => {
    const existing = cart.find((c) => c.id === item._id);
    if (existing) {
      setCart(cart.map((c) => c.id === item._id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { id: item._id, name: item.name, price: type === 'kit' ? item.kitPrice : item.price, qty: 1, type, icon: item.icon }]);
    }
    toast.success(`${item.name} added to cart`);
    setShowCart(true);
  };

  const removeFromCart = (id) => setCart(cart.filter((c) => c.id !== id));
  const updateQty = (id, qty) => {
    if (qty <= 0) return removeFromCart(id);
    setCart(cart.map((c) => c.id === id ? { ...c, qty } : c));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const vat = Math.round(subtotal * VAT_RATE);
  const total = subtotal + vat;
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      router.push('/auth/signup?redirect=/shop');
      return;
    }
    if (cart.length === 0) return;

    setPaying(true);
    try {
      const res = await authFetch('/api/payments/initialize', {
        method: 'POST',
        body: JSON.stringify({
          type: 'product',
          amount: subtotal,
          description: cart.map((c) => `${c.name} ×${c.qty}`).join(', '),
        }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error || 'Payment failed');
      }
    } catch {
      toast.error('Something went wrong');
    }
    setPaying(false);
  };

  return (
    <div className="pt-20 pb-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-serif text-2xl">Shop</h1>
          <button onClick={() => setShowCart(!showCart)} className="relative btn-outline btn-sm">
            🛒 Cart
            {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-teal-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>}
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Starter kits & equipment. Everything delivered at session one.</p>

        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          <button onClick={() => setFilter('all')} className={`btn-sm rounded-full text-[11px] font-semibold px-3 py-1 border ${filter === 'all' ? 'bg-teal-primary text-white border-teal-primary' : 'bg-white text-slate-500 border-slate-200'}`}>All</button>
          {categories.map((c) => (
            <button key={c._id} onClick={() => setFilter(c._id)} className={`btn-sm rounded-full text-[11px] font-semibold px-3 py-1 border ${filter === c._id ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200'}`} style={filter === c._id ? { background: c.color } : {}}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200 mb-4">
          {[{ id: 'kits', l: '🎁 Starter Kits' }, { id: 'products', l: '🛒 Items' }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`text-xs font-semibold pb-2 border-b-2 ${tab === t.id ? 'text-teal-primary border-teal-primary' : 'text-slate-400 border-transparent'}`}>
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'kits' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fk.map((kit) => {
              const cat = kit.categoryId;
              const savePct = Math.round(((kit.individualPrice - kit.kitPrice) / kit.individualPrice) * 100);
              const inCart = cart.find((c) => c.id === kit._id);
              return (
                <div key={kit._id} className="card animate-fade-in">
                  <div className="px-3.5 py-2.5 flex items-center justify-between" style={{ background: `${cat?.color}06` }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{kit.icon}</span>
                      <div>
                        <div className="font-serif text-sm">{kit.name}</div>
                        <div className="text-[9px] font-semibold" style={{ color: cat?.color }}>{cat?.icon} {cat?.name}</div>
                      </div>
                    </div>
                    <span className="badge badge-green">Save {savePct}%</span>
                  </div>
                  <div className="p-3.5">
                    {kit.brand && <div className="text-[9px] text-slate-400 mb-1.5">🏷️ Featuring {kit.brand}</div>}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {kit.contents.map((c, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-[9px]">{c}</span>)}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 line-through">{fmt(kit.individualPrice)}</span>
                        <div className="font-serif text-lg">{fmt(kit.kitPrice)}</div>
                      </div>
                      {inCart ? (
                        <span className="badge badge-green">✓ In Cart</span>
                      ) : (
                        <button onClick={() => addToCart(kit, 'kit')} className="btn-primary btn-sm">Add to Cart</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {fk.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-8">No kits in this category.</p>}
          </div>
        )}

        {tab === 'products' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {fp.map((prod) => {
              const cat = prod.categoryId;
              const inCart = cart.find((c) => c.id === prod._id);
              return (
                <div key={prod._id} className="card p-3 animate-fade-in">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base mb-1.5" style={{ background: cat ? `${cat.color}10` : '#f1f5f9' }}>{cat?.icon || '🛍️'}</div>
                  <div className="font-semibold text-xs">{prod.name}</div>
                  {prod.brand && <div className="text-[9px] text-slate-400">{prod.brand}</div>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-serif text-base">{fmt(prod.price)}</span>
                    {inCart ? (
                      <span className="badge badge-green text-[8px]">✓ In Cart</span>
                    ) : (
                      <button onClick={() => addToCart(prod, 'product')} className="btn-primary btn-sm text-[10px] px-2 py-1">Add</button>
                    )}
                  </div>
                </div>
              );
            })}
            {fp.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-8">No products in this category.</p>}
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]" onClick={() => setShowCart(false)}>
          <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
              <div className="font-serif text-lg">Cart ({cartCount})</div>
              <button onClick={() => setShowCart(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-12">Your cart is empty</div>
              ) : cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-slate-50">
                  <div className="text-xl">{item.icon || '🛍️'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-400">{fmt(item.price)} each</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 rounded border border-slate-200 text-xs flex items-center justify-center hover:bg-slate-50">−</button>
                    <span className="text-xs font-semibold w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 rounded border border-slate-200 text-xs flex items-center justify-center hover:bg-slate-50">+</button>
                  </div>
                  <div className="font-semibold text-xs w-16 text-right">{fmt(item.price * item.qty)}</div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-200 p-5 space-y-2">
                <div className="flex justify-between text-xs"><span className="text-slate-500">Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">VAT (7.5%)</span><span>{fmt(vat)}</span></div>
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-100"><span>Total</span><span className="text-teal-primary font-serif text-lg">{fmt(total)}</span></div>
                <button onClick={handleCheckout} disabled={paying} className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50">
                  {paying ? 'Redirecting...' : `Pay ${fmt(total)} →`}
                </button>
                <p className="text-[9px] text-center text-slate-400">Secure payment via Paystack</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
