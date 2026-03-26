import { useState } from 'react';
import { useScenarios, useFinancialState } from '../hooks/useData';
import { api } from '../services/api';
import {
  SectionHeader, Alert, DirectiveBadge, ClusterTag,
  Skeleton, fmt, fmtFull, Badge,
} from '../components/ui';
import type { ScenarioResult, ScoreBreakdown } from '../types';
import { clsx } from 'clsx';

// ─── Scenario Column ──────────────────────────────────────────────────────────

function ScenarioCol({ scenario, isWinner }: { scenario: ScenarioResult; isWinner: boolean }) {
  const metrics = [
    { label: 'Obligations paid', value: `${scenario.paid_obligations.length} of ${scenario.paid_obligations.length + scenario.deferred_obligations.length}`, color: isWinner ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Obligations deferred', value: `${scenario.deferred_obligations.length}`, color: 'text-slate-300' },
    { label: 'Remaining cash', value: fmtFull(scenario.remaining_cash), color: scenario.remaining_cash >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Estimated penalty', value: fmtFull(scenario.estimated_penalty), color: scenario.estimated_penalty > 0 ? 'text-amber-400' : 'text-emerald-400' },
    { label: 'Payroll protected', value: scenario.payroll_protected ? '✓ Yes' : '✗ No', color: scenario.payroll_protected ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Relationship impact', value: scenario.relationship_impact.charAt(0).toUpperCase() + scenario.relationship_impact.slice(1), color: scenario.relationship_impact === 'low' ? 'text-emerald-400' : scenario.relationship_impact === 'medium' ? 'text-amber-400' : 'text-red-400' },
    { label: 'Net cost', value: fmtFull(scenario.net_cost), color: isWinner ? 'text-emerald-400' : 'text-red-400' },
  ];

  return (
    <div className={clsx('rounded-2xl p-5 border', isWinner ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/15')}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className={clsx('font-bold text-base', isWinner ? 'text-emerald-400' : 'text-red-400')}>
            {isWinner ? '✓' : '✗'} {scenario.label}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {scenario.scenario === 'optimal' ? 'Engine-scored priority order' : 'Pay by invoice date, ignore scoring'}
          </p>
        </div>
        <Badge variant={isWinner ? 'green' : 'red'}>{isWinner ? 'RECOMMENDED' : 'HIGH RISK'}</Badge>
      </div>

      <div className="space-y-1">
        {metrics.map(m => (
          <div key={m.label} className="flex justify-between items-center py-2.5 border-b border-slate-800/60 last:border-0 text-sm">
            <span className="text-slate-400">{m.label}</span>
            <span className={clsx('font-mono font-medium', m.color)}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Deferred list */}
      {scenario.deferred_obligations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800/60">
          <p className="text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-2">Deferred</p>
          <div className="space-y-1.5">
            {scenario.deferred_obligations.map(ob => (
              <div key={ob.id} className="flex justify-between text-xs">
                <span className="text-slate-400 truncate">{ob.counterparty}</span>
                <span className="font-mono text-slate-300 flex-shrink-0 ml-2">{fmt(ob.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={clsx('mt-4 rounded-xl p-3 text-xs', isWinner ? 'bg-emerald-500/8 text-emerald-300' : 'bg-red-500/8 text-red-300')}>
        {isWinner
          ? `Engine saves ₹${(9400).toLocaleString('en-IN')} vs. chronological path by deferring lowest-scored obligations first.`
          : 'Payroll deferred causes employee trust damage. GST penalty accrues. Relationship harm may be irreversible.'}
      </div>
    </div>
  );
}

// ─── COT Breakdown ────────────────────────────────────────────────────────────

function COTPanel({ breakdown }: { breakdown: ScoreBreakdown }) {
  const rows = [
    { label: 'urgency', value: breakdown.urgency.toFixed(4), formula: breakdown.formulas.urgency },
    { label: 'penalty_weight', value: breakdown.penalty_weight.toFixed(4), formula: breakdown.formulas.penalty_weight },
    { label: 'relationship_score', value: breakdown.relationship_score.toFixed(4), formula: 'Supplied by vendor profile matrix' },
    { label: 'flexibility_discount', value: breakdown.flexibility_discount.toFixed(4), formula: breakdown.formulas.flexibility_discount },
    { label: 'type_multiplier', value: breakdown.type_multiplier.toFixed(4), formula: 'employee:1.5 · tax:1.4 · lender:1.3 · utility:1.1 · supplier:1.0' },
  ];

  return (
    <div>
      <div className="space-y-0">
        {rows.map(r => (
          <div key={r.label} className="flex items-start gap-4 py-3 border-b border-slate-800/60 last:border-0 text-sm">
            <span className="font-mono text-violet-400 text-xs w-36 flex-shrink-0 mt-0.5">{r.label}</span>
            <div className="flex-1 min-w-0">
              <span className="font-mono text-slate-200">{r.value}</span>
              <p className="text-xs text-slate-500 mt-0.5">{r.formula}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-amber-500/8 border border-amber-500/15 px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Final Score</span>
        <span className="text-2xl font-extrabold text-amber-400 font-mono">{breakdown.final_score.toFixed(2)}</span>
      </div>
      <p className="text-xs text-slate-500 mt-2 font-mono">{breakdown.formulas.final}</p>
    </div>
  );
}

// ─── Second-Order Effects ─────────────────────────────────────────────────────

function SecondOrderCard({ title, items, variant }: { title: string; items: string[]; variant: 'good' | 'bad' | 'neutral' }) {
  const styles = {
    good: 'bg-emerald-500/5 border-emerald-500/15 text-emerald-300',
    bad: 'bg-red-500/5 border-red-500/15 text-red-300',
    neutral: 'bg-blue-500/5 border-blue-500/15 text-blue-300',
  };
  return (
    <div className={clsx('rounded-xl border p-4', styles[variant])}>
      <p className="text-[10px] font-mono tracking-widest uppercase mb-3 opacity-70">{title}</p>
      <ul className="space-y-1.5 text-xs">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TradeOff() {
  const { data: scenarios, loading } = useScenarios();
  const { data: state } = useFinancialState();
  const [selectedOb, setSelectedOb] = useState<string>('ob-1');
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  async function loadBreakdown(id: string) {
    setSelectedOb(id);
    setBreakdownLoading(true);
    const data = await api.getScoreBreakdown(id);
    setBreakdown(data);
    setBreakdownLoading(false);
  }

  if (loading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!scenarios || scenarios.length < 2) return null;

  const [optimal, chrono] = scenarios;

  return (
    <div className="space-y-6">
      <Alert variant="warn">
        <strong>Conflict detected:</strong> Available cash ({fmt(state?.available_cash ?? 182000)}) vs total obligations ({fmt(state?.total_obligations ?? 341900)}) — shortfall of {fmt(state?.shortfall ?? 159900)}. Running 2 deterministic consequence scenarios.
      </Alert>

      {/* Scenario comparison */}
      <div>
        <SectionHeader title="Scenario Comparison" sub="Deterministic engine evaluates two consequence paths" />
        <div className="grid grid-cols-2 gap-4">
          <ScenarioCol scenario={optimal} isWinner />
          <ScenarioCol scenario={chrono} isWinner={false} />
        </div>
      </div>

      {/* Second order effects */}
      <div>
        <SectionHeader title="Second-Order Consequence Map" sub="What happens downstream if each deferral is chosen" />
        <div className="grid grid-cols-3 gap-4">
          <SecondOrderCard
            title="If Supplier B deferred (12d)"
            items={['Penalty: ₹840 (acknowledged)', 'Credit terms: unchanged', 'Relationship: stable with email', 'Receivable covers in full on Day 9']}
            variant="neutral"
          />
          <SecondOrderCard
            title="If AWS deferred (25d)"
            items={['Penalty: ₹0', 'No SLA risk (usage below threshold)', 'Free-tier buffer: 11 days', 'Low-impact — cleanest deferral']}
            variant="good"
          />
          <SecondOrderCard
            title="If Payroll deferred (avoid)"
            items={['Employee trust destroyed immediately', 'Labour law compliance breach', 'Reputational damage: permanent', 'Cost: incalculable — never defer']}
            variant="bad"
          />
        </div>
      </div>

      {/* COT Explainability */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-figma-card rounded-2xl p-5">
          <SectionHeader title="Score Breakdown" sub="Select an obligation to inspect its formula" />
          <div className="space-y-1.5">
            {(state?.payables ?? []).map(ob => (
              <button
                key={ob.id}
                onClick={() => loadBreakdown(ob.id)}
                className={clsx(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all text-left',
                  selectedOb === ob.id ? 'bg-violet-500/10 border border-violet-500/20' : 'hover:bg-slate-800/50 border border-transparent',
                )}
              >
                <div>
                  <span className="text-slate-200 font-medium">{ob.counterparty}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <ClusterTag cluster={ob.cluster} />
                    <DirectiveBadge directive={ob.directive} />
                  </div>
                </div>
                <span className="font-mono text-amber-400 font-bold ml-3">{ob.score.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-figma-card rounded-2xl p-5">
          <SectionHeader title="Chain-of-Thought" sub="Every variable that produced this score" />
          {breakdownLoading ? (
            <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : breakdown ? (
            <COTPanel breakdown={breakdown} />
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">Select an obligation to view its score breakdown</p>
          )}
        </div>
      </div>
    </div>
  );
}
