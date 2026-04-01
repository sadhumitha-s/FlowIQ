import { useState } from 'react';
import { SectionHeader, fmt, Skeleton } from '../components/ui';
import { api } from '../services/api';
import { useTransactions } from '../hooks/useData';

export default function Transactions() {
  const { data: txs, loading, refetch } = useTransactions();
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<{ amount: string; type: 'income' | 'expense'; counterparty: string }>({ 
    amount: '', 
    type: 'expense', 
    counterparty: '' 
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createTransaction({
        amount: Number(form.amount),
        type: form.type,
        counterparty: form.counterparty,
      });
      setIsAdding(false);
      setForm({ amount: '', type: 'expense', counterparty: '' });
      refetch();
    } catch (err) {
      console.error('Failed to create transaction', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <SectionHeader title="Transactions" sub="Your historical cash flow activity" />
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          className="px-4 py-2 bg-figma-yellow text-slate-900 font-bold rounded-xl text-sm hover:bg-yellow-300 transition-colors"
        >
          {isAdding ? 'Cancel' : '+ Add Transaction'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-figma-card p-6 rounded-2xl border border-slate-800 space-y-4 max-w-lg shadow-xl">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Amount</label>
              <input 
                type="number" required 
                value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} 
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-figma-coral" 
                placeholder="0.00"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Type</label>
              <select 
                value={form.type} onChange={e=>setForm({...form, type: e.target.value as 'income' | 'expense'})} 
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Counterparty</label>
            <input 
              type="text" required 
              value={form.counterparty} onChange={e=>setForm({...form, counterparty: e.target.value})} 
              className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-figma-coral" 
              placeholder="e.g. AWS, Vendor X"
            />
          </div>
          <button 
            type="submit" 
            disabled={saving}
            className="px-4 py-3 bg-figma-coral text-white font-bold rounded-xl text-sm w-full hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Transaction'}
          </button>
        </form>
      )}

      <div className="bg-figma-card rounded-2xl overflow-hidden border border-slate-800">
        {loading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-900/40 text-slate-500 border-b border-slate-800">
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-widest">Counterparty</th>
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {txs?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <p>No transactions yet.</p>
                  </td>
                </tr>
              ) : (
                txs?.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{tx.date}</td>
                    <td className="px-6 py-4 text-slate-200 font-medium">{tx.counterparty || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase border ${
                        tx.type === 'income' 
                          ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' 
                          : 'bg-red-500/5 text-red-400 border-red-500/20'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-figma-yellow font-bold">{fmt(tx.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
