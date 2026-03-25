import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Copy, Loader2, Mail } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FinanceAPI,
  type ActionDirective,
  type CashRunwayStressSimulationResponse,
  type FinancialItem,
  type NegotiationEmailResponse,
} from '../services/api';

interface DashboardInsight {
  current_cash: number;
  tax_envelope: number;
  available_operational_cash: number;
  runway_days: number;
  failure_modes: string[];
}

const MAX_SHIFT_DAYS = 90;
const MIN_SHIFT_DAYS = -60;

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function toDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const base = new Date(`${isoDate}T00:00:00`);
  base.setDate(base.getDate() + deltaDays);
  return toDateInputValue(base);
}

function dayDiffFromBase(baseIsoDate: string, targetIsoDate: string): number {
  const base = new Date(`${baseIsoDate}T00:00:00`);
  const target = new Date(`${targetIsoDate}T00:00:00`);
  if (Number.isNaN(base.getTime()) || Number.isNaN(target.getTime())) {
    return 0;
  }
  return Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function Dashboard() {
  const [insight, setInsight] = useState<DashboardInsight | null>(null);
  const [actions, setActions] = useState<ActionDirective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [emailByItemId, setEmailByItemId] = useState<Record<number, NegotiationEmailResponse>>({});
  const [emailLoadingByItemId, setEmailLoadingByItemId] = useState<Record<number, boolean>>({});
  const [copiedItemId, setCopiedItemId] = useState<number | null>(null);
  const [payables, setPayables] = useState<FinancialItem[]>([]);
  const [selectedPayableId, setSelectedPayableId] = useState<number | null>(null);
  const [dateShiftDays, setDateShiftDays] = useState<number>(0);
  const [simulation, setSimulation] = useState<CashRunwayStressSimulationResponse | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const simulationRequestRef = useRef(0);

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
        const payablesRes = await FinanceAPI.getPayables();
        const fetchedPayables: FinancialItem[] = payablesRes.data;
        setPayables(fetchedPayables);
        if (fetchedPayables.length > 0) {
          setSelectedPayableId((prev) => prev ?? fetchedPayables[0].id ?? null);
        }
      } catch {
        setError('Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const selectedPayable = useMemo(
    () => payables.find((item) => item.id === selectedPayableId) ?? null,
    [payables, selectedPayableId],
  );

  const simulatedDueDate = useMemo(() => {
    if (!selectedPayable) {
      return '';
    }
    return shiftIsoDate(selectedPayable.due_date, dateShiftDays);
  }, [selectedPayable, dateShiftDays]);

  useEffect(() => {
    if (!selectedPayableId) {
      setDateShiftDays(0);
      return;
    }
    setDateShiftDays(0);
  }, [selectedPayableId]);

  useEffect(() => {
    if (!selectedPayable || !selectedPayable.id || !simulatedDueDate) {
      setSimulation(null);
      return;
    }
    const requestId = simulationRequestRef.current + 1;
    simulationRequestRef.current = requestId;

    const timeout = setTimeout(() => {
      setSimulationLoading(true);
      setSimulationError(null);
      void FinanceAPI.simulateCashRunwayStress({
        item_id: selectedPayable.id as number,
        due_date: simulatedDueDate,
      })
        .then((res) => {
          if (simulationRequestRef.current === requestId) {
            setSimulation(res.data);
          }
        })
        .catch(() => {
          if (simulationRequestRef.current === requestId) {
            setSimulationError('Unable to run runway stress simulation.');
          }
        })
        .finally(() => {
          if (simulationRequestRef.current === requestId) {
            setSimulationLoading(false);
          }
        });
    }, 220);

    return () => {
      clearTimeout(timeout);
    };
  }, [selectedPayable, simulatedDueDate]);

  const actionCounts = useMemo(() => {
    const counts = { Pay: 0, Negotiate: 0, Delay: 0 };
    for (const action of actions) {
      counts[action.action] += 1;
    }
    return counts;
  }, [actions]);

  const simulatedActionForSelected = useMemo(() => {
    if (!simulation || !selectedPayable?.id) {
      return null;
    }
    return simulation.actions.find((action) => action.item_id === selectedPayable.id) ?? null;
  }, [simulation, selectedPayable]);

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
        <div className="rounded-md border border-[#C4554D]/40 bg-[#C4554D]/10 px-4 py-3 text-sm text-[#8D3D37] flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="border-b border-[#DDE3E8] pb-3">
          <p className="text-[#6B7280] text-sm">Current Cash</p>
          <p className="text-2xl font-semibold mt-1">{insight ? formatCurrency(insight.current_cash) : '--'}</p>
        </div>
        <div className="border-b border-[#DDE3E8] pb-3">
          <p className="text-[#6B7280] text-sm">Tax Envelope</p>
          <p className="text-2xl font-semibold mt-1">{insight ? formatCurrency(insight.tax_envelope) : '--'}</p>
        </div>
        <div className="border-b border-[#DDE3E8] pb-3">
          <p className="text-[#6B7280] text-sm">Operational Cash</p>
          <p className="text-2xl font-semibold mt-1">{insight ? formatCurrency(insight.available_operational_cash) : '--'}</p>
        </div>
        <div className="border-b border-[#DDE3E8] pb-3">
          <p className="text-[#6B7280] text-sm">Runway</p>
          <p className="text-2xl font-semibold mt-1">{insight ? `${insight.runway_days} days` : '--'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border-b border-[#DDE3E8] pb-3">
          <p className="text-[#6B7280] text-sm">Pay</p>
          <p className="text-3xl font-semibold text-[#3A9D5D] mt-1">{actionCounts.Pay}</p>
        </div>
        <div className="border-b border-[#DDE3E8] pb-3">
          <p className="text-[#6B7280] text-sm">Negotiate</p>
          <p className="text-3xl font-semibold text-[#B7811E] mt-1">{actionCounts.Negotiate}</p>
        </div>
        <div className="border-b border-[#DDE3E8] pb-3">
          <p className="text-[#6B7280] text-sm">Delay</p>
          <p className="text-3xl font-semibold text-[#2B2F36] mt-1">{actionCounts.Delay}</p>
        </div>
      </div>

      <div className="border-b border-[#DDE3E8] pb-6">
        <h2 className="text-lg font-semibold mb-4">Cash Runway Stress Simulation</h2>

        {payables.length === 0 ? (
          <p className="text-[#6B7280]">Add payable items to run due-date stress simulation.</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#6B7280] mb-2">Payable</label>
                <select
                  value={selectedPayableId ?? ''}
                  onChange={(event) => setSelectedPayableId(Number(event.target.value))}
                  className="w-full rounded-md border border-[#DDE3E8] bg-white px-3 py-2 text-[#2B2F36]"
                >
                  {payables
                    .filter((item): item is FinancialItem & { id: number } => typeof item.id === 'number')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({formatCurrency(item.amount)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#6B7280] mb-2">Simulated Due Date</label>
                <input
                  type="date"
                  value={simulatedDueDate}
                  onChange={(event) => {
                    if (!selectedPayable) {
                      return;
                    }
                    if (!event.target.value) {
                      return;
                    }
                    const nextShift = dayDiffFromBase(selectedPayable.due_date, event.target.value);
                    setDateShiftDays(clamp(nextShift, MIN_SHIFT_DAYS, MAX_SHIFT_DAYS));
                  }}
                  className="w-full rounded-md border border-[#DDE3E8] bg-white px-3 py-2 text-[#2B2F36]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm text-[#4B5563] mb-2">
                <span>Move due date by: {dateShiftDays} day{Math.abs(dateShiftDays) === 1 ? '' : 's'}</span>
                {selectedPayable && <span>Original: {selectedPayable.due_date}</span>}
              </div>
              <input
                type="range"
                min={MIN_SHIFT_DAYS}
                max={MAX_SHIFT_DAYS}
                value={dateShiftDays}
                onChange={(event) => setDateShiftDays(clamp(Number(event.target.value), MIN_SHIFT_DAYS, MAX_SHIFT_DAYS))}
                className="w-full accent-[#B7811E]"
              />
            </div>

            {simulationError && (
              <div className="rounded-md border border-[#C4554D]/40 bg-[#C4554D]/10 px-3 py-2 text-sm text-[#8D3D37]">
                {simulationError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="border-b border-[#DDE3E8] pb-3">
                <p className="text-xs text-[#6B7280]">Projected Runway</p>
                <p className="text-lg font-semibold mt-1">
                  {simulation ? `${simulation.runway_days} days` : '--'}
                </p>
              </div>
              <div className="border-b border-[#DDE3E8] pb-3">
                <p className="text-xs text-[#6B7280]">Action for Selected Payable</p>
                <p className="text-lg font-semibold mt-1">
                  {simulatedActionForSelected
                    ? `${simulatedActionForSelected.action} ${formatCurrency(simulatedActionForSelected.amount_to_pay)}`
                    : '--'}
                </p>
              </div>
              <div className="border-b border-[#DDE3E8] pb-3">
                <p className="text-xs text-[#6B7280]">Simulation Status</p>
                <p className="text-lg font-semibold mt-1">
                  {simulationLoading ? 'Recomputing…' : 'Live'}
                </p>
              </div>
            </div>

            <div className="h-72 rounded-md border border-[#DDE3E8] bg-white p-2">
              {simulation?.curve_points?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={simulation.curve_points.map((point) => ({
                      label: point.day_offset === 0 ? 'Today' : `Day ${point.day_offset}`,
                      cash: point.cumulative_cash,
                    }))}
                    margin={{ top: 12, right: 16, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
                    <XAxis dataKey="label" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 11 }} />
                    <YAxis
                      stroke="#6B7280"
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      tickFormatter={(value) => formatCurrency(Number(value ?? 0))}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value ?? 0))}
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #DDE3E8', borderRadius: '6px' }}
                    />
                    <ReferenceLine y={0} stroke="#C4554D" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="cash" stroke="#2F5BFF" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#6B7280] text-sm">
                  Simulation curve will appear once a scenario is computed.
                </div>
              )}
            </div>

            {simulation?.failure_modes?.length ? (
              <div className="rounded-md border border-[#B7811E]/40 bg-[#B7811E]/10 p-4">
                <p className="text-sm font-semibold text-[#8A6617] mb-2">Projected Failure Modes</p>
                <ul className="space-y-1 text-sm text-[#8A6617]">
                  {simulation.failure_modes.map((mode) => (
                    <li key={mode}>{mode}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-[#3A9D5D]">No cash shortfall is projected in this simulation window.</p>
            )}
          </div>
        )}
      </div>

      <div className="border-b border-[#DDE3E8] pb-6">
        <h2 className="text-lg font-semibold mb-4">Action Plan</h2>

        {loading ? (
          <div className="text-[#6B7280] flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading actions...</div>
        ) : actions.length === 0 ? (
          <p className="text-[#6B7280]">No payable actions available.</p>
        ) : (
          <div className="space-y-4">
            {actions.map((action) => {
              const email = emailByItemId[action.item_id];
              const emailLoading = emailLoadingByItemId[action.item_id] ?? false;

              return (
                <div key={action.item_id} className="border-b border-[#DDE3E8] pb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {action.action === 'Pay' && <CheckCircle2 size={16} className="text-[#3A9D5D]" />}
                        {action.action === 'Negotiate' && <Mail size={16} className="text-[#B7811E]" />}
                        {action.action === 'Delay' && <Clock3 size={16} className="text-[#6B7280]" />}
                        <span className="font-semibold">{action.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-[#F4F6F8] border border-[#DDE3E8] text-[#4B5563]">{action.action}</span>
                      </div>
                      <p className="text-sm text-[#6B7280] mt-1">Pay now: <span className="font-medium text-[#2B2F36]">{formatCurrency(action.amount_to_pay)}</span></p>
                    </div>

                    {action.action === 'Negotiate' && (
                      <button
                        onClick={() => void generateEmail(action.item_id)}
                        disabled={emailLoading}
                        className="bg-[#2F5BFF] disabled:opacity-60 text-white font-medium px-4 py-2 rounded-md transition-colors w-full md:w-auto"
                      >
                        {emailLoading ? 'Generating...' : 'Generate Negotiation Email'}
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-[#6B7280] mt-3">{action.justification}</p>

                  {email && (
                    <div className="mt-4 rounded-md border border-[#DDE3E8] p-4 space-y-3 bg-[#FAFBFC]">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="text-sm text-[#6B7280]">
                          Tier: <span className="font-semibold text-[#2B2F36]">{email.relationship_tier}</span>
                          <span className="mx-2 text-[#9CA3AF]">|</span>
                          Deferred: <span className="font-semibold text-[#2B2F36]">{formatCurrency(email.amount_deferred)}</span>
                        </div>
                        <button
                          onClick={() => void copyEmail(email)}
                          className="inline-flex items-center gap-2 rounded-md border border-[#DDE3E8] px-3 py-2 text-sm text-[#4B5563] bg-white"
                        >
                          <Copy size={14} />
                          {copiedItemId === email.item_id ? 'Copied' : 'Copy Email'}
                        </button>
                      </div>

                      <div className="rounded-md border border-[#DDE3E8] bg-white p-3">
                        <p className="text-sm text-[#6B7280]">Subject</p>
                        <p className="font-medium mt-1">{email.subject}</p>
                      </div>

                      <textarea
                        readOnly
                        value={email.body}
                        className="w-full h-52 rounded-md border border-[#DDE3E8] bg-white p-3 text-sm text-[#2B2F36] resize-y focus:outline-none"
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
