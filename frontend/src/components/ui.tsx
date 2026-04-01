/* eslint-disable react-refresh/only-export-components */
import { type ReactNode } from 'react';
import { clsx } from 'clsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function fmtFull(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaUp?: boolean;
  accent?: 'red' | 'amber' | 'green' | 'blue' | 'purple';
  children?: ReactNode;
}

const accentTop: Record<string, string> = {
  red: 'before:bg-red-500',
  amber: 'before:bg-amber-400',
  green: 'before:bg-emerald-400',
  blue: 'before:bg-blue-400',
  purple: 'before:bg-violet-400',
};

const valueColor: Record<string, string> = {
  red: 'text-red-400',
  amber: 'text-amber-400',
  green: 'text-emerald-400',
  blue: 'text-blue-400',
  purple: 'text-violet-400',
};

export function StatCard({ label, value, sub, delta, deltaUp, accent = 'blue', children }: StatCardProps) {
  return (
    <div className={clsx(
      'relative bg-figma-card rounded-2xl p-5 overflow-hidden',
      'before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5',
      accentTop[accent],
    )}>
      <p className="text-xs font-medium text-slate-400 tracking-widest uppercase mb-2">{label}</p>
      <p className={clsx('text-3xl font-extrabold tracking-tight leading-none', valueColor[accent])}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
      {delta && (
        <p className={clsx('text-xs font-medium mt-1', deltaUp ? 'text-emerald-400' : 'text-red-400')}>
          {deltaUp ? '▲' : '▼'} {delta}
        </p>
      )}
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'gray';

const badgeStyles: Record<BadgeVariant, string> = {
  red: 'bg-red-500/10 text-red-400 border border-red-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  green: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  purple: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  gray: 'bg-slate-700/50 text-slate-400 border border-slate-600/20',
};

export function Badge({ children, variant = 'gray' }: { children: ReactNode; variant?: BadgeVariant }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide font-mono uppercase', badgeStyles[variant])}>
      {children}
    </span>
  );
}

// ─── Directive Badge ──────────────────────────────────────────────────────────

import type { ActionDirective } from '../types';

const directiveMap: Record<ActionDirective, { label: string; variant: BadgeVariant }> = {
  PAY: { label: 'PAY NOW', variant: 'green' },
  DELAY: { label: 'DELAY', variant: 'amber' },
  NEGOTIATE: { label: 'NEGOTIATE', variant: 'blue' },
  PARTIAL: { label: 'PARTIAL', variant: 'purple' },
};

export function DirectiveBadge({ directive }: { directive: ActionDirective }) {
  const { label, variant } = directiveMap[directive];
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── ScoreBar ─────────────────────────────────────────────────────────────────

export function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score > 0.75 ? 'bg-red-400' : score > 0.5 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-mono text-slate-400 w-8 text-right">{score.toFixed(2)}</span>
    </div>
  );
}

// ─── Alert ───────────────────────────────────────────────────────────────────

interface AlertProps {
  variant: 'danger' | 'warn' | 'info' | 'success';
  children: ReactNode;
  icon?: string;
}

const alertStyles = {
  danger: 'bg-red-500/5 border-red-500/20 text-red-300',
  warn: 'bg-amber-500/5 border-amber-500/20 text-amber-300',
  info: 'bg-blue-500/5 border-blue-500/20 text-blue-300',
  success: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300',
};

export function Alert({ variant, children, icon }: AlertProps) {
  const defaultIcons = { danger: '⚠', warn: '◈', info: '◎', success: '✓' };
  return (
    <div className={clsx('flex gap-3 rounded-xl px-4 py-3 border text-sm', alertStyles[variant])}>
      <span className="flex-shrink-0 mt-0.5">{icon ?? defaultIcons[variant]}</span>
      <div>{children}</div>
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

export function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        {sub && <p className="text-sm text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-slate-700/50 rounded-lg', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-figma-card rounded-2xl p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

// ─── Cluster Tag ──────────────────────────────────────────────────────────────

import type { ObligationCluster } from '../types';

const clusterMap: Record<ObligationCluster, { color: string; dot: string }> = {
  Fixed: { color: 'text-red-400', dot: 'bg-red-400' },
  Flexible: { color: 'text-amber-400', dot: 'bg-amber-400' },
  Strategic: { color: 'text-blue-400', dot: 'bg-blue-400' },
};

export function ClusterTag({ cluster }: { cluster: ObligationCluster }) {
  const { color, dot } = clusterMap[cluster];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold tracking-wider uppercase', color)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', dot)} />
      {cluster}
    </span>
  );
}

// ─── Confidence Indicator ─────────────────────────────────────────────────────

export function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? 'text-emerald-400' : pct >= 80 ? 'text-amber-400' : 'text-red-400';
  return <span className={clsx('text-xs font-mono', color)}>{pct}%</span>;
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-slate-300 font-semibold">{title}</p>
      {sub && <p className="text-slate-500 text-sm mt-1">{sub}</p>}
    </div>
  );
}
