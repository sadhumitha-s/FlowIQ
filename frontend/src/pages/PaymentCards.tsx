import { useState, useEffect } from 'react';
import { SectionHeader } from '../components/ui';
import axios from 'axios';

type PaymentCard = {
  id: string;
  brand?: string;
  last4?: string;
  expiry?: string;
  spending_limit?: number;
};

export default function PaymentCards() {
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:8000/api/v1/user/payment-cards', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setCards(res.data as PaymentCard[])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <SectionHeader title="Payment Cards" sub="Manage your connected corporate cards" />
        <button className="px-4 py-2 bg-figma-yellow text-slate-900 font-bold rounded-xl text-sm">+ Add Card</button>
      </div>

      {loading ? <p className="text-slate-500">Loading cards...</p> : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {cards.length === 0 && <p className="text-slate-500 col-span-3">No cards found.</p>}
          {cards.map((card) => (
            <div key={card.id} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl relative overflow-hidden text-white">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
              <div className="flex justify-between items-start mb-8">
                <span className="font-bold tracking-widest uppercase">{card.brand || 'Card'}</span>
                <span className="text-xl">💳</span>
              </div>
              <div className="font-mono text-xl tracking-[0.2em] mb-4 text-slate-200">
                •••• •••• •••• <span className="text-white font-bold">{card.last4 || '0000'}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                <span>Exp: {card.expiry || '12/28'}</span>
                <span>LIMIT: ₹{(card.spending_limit || 0).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
