import axios from 'axios';
import type {
  FinancialState,
  RunwayResult,
  ScenarioResult,
  ScoreBreakdown,
  ActionItem,
  ActionDirective,
  EmailDraft,
  ParsedDocument,
  SimulationParams,
  Obligation,
} from '../types';
import { DEMO_EMAIL, DEMO_PASSWORD, ALLOW_MOCKS } from '../config/demo';

const BASE = 'http://localhost:8000/api/v1';

const http = axios.create({
  baseURL: BASE,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

// ─── Mock Data ───────────────────────────────────────────────────────────────
// Used when backend is unavailable (hackathon demo safety net).

const MOCK_OBLIGATIONS: Obligation[] = [
  {
    id: 'ob-1', counterparty: 'Employee Payroll', counterparty_type: 'employee',
    cluster: 'Fixed', amount: 68000, due_date: isoDate(3), days_until_due: 3,
    penalty_per_day: 0, penalty_pct: 0, is_negotiable: false, max_defer_days: 0,
    relationship_score: 1.0, status: 'pending', score: 0.97, directive: 'PAY',
  },
  {
    id: 'ob-2', counterparty: 'GST Payment (GSTIN)', counterparty_type: 'tax',
    cluster: 'Fixed', amount: 31200, due_date: isoDate(6), days_until_due: 6,
    penalty_per_day: 500, penalty_pct: 0.018, is_negotiable: false, max_defer_days: 0,
    relationship_score: 0.9, status: 'pending', score: 0.91, directive: 'PAY',
  },
  {
    id: 'ob-3', counterparty: 'Sharma Fabrics (Supplier A)', counterparty_type: 'supplier',
    cluster: 'Flexible', amount: 54000, due_date: isoDate(5), days_until_due: 5,
    penalty_per_day: 0, penalty_pct: 0.015, is_negotiable: true, max_defer_days: 10,
    relationship_score: 0.8, status: 'pending', score: 0.74, directive: 'NEGOTIATE',
  },
  {
    id: 'ob-4', counterparty: 'Office Rent — MG Road', counterparty_type: 'utility',
    cluster: 'Fixed', amount: 48000, due_date: isoDate(7), days_until_due: 7,
    penalty_per_day: 0, penalty_pct: 0, is_negotiable: false, max_defer_days: 0,
    relationship_score: 0.7, status: 'pending', score: 0.68, directive: 'PAY',
  },
  {
    id: 'ob-5', counterparty: 'Rajesh Logistics (Supplier B)', counterparty_type: 'supplier',
    cluster: 'Flexible', amount: 42000, due_date: isoDate(8), days_until_due: 8,
    penalty_per_day: 80, penalty_pct: 0.02, is_negotiable: true, max_defer_days: 15,
    relationship_score: 0.65, status: 'pending', score: 0.52, directive: 'DELAY',
  },
  {
    id: 'ob-6', counterparty: 'AWS Cloud Infrastructure', counterparty_type: 'utility',
    cluster: 'Strategic', amount: 18700, due_date: isoDate(11), days_until_due: 11,
    penalty_per_day: 0, penalty_pct: 0, is_negotiable: true, max_defer_days: 30,
    relationship_score: 0.5, status: 'pending', score: 0.31, directive: 'DELAY',
  },
];

const MOCK_STATE: FinancialState = {
  cash_balance: 210000,
  available_cash: 182000,
  tax_reserved: 28400,
  tax_rate: 0.18,
  total_obligations: 341900,
  total_receivables_expected: 124000,
  shortfall: 159900,
  runway_days: 6,
  as_of_date: new Date().toISOString().split('T')[0],
  payables: MOCK_OBLIGATIONS,
  receivables: [
    { id: 'rec-1', counterparty: 'Meera Exports', amount: 52000, expected_date: isoDate(9), collection_confidence: 0.92, status: 'outstanding' },
    { id: 'rec-2', counterparty: 'Patel Industries', amount: 38000, expected_date: isoDate(12), collection_confidence: 0.85, status: 'outstanding' },
    { id: 'rec-3', counterparty: 'Chennai Wholesale', amount: 34000, expected_date: isoDate(15), collection_confidence: 0.78, status: 'outstanding' },
  ],
};

function buildDailyPositions() {
  const positions = [];
  let unmanaged = 182000;
  let optimal = 182000;
  for (let i = 0; i <= 30; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const date = d.toISOString().split('T')[0];
    if (i === 3)  { unmanaged -= 68000; optimal -= 68000; }
    if (i === 5)  { unmanaged -= 31200; optimal -= 31200; }
    if (i === 7)  { unmanaged -= 54000; }
    if (i === 7)  { unmanaged -= 48000; optimal -= 48000; }
    if (i === 8)  { unmanaged -= 42000; }
    if (i === 9)  { unmanaged += 52000; optimal += 52000; }
    if (i === 11) { unmanaged -= 18700; }
    if (i === 12) { unmanaged += 38000; optimal += 38000; }
    if (i === 15) { unmanaged += 34000; optimal += 34000; }
    if (i === 20) { optimal -= 42000; }
    if (i === 25) { optimal -= 18700; }
    positions.push({ date, balance: unmanaged, balance_optimal: optimal });
  }
  return positions;
}

const MOCK_RUNWAY: RunwayResult = {
  days_to_zero: 6,
  minimum_balance: -13200,
  minimum_balance_date: isoDate(8),
  daily_positions: buildDailyPositions(),
  failure_modes: [
    { date: isoDate(3), description: 'Payroll ₹68,000 hits before Meera Exports receivable (₹52,000, arrives Day 9)', severity: 'critical', amount: 68000 },
    { date: isoDate(7), description: 'Rent + Supplier A overlap creates ₹34,000 shortfall at same settlement window', severity: 'warning', amount: 34000 },
    { date: isoDate(8), description: 'Supplier B 2% late fee triggers if not cleared — penalty ₹840/period', severity: 'info', amount: 840 },
  ],
};

const MOCK_OPTIMAL: ScenarioResult = {
  scenario: 'optimal', label: 'Optimal Path',
  paid_obligations: MOCK_OBLIGATIONS.filter(o => ['ob-1','ob-2','ob-4'].includes(o.id)),
  deferred_obligations: MOCK_OBLIGATIONS.filter(o => ['ob-5','ob-6'].includes(o.id)),
  remaining_cash: 12100, estimated_penalty: 840,
  payroll_protected: true, relationship_impact: 'low', net_cost: 840,
};

const MOCK_CHRONO: ScenarioResult = {
  scenario: 'chronological', label: 'Chronological Path',
  paid_obligations: MOCK_OBLIGATIONS.filter(o => ['ob-3','ob-4','ob-2'].includes(o.id)),
  deferred_obligations: MOCK_OBLIGATIONS.filter(o => ['ob-1','ob-5','ob-6'].includes(o.id)),
  remaining_cash: -3200, estimated_penalty: 10240,
  payroll_protected: false, relationship_impact: 'critical', net_cost: 10240,
};

const MOCK_ACTIONS: ActionItem[] = MOCK_OBLIGATIONS.map(ob => ({
  obligation: ob,
  directive: ob.directive,
  reason: {
    PAY: `Score ${ob.score} · Non-deferrable · Pay immediately to avoid penalty`,
    DELAY: `Score ${ob.score} · ${ob.max_defer_days}-day window · Est. penalty ₹${(ob.penalty_per_day * 12).toLocaleString('en-IN')}`,
    NEGOTIATE: `Score ${ob.score} · Long-term partner · Partial payment acceptable`,
    PARTIAL: `Score ${ob.score} · Split payment recommended`,
  }[ob.directive],
  email_draft: (ob.directive === 'DELAY' || ob.directive === 'NEGOTIATE') ? {
    to: `accounts@${ob.counterparty.toLowerCase().replace(/[^a-z]/g,'')}.com`,
    subject: `Payment Schedule Update — ${ob.counterparty}`,
    body: `Dear ${ob.counterparty},\n\nI hope this message finds you well. We are currently managing a short-term receivables gap — a confirmed payment is expected to clear within the next 10 days.\n\nWe would like to propose a revised settlement date of ${isoDate(ob.max_defer_days)}, and we acknowledge any applicable late fees.\n\nWe deeply value our relationship and want to maintain full transparency.\n\nWarm regards,\nRavi Krishnamurthy\nRavi Textiles Ltd.`,
    tone: ob.relationship_score > 0.75 ? 'Collaborative' : 'Formal',
    strategy: ob.relationship_score > 0.75 ? 'Long-term partner deferral' : 'Structured negotiation',
  } : undefined,
}));

// ─── Safe fetch wrapper ───────────────────────────────────────────────────────

async function safe<T>(fetchFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fetchFn();
  } catch (err) {
    if (!ALLOW_MOCKS) throw err;
    return fallback;
  }
}

type BackendItem = {
  id: number;
  name: string;
  amount: number;
  due_date: string;
  item_type: 'payable' | 'receivable';
  category?: 'fixed' | 'flexible' | 'strategic' | 'unassigned';
  penalty_rate?: number;
  relationship_risk?: 'low' | 'medium' | 'high';
};

type BackendInsight = {
  current_cash: number;
  tax_envelope: number;
  available_operational_cash: number;
  runway_days: number;
  failure_modes: string[];
};

type BackendDirective = {
  item_id: number;
  name: string;
  action: 'Pay' | 'Delay' | 'Negotiate';
  amount_to_pay: number;
  justification: string;
};

function toDirective(action?: BackendDirective['action']): ActionDirective {
  if (action === 'Pay') return 'PAY';
  if (action === 'Negotiate') return 'NEGOTIATE';
  return 'DELAY';
}

function toCluster(category?: BackendItem['category']): Obligation['cluster'] {
  if (category === 'fixed') return 'Fixed';
  if (category === 'strategic') return 'Strategic';
  return 'Flexible';
}

function toCounterpartyType(category?: BackendItem['category']): Obligation['counterparty_type'] {
  if (category === 'fixed') return 'utility';
  if (category === 'strategic') return 'supplier';
  return 'supplier';
}

function daysUntil(dateIso: string): number {
  const due = new Date(dateIso);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((due.getTime() - now.getTime()) / 86400000));
}

function scoreFor(payable: BackendItem): number {
  const urgency = Math.max(0.1, 1 - (daysUntil(payable.due_date) / 45));
  const riskBoost =
    payable.relationship_risk === 'high' ? 0.2 :
    payable.relationship_risk === 'medium' ? 0.1 : 0.0;
  const clusterBoost = payable.category === 'fixed' ? 0.18 : payable.category === 'strategic' ? 0.1 : 0.0;
  return Math.min(0.99, Number((urgency + riskBoost + clusterBoost).toFixed(2)));
}

function mapFailureMode(raw: string) {
  const dateMatch = raw.match(/on (\d{4}-\d{2}-\d{2})/);
  const amountMatch = raw.match(/Shortfall of \$([0-9,]+(?:\.[0-9]+)?)/);
  return {
    date: dateMatch?.[1] ?? new Date().toISOString().split('T')[0],
    description: raw,
    severity: 'warning' as const,
    amount: amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 0,
  };
}

const localAuthTokenToEmail = new Map<string, string>();

// ─── API Exports ──────────────────────────────────────────────────────────────

export const api = {
  setToken: (token: string) => {
    if (token) {
      http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete http.defaults.headers.common['Authorization'];
    }
  },

  login: async (email: string, password: string) => {
    if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      throw new Error('Invalid demo credentials');
    }
    const access_token = `demo-${btoa(email).replace(/=+$/g, '')}`;
    localAuthTokenToEmail.set(access_token, email);
    return { access_token };
  },

  signup: async (email: string, password: string) => {
    throw new Error('Signup disabled for demo access');
  },

  getProfile: async () => {
    try {
      const r = await http.get('/user/profile');
      return r.data;
    } catch {
      const authHeader = http.defaults.headers.common['Authorization'];
      const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : '';
      const email = localAuthTokenToEmail.get(token) ?? DEMO_EMAIL;
      return { id: token || 'demo-user', email };
    }
  },

  getFinancialState: () =>
    safe(async () => {
      const [balanceRes, payablesRes, receivablesRes, insightsRes, actionsRes] = await Promise.all([
        http.get<{ amount: number }>('/accounts/'),
        http.get<BackendItem[]>('/payables/'),
        http.get<BackendItem[]>('/receivables/'),
        http.get<BackendInsight>('/engine/insights'),
        http.get<BackendDirective[]>('/engine/actions'),
      ]);

      if (ALLOW_MOCKS && (payablesRes.data?.length ?? 0) === 0 && (receivablesRes.data?.length ?? 0) === 0) {
        return MOCK_STATE;
      }

      const actionById = new Map(actionsRes.data.map((a) => [a.item_id, a]));

      const payables: Obligation[] = payablesRes.data.map((p) => {
        const directive = actionById.get(p.id);
        return {
          id: String(p.id),
          counterparty: p.name,
          counterparty_type: toCounterpartyType(p.category),
          cluster: toCluster(p.category),
          amount: p.amount,
          due_date: p.due_date,
          days_until_due: daysUntil(p.due_date),
          penalty_per_day: Number(((p.penalty_rate ?? 0) * p.amount).toFixed(2)),
          penalty_pct: p.penalty_rate ?? 0,
          is_negotiable: true,
          max_defer_days: 14,
          relationship_score: p.relationship_risk === 'high' ? 0.9 : p.relationship_risk === 'medium' ? 0.75 : 0.6,
          status: 'pending',
          score: scoreFor(p),
          directive: toDirective(directive?.action),
        };
      });

      const receivables = receivablesRes.data.map((r) => ({
        id: String(r.id),
        counterparty: r.name,
        amount: r.amount,
        expected_date: r.due_date,
        collection_confidence: 0.85,
        status: 'outstanding' as const,
      }));

      const totalObligations = payables.reduce((sum, p) => sum + p.amount, 0);
      const taxRate = receivables.length > 0
        ? Math.max(0, Math.min(1, insightsRes.data.tax_envelope / receivables.reduce((sum, r) => sum + r.amount, 0)))
        : MOCK_STATE.tax_rate;

      return {
        cash_balance: balanceRes.data.amount ?? insightsRes.data.current_cash,
        available_cash: insightsRes.data.available_operational_cash,
        tax_reserved: insightsRes.data.tax_envelope,
        tax_rate: Number(taxRate.toFixed(2)),
        total_obligations: totalObligations,
        total_receivables_expected: receivables.reduce((sum, r) => sum + r.amount, 0),
        shortfall: Math.max(0, totalObligations - insightsRes.data.available_operational_cash),
        runway_days: insightsRes.data.runway_days,
        as_of_date: new Date().toISOString().split('T')[0],
        payables,
        receivables,
      } as FinancialState;
    }, MOCK_STATE),

  getRunway: () =>
    safe(async () => {
      const insights = await http.get<BackendInsight>('/engine/insights');
      if (ALLOW_MOCKS && (!insights.data || !Array.isArray(insights.data.failure_modes))) {
        return MOCK_RUNWAY;
      }
      return {
        ...MOCK_RUNWAY,
        days_to_zero: insights.data.runway_days,
        failure_modes: insights.data.failure_modes.map(mapFailureMode),
      } as RunwayResult;
    }, MOCK_RUNWAY),

  getScenarios: () =>
    safe(async () => {
      const r = await http.get<ScenarioResult[]>('/core/scenarios');
      if (ALLOW_MOCKS && (!r.data || r.data.length < 2)) {
        return [MOCK_OPTIMAL, MOCK_CHRONO];
      }
      return r.data;
    }, [MOCK_OPTIMAL, MOCK_CHRONO]),

  getActions: () =>
    safe(async () => {
      const [payablesRes, actionsRes] = await Promise.all([
        http.get<BackendItem[]>('/payables/'),
        http.get<BackendDirective[]>('/engine/actions'),
      ]);

      if (ALLOW_MOCKS && (actionsRes.data?.length ?? 0) === 0) {
        return MOCK_ACTIONS;
      }

      const payableById = new Map(payablesRes.data.map((p) => [p.id, p]));
      return actionsRes.data
        .map((a): ActionItem | null => {
          const item = payableById.get(a.item_id);
          if (!item) return null;

          const directive = toDirective(a.action);
          const obligation: Obligation = {
            id: String(item.id),
            counterparty: item.name,
            counterparty_type: toCounterpartyType(item.category),
            cluster: toCluster(item.category),
            amount: item.amount,
            due_date: item.due_date,
            days_until_due: daysUntil(item.due_date),
            penalty_per_day: Number(((item.penalty_rate ?? 0) * item.amount).toFixed(2)),
            penalty_pct: item.penalty_rate ?? 0,
            is_negotiable: directive !== 'PAY',
            max_defer_days: 14,
            relationship_score: item.relationship_risk === 'high' ? 0.9 : item.relationship_risk === 'medium' ? 0.75 : 0.6,
            status: 'pending',
            score: scoreFor(item),
            directive,
          };

          return {
            obligation,
            directive,
            reason: a.justification,
          };
        })
        .filter((x): x is ActionItem => x !== null);
    }, MOCK_ACTIONS),

  getScoreBreakdown: (id: string) =>
    safe(async () => {
      const r = await http.get<ScoreBreakdown>(`/core/obligations/${id}/score`);
      return r.data;
    }, {
      obligation_id: id,
      urgency: 0.638,
      penalty_weight: 0.0,
      relationship_score: 1.0,
      flexibility_discount: 1.0,
      type_multiplier: 1.5,
      final_score: 0.97,
      formulas: {
        urgency: 'exp(−0.15 × days_until_due)',
        penalty_weight: 'min(penalty_per_day / amount, 1.0)',
        flexibility_discount: '1 − (0.3 × max_defer_days / 30)',
        final: 'urgency × (1 + penalty_weight) × relationship_score × flexibility_discount × type_multiplier',
      },
    } as ScoreBreakdown),

  runSimulation: (params: SimulationParams) =>
    safe(async () => {
      const r = await http.post<ScenarioResult[]>('/core/simulate', params);
      return r.data;
    }, [MOCK_OPTIMAL, MOCK_CHRONO]),

  generateEmail: (obligationId: string) =>
    safe(async () => {
      const r = await http.post<{
        vendor_name: string;
        relationship_tier: string;
        subject: string;
        body: string;
      }>(`/engine/actions/${obligationId}/negotiation-email`);
      return {
        to: `accounts@${r.data.vendor_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        subject: r.data.subject,
        body: r.data.body,
        tone: r.data.relationship_tier,
        strategy: 'Engine-generated partial payment proposal',
      } as EmailDraft;
    }, MOCK_ACTIONS.find(a => a.obligation.id === obligationId)?.email_draft),

  uploadDocument: async (file: File): Promise<ParsedDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    return safe(async () => {
      const r = await http.post<{ items: BackendItem[] }>('/ingestion/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const first = r.data.items?.[0];
      if (!first) {
        throw new Error('No parsed item returned');
      }
      return {
        id: String(first.id),
        filename: file.name,
        vendor: first.name,
        amount: first.amount,
        date: new Date().toISOString().split('T')[0],
        due_date: first.due_date,
        category: toCluster(first.category),
        invoice_number: `AUTO-${first.id}`,
        confidence: 0.88,
        field_confidences: {
          vendor: 0.9,
          amount: 0.95,
          date: 0.82,
          due_date: 0.88,
          category: 0.8,
        },
        status: 'parsed',
      } as ParsedDocument;
    }, {
      id: `doc-${Date.now()}`,
      filename: file.name,
      vendor: 'Rajesh Logistics Pvt. Ltd.',
      amount: 42000,
      date: new Date().toISOString().split('T')[0],
      due_date: isoDate(8),
      category: 'Logistics / Freight',
      invoice_number: 'RL-2042',
      confidence: 0.87,
      field_confidences: { vendor: 0.96, amount: 0.99, date: 0.92, due_date: 0.87, category: 0.94 },
      status: 'parsed',
    });
  },
};

export default api;
