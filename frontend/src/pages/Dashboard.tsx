import { useEffect, useState } from 'react';
import { FinanceAPI } from '../services/api';
import { Activity, AlertTriangle, TrendingDown, DollarSign, ListTodo } from 'lucide-react';

export default function Dashboard() {
  const [insight, setInsight] = useState<any>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([FinanceAPI.getInsights(), FinanceAPI.getActions()])
      .then(([res1, res2]) => {
        setInsight(res1.data);
        setActions(res2.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10 animate-pulse text-indigo-400">Loading Intelligence Engine...</div>;
  if (!insight) return <div className="text-center py-10 text-rose-400">Failed to load data. Ensure backend is running.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <DollarSign size={18} className="text-emerald-400"/> Current Cash
          </div>
          <div className="text-3xl font-light">${insight.current_cash.toLocaleString()}</div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><AlertTriangle size={48} className="text-rose-500"/></div>
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <TrendingDown size={18} className="text-rose-400"/> Tax Envelope
          </div>
          <div className="text-3xl font-light text-rose-300">-${insight.tax_envelope.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-2 tracking-wide font-medium">LOCKED RESERVATION</div>
        </div>

        <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-5 shadow-[0_0_15px_rgba(16,185,129,0.05)] md:col-span-2">
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <Activity size={18} className="text-indigo-400"/> Operational Runway
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {insight.runway_days === 999 ? '∞' : insight.runway_days}
            </div>
            <div className="text-slate-400">Days to Zero</div>
          </div>
          <div className="text-sm mt-3 text-slate-400 flex items-center justify-between">
            <span>Available Operational Cash:</span>
            <span className="font-mono text-emerald-400">${insight.available_operational_cash.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Constraints & Failures */}
      {insight.failure_modes.length > 0 && (
        <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-6">
          <h2 className="text-lg font-medium text-rose-300 flex items-center gap-2 mb-4">
            <AlertTriangle size={20} /> Projected Constraint Breaches
          </h2>
          <ul className="space-y-2">
            {insight.failure_modes.map((mode: string, idx: number) => (
              <li key={idx} className="text-rose-200/80 text-sm flex gap-3">
                <span className="text-rose-500">•</span> {mode}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Execution Layer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-8">
        <div className="p-5 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-medium text-slate-200 flex items-center gap-2">
            <ListTodo size={20} className="text-indigo-400"/> Deterministic Action Directives
          </h2>
          <p className="text-xs text-slate-500 mt-1">Prescripted payment paths calculated via constraint risk models.</p>
        </div>
        
        <div className="divide-y divide-slate-800/50">
          {actions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No pending payables require action right now.</div>
          ) : (
            actions.map((act, idx) => (
              <div key={idx} className={`p-4 md:p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-slate-800/30 transition-colors`}>
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase
                      ${act.action === 'Pay' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        act.action === 'Negotiate' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {act.action}
                    </span>
                    <span className="font-medium text-slate-200">{act.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2 max-w-2xl leading-relaxed">
                    <span className="font-semibold text-slate-400">Reasoning: </span> 
                    {act.justification}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <div className="text-xs text-slate-400 mb-1">EXECUTE AMOUNT</div>
                  <div className="font-mono text-lg">${act.amount_to_pay.toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
