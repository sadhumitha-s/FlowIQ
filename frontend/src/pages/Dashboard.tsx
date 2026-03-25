import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Copy, Loader2, Mail } from 'lucide-react';
import { FinanceAPI, type ActionDirective, type NegotiationEmailResponse } from '../services/api';

interface DashboardInsight {
  current_cash: number;
  tax_envelope: number;
  available_operational_cash: number;
  runway_days: number;
  failure_modes: string[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function Dashboard() {
  const [insight, setInsight] = useState<DashboardInsight | null>(null);
  const [actions, setActions] = useState<ActionDirective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [emailByItemId, setEmailByItemId] = useState<Record<number, NegotiationEmailResponse>>({});
  const [emailLoadingByItemId, setEmailLoadingByItemId] = useState<Record<number, boolean>>({});
  const [copiedItemId, setCopiedItemId] = useState<number | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const [insightRes, actionsRes] = await Promise.all([
          FinanceAPI.getInsights(),
          FinanceAPI.getActions(),
        ]);
        setInsight(insightRes.data);
        setActions(actionsRes.data);
      } catch {
        setError('Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const actionCounts = useMemo(() => {
    const counts = { Pay: 0, Negotiate: 0, Delay: 0 };
    for (const action of actions) {
      counts[action.action] += 1;
    }
    return counts;
  }, [actions]);

  const generateEmail = async (itemId: number) => {
    setEmailLoadingByItemId((prev) => ({ ...prev, [itemId]: true }));
    try {
      const response = await FinanceAPI.generateNegotiationEmail(itemId);
      setEmailByItemId((prev) => ({ ...prev, [itemId]: response.data }));
    } catch {
      setError('Failed to generate negotiation email for this item.');
    } finally {
      setEmailLoadingByItemId((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const copyEmail = async (email: NegotiationEmailResponse) => {
    const copyText = `Subject: ${email.subject}\n\n${email.body}`;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopiedItemId(email.item_id);
      setTimeout(() => setCopiedItemId((id) => (id === email.item_id ? null : id)), 1400);
    } catch {
      setError('Unable to copy to clipboard in this browser.');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-figma-card rounded-3xl p-5 shadow-sm">
          <p className="text-slate-400 text-sm">Current Cash</p>
          <p className="text-2xl font-bold text-white mt-2">{insight ? formatCurrency(insight.current_cash) : '--'}</p>
        </div>
        <div className="bg-figma-card rounded-3xl p-5 shadow-sm">
          <p className="text-slate-400 text-sm">Tax Envelope</p>
          <p className="text-2xl font-bold text-white mt-2">{insight ? formatCurrency(insight.tax_envelope) : '--'}</p>
        </div>
        <div className="bg-figma-card rounded-3xl p-5 shadow-sm">
          <p className="text-slate-400 text-sm">Operational Cash</p>
          <p className="text-2xl font-bold text-white mt-2">{insight ? formatCurrency(insight.available_operational_cash) : '--'}</p>
        </div>
        <div className="bg-figma-card rounded-3xl p-5 shadow-sm">
          <p className="text-slate-400 text-sm">Runway</p>
          <p className="text-2xl font-bold text-white mt-2">{insight ? `${insight.runway_days} days` : '--'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-figma-card rounded-3xl p-5 shadow-sm">
          <p className="text-slate-400 text-sm">Pay</p>
          <p className="text-3xl font-bold text-emerald-300 mt-2">{actionCounts.Pay}</p>
        </div>
        <div className="bg-figma-card rounded-3xl p-5 shadow-sm">
          <p className="text-slate-400 text-sm">Negotiate</p>
          <p className="text-3xl font-bold text-yellow-300 mt-2">{actionCounts.Negotiate}</p>
        </div>
        <div className="bg-figma-card rounded-3xl p-5 shadow-sm">
          <p className="text-slate-400 text-sm">Delay</p>
          <p className="text-3xl font-bold text-slate-200 mt-2">{actionCounts.Delay}</p>
        </div>
      </div>

      <div className="bg-figma-card rounded-3xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-white mb-4">Action Plan</h2>

        {loading ? (
          <div className="text-slate-300 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading actions...</div>
        ) : actions.length === 0 ? (
          <p className="text-slate-400">No payable actions available.</p>
        ) : (
          <div className="space-y-4">
            {actions.map((action) => {
              const email = emailByItemId[action.item_id];
              const emailLoading = emailLoadingByItemId[action.item_id] ?? false;

              return (
                <div key={action.item_id} className="rounded-2xl border border-slate-700 p-4 bg-slate-900/20">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {action.action === 'Pay' && <CheckCircle2 size={16} className="text-emerald-400" />}
                        {action.action === 'Negotiate' && <Mail size={16} className="text-yellow-300" />}
                        {action.action === 'Delay' && <Clock3 size={16} className="text-slate-300" />}
                        <span className="text-white font-semibold">{action.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">{action.action}</span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">Pay now: <span className="font-medium text-white">{formatCurrency(action.amount_to_pay)}</span></p>
                    </div>

                    {action.action === 'Negotiate' && (
                      <button
                        onClick={() => void generateEmail(action.item_id)}
                        disabled={emailLoading}
                        className="bg-figma-yellow hover:bg-yellow-300 disabled:opacity-60 text-figma-bg font-semibold px-4 py-2 rounded-xl transition-colors w-full md:w-auto"
                      >
                        {emailLoading ? 'Generating...' : 'Generate Negotiation Email'}
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-slate-400 mt-3">{action.justification}</p>

                  {email && (
                    <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/40 p-4 space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="text-sm text-slate-300">
                          Tier: <span className="font-semibold text-white">{email.relationship_tier}</span>
                          <span className="mx-2 text-slate-500">|</span>
                          Deferred: <span className="font-semibold text-white">{formatCurrency(email.amount_deferred)}</span>
                        </div>
                        <button
                          onClick={() => void copyEmail(email)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50"
                        >
                          <Copy size={14} />
                          {copiedItemId === email.item_id ? 'Copied' : 'Copy Email'}
                        </button>
                      </div>

                      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                        <p className="text-sm text-slate-400">Subject</p>
                        <p className="text-white font-medium mt-1">{email.subject}</p>
                      </div>

                      <textarea
                        readOnly
                        value={email.body}
                        className="w-full h-52 rounded-xl border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-200 resize-y focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
