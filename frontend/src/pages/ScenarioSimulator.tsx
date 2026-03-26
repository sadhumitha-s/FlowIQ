import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useFinancialState } from '../hooks/useData';
import { SectionHeader, Alert, fmtFull, Badge } from '../components/ui';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ScenarioResult, SimulationParams } from '../types';
import { clsx } from 'clsx';

// ─── Slider control ───────────────────────────────────────────────────────────

function SliderControl({
  label, value, min, max, step = 1, unit = '', onChange, description,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  unit?: string; onChange: (v: number) => void; description?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="font-mono text-sm text-figma-yellow">{value}{unit}</span>
      </div>
      {description && <p className="text-xs text-slate-600 mb-2">{description}</p>}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-slate-700 accent-figma-yellow cursor-pointer"
      />
      <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-0.5">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ─── Result metric ────────────────────────────────────────────────────────────

function ResultMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-900/60 rounded-xl px-4 py-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={clsx('font-mono font-bold text-lg', color)}>{value}</p>
    </div>
  );
}

// ─── Scenario chart (mini) ────────────────────────────────────────────────────

const chartTooltipStyle = {
  backgroundColor: '#3B3E46',
  border: '1px solid #374151',
  borderRadius: 8,
  fontSize: 11,
};

function MiniChart({ baseline, simulated }: { baseline: number[]; simulated: number[] }) {
  const data = baseline.map((b, i) => ({ day: `D${i}`, baseline: b, simulated: simulated[i] ?? b }));
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6b7280" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.4} />
        <XAxis dataKey="day" tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} interval={4} />
        <YAxis tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v / 1000}K`} />
        <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#e2e8f0' }} formatter={(v: unknown) => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />
        <Area type="monotone" dataKey="baseline" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="4 2" fill="url(#base)" name="Baseline" />
        <Area type="monotone" dataKey="simulated" stroke="#fbbf24" strokeWidth={2} fill="url(#sim)" name="Simulated" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScenarioSimulator() {
  const { data: state } = useFinancialState();

  // Parameters
  const [receivableDelay, setReceivableDelay] = useState(0);
  const [cashReduction, setCashReduction] = useState(0);
  const [supplierBDefer, setSupplierBDefer] = useState(12);
  const [awsDefer, setAwsDefer] = useState(25);
  const [taxRate, setTaxRate] = useState(18);

  const [simResult, setSimResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  const runSim = useCallback(async () => {
    setLoading(true);
    setRan(true);
    const params: SimulationParams = {
      delay_receivable_days: receivableDelay,
      override_directives: {
        'ob-5': supplierBDefer > 0 ? 'DELAY' : 'PAY',
        'ob-6': awsDefer > 0 ? 'DELAY' : 'PAY',
      },
    };
    const results = await api.runSimulation(params);
    setSimResult(results[0] ?? null);
    setLoading(false);
  }, [receivableDelay, supplierBDefer, awsDefer]);

  // Build simulated positions from params
  const baselinePositions = Array.from({ length: 30 }, (_, i) => {
    let b = (state?.available_cash ?? 182000) - cashReduction * 1000;
    if (i === 3) b -= 68000;
    if (i === 5) b -= 31200;
    if (i === 7) b -= 48000;
    if (i === 8) b -= 42000;
    if (i === 9 + receivableDelay) b += 52000;
    if (i === 12 + receivableDelay) b += 38000;
    return Math.max(b, b); // no cumulation for simplicity; engine does the full walk
  });

  // Progressive simulation line (cumulative)
  const simulatedPositions = Array.from({ length: 30 }, (_, i) => {
    const start = (state?.available_cash ?? 182000) - cashReduction * 1000;
    const deltas = [
      [3, -68000],
      [5, -31200],
      [7, -48000],
      [supplierBDefer, -42000],
      [awsDefer, -18700],
      [9 + receivableDelay, 52000],
      [12 + receivableDelay, 38000],
    ] as const;
    const totalDelta = deltas.reduce((sum, [day, delta]) => (day <= i ? sum + delta : sum), 0);
    return start + totalDelta;
  });

  const newRunway = simulatedPositions.findIndex(b => b < 0);
  const baselineRunway = state?.runway_days ?? 6;
  const runwayDelta = newRunway === -1 ? 30 - baselineRunway : newRunway - baselineRunway;

  const penaltyEstimate = (supplierBDefer > 0 ? 80 * supplierBDefer : 0);
  const taxImpact = ((taxRate - (state?.tax_rate ?? 0.18) * 100) / 100) * (state?.cash_balance ?? 210000);

  return (
    <div className="space-y-6">
      <Alert variant="info">
        <strong>What-If Engine:</strong> Adjust parameters below. All calculations are deterministic — the LLM is not involved. Hit "Run Simulation" to see the updated consequence model.
      </Alert>

      <div className="grid grid-cols-5 gap-4">
        {/* Controls */}
        <div className="col-span-2 bg-figma-card rounded-2xl p-5 space-y-6">
          <SectionHeader title="Simulation Parameters" sub="Adjust and run to see consequences" />

          <SliderControl
            label="Receivable delay"
            value={receivableDelay} min={0} max={21} unit=" days"
            description="How many days receivables are delayed beyond expected date"
            onChange={setReceivableDelay}
          />
          <SliderControl
            label="Supplier B defer window"
            value={supplierBDefer} min={0} max={15} unit=" days"
            description="Days to defer Rajesh Logistics (max 15 per contract)"
            onChange={setSupplierBDefer}
          />
          <SliderControl
            label="AWS defer window"
            value={awsDefer} min={0} max={30} unit=" days"
            description="Days to defer AWS infrastructure invoice"
            onChange={setAwsDefer}
          />
          <SliderControl
            label="Cash reduction (shock)"
            value={cashReduction} min={0} max={100} step={5} unit="K"
            description="Simulate a sudden cash reduction (unexpected expense)"
            onChange={setCashReduction}
          />
          <SliderControl
            label="Tax reservation rate"
            value={taxRate} min={5} max={35} unit="%"
            description="Adjust your tax ring-fence rate"
            onChange={setTaxRate}
          />

          <button
            onClick={runSim}
            disabled={loading}
            className="w-full py-3 bg-figma-yellow text-slate-900 rounded-xl font-bold text-sm hover:bg-figma-yellow/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Running simulation…' : '▶ Run Simulation'}
          </button>
        </div>

        {/* Results */}
        <div className="col-span-3 space-y-4">
          <div className="bg-figma-card rounded-2xl p-5">
            <SectionHeader title="Simulated Cash Flow" sub="Yellow = simulated · Dashed = baseline" />
            <MiniChart baseline={baselinePositions} simulated={simulatedPositions} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ResultMetric
              label="New runway estimate"
              value={newRunway === -1 ? '> 30 days' : `${newRunway} days`}
              color={newRunway === -1 || newRunway > 14 ? 'text-emerald-400' : newRunway > 7 ? 'text-amber-400' : 'text-red-400'}
            />
            <ResultMetric
              label="Runway delta vs baseline"
              value={runwayDelta >= 0 ? `+${runwayDelta} days` : `${runwayDelta} days`}
              color={runwayDelta > 0 ? 'text-emerald-400' : runwayDelta === 0 ? 'text-slate-400' : 'text-red-400'}
            />
            <ResultMetric
              label="Est. deferral penalty"
              value={fmtFull(penaltyEstimate)}
              color={penaltyEstimate > 5000 ? 'text-red-400' : penaltyEstimate > 0 ? 'text-amber-400' : 'text-emerald-400'}
            />
            <ResultMetric
              label="Tax rate impact"
              value={taxImpact >= 0 ? `+${fmtFull(taxImpact)}` : fmtFull(taxImpact)}
              color={taxImpact < 0 ? 'text-emerald-400' : taxImpact > 0 ? 'text-amber-400' : 'text-slate-400'}
            />
          </div>

          {ran && !loading && simResult && (
            <div className="bg-figma-card rounded-2xl p-5">
              <p className="text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-3">Engine Verdict</p>
              <div className="space-y-2">
                {receivableDelay > 7 && (
                  <Alert variant="danger">
                    Receivable delay of {receivableDelay} days causes payroll to be underfunded. Highest fragility vector: <strong>Meera Exports receivable</strong>.
                  </Alert>
                )}
                {cashReduction > 50 && (
                  <Alert variant="danger">
                    Cash shock of ₹{cashReduction}K moves solvency date to Day {newRunway}. Immediate action required.
                  </Alert>
                )}
                {supplierBDefer <= 12 && awsDefer <= 25 && receivableDelay <= 5 && (
                  <Alert variant="info">
                    Parameters are within manageable bounds. Optimal path remains executable with estimated penalty of {fmtFull(penaltyEstimate)}.
                  </Alert>
                )}
                <div className="flex gap-2 flex-wrap mt-2">
                  <Badge variant="green">Paid: {simResult.paid_obligations.length}</Badge>
                  <Badge variant="amber">Deferred: {simResult.deferred_obligations.length}</Badge>
                  <Badge variant={simResult.payroll_protected ? 'green' : 'red'}>
                    Payroll: {simResult.payroll_protected ? 'Protected' : 'At Risk'}
                  </Badge>
                  <Badge variant={simResult.relationship_impact === 'low' ? 'green' : simResult.relationship_impact === 'medium' ? 'amber' : 'red'}>
                    Relationships: {simResult.relationship_impact}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {!ran && (
            <div className="bg-figma-card rounded-2xl p-5 flex items-center justify-center h-32 border border-dashed border-slate-700">
              <p className="text-slate-500 text-sm">Adjust parameters and run the simulation to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
