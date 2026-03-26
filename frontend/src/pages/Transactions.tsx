import { useState, useEffect } from 'react';
import { SectionHeader, fmt } from '../components/ui';
import axios from 'axios';

type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  counterparty?: string;
  date: string;
};

export default function Transactions() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ amount: '', type: 'expense', counterparty: '' });

  const fetchTxs = () => {
    setLoading(true);
    axios.get('http://localhost:8000/api/v1/core/transactions', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setTxs(res.data as Transaction[])).finally(() => setLoading(false));
  };

  useEffect(() => {
    axios.get('http://localhost:8000/api/v1/core/transactions', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setTxs(res.data as Transaction[])).finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post('http://localhost:8000/api/v1/core/transactions', {
      amount: Number(form.amount),
      type: form.type,
      counterparty: form.counterparty,
      date: new Date().toISOString().split('T')[0]
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    setIsAdding(false);
    fetchTxs();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <SectionHeader title="Transactions" sub="Your historical cash flow activity" />
        <button onClick={() => setIsAdding(!isAdding)} className="px-4 py-2 bg-figma-yellow text-slate-900 font-bold rounded-xl text-sm">
          {isAdding ? 'Cancel' : '+ Add Transaction'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-figma-card p-5 rounded-2xl border border-slate-800 space-y-4 max-w-lg">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Amount</label>
              <input type="number" required value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Type</label>
              <select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Counterparty</label>
            <input type="text" required value={form.counterparty} onChange={e=>setForm({...form, counterparty: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
          </div>
          <button type="submit" className="px-4 py-2 bg-figma-coral text-white font-bold rounded-xl text-sm w-full">Save Transaction</button>
        </form>
      )}

      <div className="bg-figma-card rounded-2xl p-5 border border-slate-800">
        {loading ? <p className="text-slate-500">Loading modules...</p> : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Counterparty</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-500">No transactions yet.</td></tr>}
              {txs.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-800/50">
                  <td className="py-3 text-slate-300 font-mono text-xs">{tx.date}</td>
                  <td className="py-3 text-white">{tx.counterparty || 'Unknown'}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{tx.type}</span>
                  </td>
                  <td className="py-3 text-right font-mono text-slate-300">{fmt(tx.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
