import { useFinancialState, useRunway } from '../hooks/useData';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { StatCard, Alert, CardSkeleton, Skeleton, SectionHeader, fmt, ClusterTag, Badge } from '../components/ui';

// ─── Runway Banner ────────────────────────────────────────────────────────────

function RunwayBanner({ days, failureModes }: { days: number | null; failureModes: Array<{ date: string; description: string; severity: string; amount: number }> }) {
  const isOk = days === null || days > 30;
  return (
    <div className={`rounded-2xl p-6 border flex gap-6 mb-6 ${isOk ? 'bg-emerald-500/5 border-emerald-500/15' : days <= 7 ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
      {/* Number */}
      <div className="flex-shrink-0">
        <p className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-1">Solvency Countdown</p>
        <p className={`text-7xl font-extrabold leading-none tracking-tighter ${isOk ? 'text-emerald-400' : days! <= 7 ? 'text-red-400' : 'text-amber-400'}`}>
          {days === null ? '∞' : days}
        </p>
        <p className="text-sm text-slate-400 mt-1">days to zero</p>
        <p className="text-xs text-slate-600 mt-0.5">Without engine intervention</p>
      </div>

      {/* Divider */}
      <div className="w-px bg-slate-700 flex-shrink-0" />

      {/* Failure modes */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-3">Primary Failure Modes</p>
        <div className="space-y-2">
          {failureModes.map((fm, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                fm.severity === 'critical' ? 'bg-red-400' : fm.severity === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
              }`} />
              <span className="text-slate-300">{fm.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Cash Flow Chart ──────────────────────────────────────────────────────────

const chartTooltipStyle = {
  backgroundColor: '#3B3E46',
  border: '1px solid #374151',
  borderRadius: 8,
  fontSize: 12,
};

function CashFlowChart({ data }: { data: Array<{ date: string; balance: number; balance_optimal: number }> }) {
  const formatted = data.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="optimal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="unmanaged" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f87171" stopOpacity={0.10} />
            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
        <XAxis dataKey="label" tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} interval={4} />
        <YAxis tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v / 1000}K`} />
        <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#e2e8f0', marginBottom: 4 }} formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />
        <Area type="monotone" dataKey="balance" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 2" fill="url(#unmanaged)" name="Unmanaged" />
        <Area type="monotone" dataKey="balance_optimal" stroke="#34d399" strokeWidth={2} fill="url(#optimal)" name="Optimal path" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Obligations Table ────────────────────────────────────────────────────────

import type { Obligation } from '../types';
import { ScoreBar, DirectiveBadge } from '../components/ui';

function ObligationsTable({ obligations }: { obligations: Obligation[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-figma-card/50 border-b border-slate-800">
            {['#', 'Counterparty', 'Cluster', 'Amount', 'Due', 'Score', 'Action'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-mono tracking-widest uppercase text-slate-500 font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {obligations.map((ob, i) => (
            <tr key={ob.id} className="border-b border-slate-800/60 hover:bg-figma-card/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-slate-500">{String(i + 1).padStart(2, '0')}</td>
              <td className="px-4 py-3">
                <p className="font-medium text-slate-200">{ob.counterparty}</p>
                <p className="text-xs text-slate-500 mt-0.5">{ob.counterparty_type}</p>
              </td>
              <td className="px-4 py-3"><ClusterTag cluster={ob.cluster} /></td>
              <td className="px-4 py-3 font-mono text-slate-300">{fmt(ob.amount)}</td>
              <td className="px-4 py-3">
                <Badge variant={ob.days_until_due <= 4 ? 'red' : ob.days_until_due <= 7 ? 'amber' : 'green'}>
                  {ob.days_until_due}d
                </Badge>
              </td>
              <td className="px-4 py-3 w-36"><ScoreBar score={ob.score} /></td>
              <td className="px-4 py-3"><DirectiveBadge directive={ob.directive} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tax Envelope ─────────────────────────────────────────────────────────────

function TaxEnvelope({ available, reserved, committed }: { available: number; reserved: number; committed: number }) {
  const total = available + reserved + committed;
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
        <div className="bg-blue-400 rounded-l-full" style={{ width: `${(available / total) * 100}%` }} />
        <div className="bg-orange-400" style={{ width: `${(reserved / total) * 100}%` }} />
        <div className="bg-slate-600 rounded-r-full" style={{ width: `${(committed / total) * 100}%` }} />
      </div>
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-400" /><span className="text-slate-400">Operational</span><span className="font-mono text-slate-200 ml-1">{fmt(available)}</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-orange-400" /><span className="text-slate-400">Tax reserved</span><span className="font-mono text-slate-200 ml-1">{fmt(reserved)}</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-slate-600" /><span className="text-slate-400">Committed</span><span className="font-mono text-slate-200 ml-1">{fmt(committed)}</span></div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: state, loading: stateLoading } = useFinancialState();
  const { data: runway, loading: runwayLoading } = useRunway();

  const loading = stateLoading || runwayLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">{Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)}</div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!state || !runway) return null;

  const committed = state.cash_balance - state.available_cash - state.tax_reserved;

  return (
    <div className="space-y-6">
      {/* Runway banner */}
      <RunwayBanner days={runway.days_to_zero} failureModes={runway.failure_modes} />

      {/* Alerts */}
      <div className="space-y-2">
        <Alert variant="danger">
          <strong>Critical:</strong> Payroll (₹68,000) due in 3 days — engine has ring-fenced as non-deferrable. Available cash post-payroll: ₹9,200 without receivables clearing first.
        </Alert>
        <Alert variant="warn">
          <strong>Engine recommendation:</strong> Defer Rajesh Logistics by 12 days — estimated penalty ₹840. Saves ₹41,160 in operational float. Negotiation email pre-drafted in Action Center.
        </Alert>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Available Cash" value={fmt(state.available_cash)}
          sub="After tax reservation" delta="₹18K from last week" accent="amber"
        />
        <StatCard
          label="Total Obligations" value={fmt(state.total_obligations)}
          sub="Due in next 30 days" delta={`₹${fmt(state.shortfall)} shortfall`} accent="red"
        />
        <StatCard
          label="Expected Receivables" value={fmt(state.total_receivables_expected)}
          sub="87% avg collection confidence" accent="green"
        />
        <StatCard
          label="Tax Reserved" value={fmt(state.tax_reserved)}
          sub={`Virtual envelope @ ${(state.tax_rate * 100).toFixed(0)}% — ring-fenced`} accent="blue"
        />
      </div>

      {/* Chart + Tax envelope */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-figma-card rounded-2xl p-5">
          <SectionHeader
            title="90-Day Cash Flow Projection"
            sub="Optimal path vs. unmanaged — engine closes the ₹1.59L gap"
          />
          <CashFlowChart data={runway.daily_positions} />
          <div className="flex gap-5 mt-3 text-xs">
            <div className="flex items-center gap-1.5"><span className="w-6 border-t-2 border-emerald-400 inline-block" />Optimal path</div>
            <div className="flex items-center gap-1.5"><span className="w-6 border-t border-dashed border-red-400 inline-block" />Unmanaged</div>
          </div>
        </div>

        <div className="bg-figma-card rounded-2xl p-5">
          <p className="text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-3">Tax Envelope</p>
          <p className="text-xs text-slate-500 mb-3">Of {fmt(state.cash_balance)} gross cash</p>
          <TaxEnvelope available={state.available_cash} reserved={state.tax_reserved} committed={committed} />

          <div className="mt-6 pt-5 border-t border-slate-700">
            <p className="text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-3">Receivables Pipeline</p>
            <div className="space-y-2">
              {state.receivables.map(r => (
                <div key={r.id} className="flex justify-between items-center text-xs">
                  <div>
                    <p className="text-slate-300">{r.counterparty}</p>
                    <p className="text-slate-600 font-mono">{r.expected_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-slate-300">{fmt(r.amount)}</p>
                    <p className="text-slate-500">{Math.round(r.collection_confidence * 100)}% conf.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Obligations queue */}
      <div className="bg-figma-card rounded-2xl p-5">
        <SectionHeader title="Obligation Queue" sub="Ranked by deterministic priority score" />
        <ObligationsTable obligations={state.payables} />
      </div>
    </div>
  );
}
