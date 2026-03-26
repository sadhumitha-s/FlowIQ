import { useState } from 'react';
import { useActions } from '../hooks/useData';
import { SectionHeader, Alert, DirectiveBadge, Skeleton, fmt, fmtFull, ClusterTag } from '../components/ui';
import type { ActionItem } from '../types';
import { clsx } from 'clsx';

// ─── Action Row ───────────────────────────────────────────────────────────────

function ActionRow({
  item, isSelected, onClick,
}: { item: ActionItem; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all border',
        isSelected ? 'bg-figma-yellow/5 border-figma-yellow/20' : 'bg-figma-card border-slate-800/60 hover:border-slate-700',
      )}
    >
      <DirectiveBadge directive={item.directive} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-200 text-sm">{item.obligation.counterparty}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{item.reason}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-mono text-sm text-slate-300">{fmt(item.obligation.amount)}</p>
        <ClusterTag cluster={item.obligation.cluster} />
      </div>
      {item.email_draft && (
        <span className="text-[10px] font-mono text-blue-400 border border-blue-500/20 rounded px-1.5 py-0.5 flex-shrink-0">EMAIL</span>
      )}
    </button>
  );
}

// ─── Email Panel ──────────────────────────────────────────────────────────────

function EmailPanel({ item }: { item: ActionItem }) {
  const [copied, setCopied] = useState(false);
  const draft = item.email_draft;
  if (!draft) return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16">
      <span className="text-3xl mb-3">✓</span>
      <p className="font-semibold text-slate-300">No draft needed</p>
      <p className="text-sm text-slate-500 mt-1">This obligation is being paid directly.</p>
    </div>
  );

  function copy() {
    if (!draft) return;
    navigator.clipboard.writeText(draft.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Tone profile:</span>
        <span className="text-[10px] font-mono text-amber-400 border border-amber-500/20 rounded px-2 py-0.5">{draft.tone}</span>
        <span className="text-[10px] font-mono text-blue-400 border border-blue-500/20 rounded px-2 py-0.5">{draft.strategy}</span>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        {/* Email fields */}
        <div className="divide-y divide-slate-800">
          {[{ label: 'To', value: draft.to }, { label: 'Subject', value: draft.subject }].map(f => (
            <div key={f.label} className="flex items-start gap-3 px-4 py-2.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 w-16 flex-shrink-0 mt-0.5">{f.label}</span>
              <span className="text-sm text-slate-300">{f.value}</span>
            </div>
          ))}
        </div>
        {/* Body */}
        <div className="px-4 py-4 border-t border-slate-800">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{draft.body}</pre>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={copy}
          className="flex-1 px-4 py-2.5 bg-figma-yellow text-slate-900 rounded-xl text-sm font-semibold hover:bg-figma-yellow/80 transition-colors"
        >
          {copied ? '✓ Copied!' : 'Copy Email'}
        </button>
        <button className="px-4 py-2.5 bg-figma-card border border-slate-700 rounded-xl text-sm text-slate-300 hover:border-slate-500 transition-colors">
          Regenerate
        </button>
      </div>
    </div>
  );
}

// ─── Summary Stats ────────────────────────────────────────────────────────────

function Summary({ items }: { items: ActionItem[] }) {
  const pay = items.filter(i => i.directive === 'PAY');
  const delay = items.filter(i => i.directive === 'DELAY');
  const totalPay = pay.reduce((s, i) => s + i.obligation.amount, 0);
  const totalDelay = delay.reduce((s, i) => s + i.obligation.amount, 0);
  const totalPenalty = delay.reduce((s, i) => s + (i.obligation.penalty_per_day * Math.min(i.obligation.max_defer_days, 12)), 0);

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {[
        { label: `${pay.length} Obligations to pay`, value: fmtFull(totalPay), color: 'text-emerald-400', border: 'border-emerald-500/15' },
        { label: `${delay.length} Obligations to delay`, value: fmtFull(totalDelay), color: 'text-amber-400', border: 'border-amber-500/15' },
        { label: 'Est. total penalty', value: fmtFull(totalPenalty), color: 'text-slate-300', border: 'border-slate-700' },
      ].map(s => (
        <div key={s.label} className={clsx('bg-figma-card rounded-xl px-4 py-3 border', s.border)}>
          <p className="text-xs text-slate-500">{s.label}</p>
          <p className={clsx('font-mono font-bold text-lg mt-0.5', s.color)}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActionCenter() {
  const { data: actions, loading } = useActions();
  const [selected, setSelected] = useState<string>('ob-5');

  if (loading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!actions) return null;

  const selectedItem = actions.find(a => a.obligation.id === selected);

  return (
    <div className="space-y-6">
      <Alert variant="info">
        <strong>Engine output:</strong> {actions.filter(a => a.directive === 'PAY').length} obligations to pay, {actions.filter(a => a.directive === 'DELAY').length} to defer, {actions.filter(a => a.directive === 'NEGOTIATE').length} to negotiate. Execution-ready emails pre-drafted below.
      </Alert>

      <div>
        <SectionHeader title="Execution Directives" sub="Sorted by priority score — engine decides the order" />
        <Summary items={actions} />

        <div className="grid grid-cols-5 gap-4">
          {/* Action list */}
          <div className="col-span-2 space-y-2">
            {actions.map(item => (
              <ActionRow
                key={item.obligation.id}
                item={item}
                isSelected={selected === item.obligation.id}
                onClick={() => setSelected(item.obligation.id)}
              />
            ))}
          </div>

          {/* Detail panel */}
          <div className="col-span-3 bg-figma-card rounded-2xl p-5">
            {selectedItem ? (
              <>
                <div className="mb-5 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3 mb-1">
                    <DirectiveBadge directive={selectedItem.directive} />
                    <h3 className="font-bold text-white">{selectedItem.obligation.counterparty}</h3>
                  </div>
                  <p className="text-xs text-slate-500">{selectedItem.reason}</p>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>Amount: <span className="font-mono text-slate-300">{fmtFull(selectedItem.obligation.amount)}</span></span>
                    <span>Due: <span className="font-mono text-slate-300">{selectedItem.obligation.due_date}</span></span>
                    <span>Score: <span className="font-mono text-amber-400">{selectedItem.obligation.score.toFixed(2)}</span></span>
                  </div>
                </div>
                <EmailPanel item={selectedItem} />
              </>
            ) : (
              <p className="text-slate-500 text-center py-16">Select an obligation to view details</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
