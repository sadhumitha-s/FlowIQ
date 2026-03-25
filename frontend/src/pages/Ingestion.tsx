import { useState, useEffect } from 'react';
import { FinanceAPI, type FinancialItem } from '../services/api';

export default function Ingestion() {
  const [balance, setBalance] = useState(0);
  const [payables, setPayables] = useState<FinancialItem[]>([]);
  const [receivables, setReceivables] = useState<FinancialItem[]>([]);

  // Form states
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemDate, setItemDate] = useState('');
  const [itemType, setItemType] = useState<'payable'|'receivable'>('payable');

  const fetchData = () => {
    FinanceAPI.getBalance().then(res => setBalance(res.data.amount || 0));
    FinanceAPI.getPayables().then(res => setPayables(res.data));
    FinanceAPI.getReceivables().then(res => setReceivables(res.data));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateBalance = async (e: any) => {
    e.preventDefault();
    await FinanceAPI.updateBalance(Number(balance));
    fetchData();
  };

  const handleAddItem = async (e: any) => {
    e.preventDefault();
    const data: FinancialItem = {
      name: itemName,
      amount: Number(itemAmount),
      due_date: itemDate
    };
    if (itemType === 'payable') {
      await FinanceAPI.addPayable(data);
    } else {
      await FinanceAPI.addReceivable(data);
    }
    
    setItemName('');
    setItemAmount('');
    setItemDate('');
    fetchData();
  };

  const handleDelete = async (id: number, type: 'payable'|'receivable') => {
    if (type === 'payable') await FinanceAPI.deletePayable(id);
    else await FinanceAPI.deleteReceivable(id);
    fetchData();
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-medium mb-4 text-slate-100">Core Cash Balance</h2>
        <form onSubmit={handleUpdateBalance} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Current Bank Balance ($)</label>
            <input 
              type="number" 
              value={balance}
              onChange={e => setBalance(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition-colors font-medium">
            Update
          </button>
        </form>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-medium mb-6 text-slate-100">Add Obligation / Receivable</h2>
        <form onSubmit={handleAddItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name / Vendor</label>
              <input required type="text" value={itemName} onChange={e=>setItemName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount ($)</label>
              <input required type="number" value={itemAmount} onChange={e=>setItemAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Due Date</label>
              <input required type="date" value={itemDate} onChange={e=>setItemDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white style-color-scheme-dark" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select value={itemType} onChange={e=>setItemType(e.target.value as any)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white">
                <option value="payable">Payable (Bill)</option>
                <option value="receivable">Receivable (Invoice)</option>
              </select>
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg transition-colors font-medium">
              Add Record
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Receivables
          </h3>
          <ul className="space-y-2">
            {receivables.map(r => (
              <li key={r.id} className="flex justify-between items-center text-sm p-3 bg-slate-950 rounded border border-slate-800">
                <span>{r.name} <span className="text-slate-500 text-xs ml-2">{r.due_date}</span></span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-emerald-400">${r.amount}</span>
                  <button onClick={() => handleDelete(r.id!, 'receivable')} className="text-rose-500 hover:text-rose-400">×</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500"></span> Payables
          </h3>
          <ul className="space-y-2">
            {payables.map(p => (
              <li key={p.id} className="flex justify-between items-center text-sm p-3 bg-slate-950 rounded border border-slate-800">
                <span>{p.name} <span className="text-slate-500 text-xs ml-2">{p.due_date}</span></span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-rose-400">${p.amount}</span>
                  <button onClick={() => handleDelete(p.id!, 'payable')} className="text-rose-500 hover:text-rose-400">×</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
