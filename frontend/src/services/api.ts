import axios from 'axios';
import type {
  FinancialState,
  RunwayResult,
  ScenarioResult,
  ScoreBreakdown,
  ActionItem,
  EmailDraft,
  ParsedDocument,
  SimulationParams,
  Obligation,
} from '../types';

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
  } catch {
    return fallback;
  }
}

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
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    const r = await http.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return r.data;
  },

  signup: async (email: string, password: string) => {
    const r = await http.post('/auth/signup', { email, password });
    return r.data;
  },

  getProfile: async () => {
    const r = await http.get('/user/profile');
    return r.data;
  },

  getFinancialState: () =>
    safe(async () => {
      const r = await http.get<FinancialState>('/core/dashboard');
      // map backend MVP shape to frontend
      return { ...MOCK_STATE, ...r.data };
    }, MOCK_STATE),

  getRunway: () =>
    safe(async () => {
      const r = await http.get<RunwayResult>('/core/runway');
      return r.data;
    }, MOCK_RUNWAY),

  getScenarios: () =>
    safe(async () => {
      const r = await http.get<ScenarioResult[]>('/core/scenarios');
      return r.data;
    }, [MOCK_OPTIMAL, MOCK_CHRONO]),

  getActions: () =>
    safe(async () => {
      const r = await http.get<ActionItem[]>('/core/actions');
      return r.data;
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
      const r = await http.post<EmailDraft>(`/core/actions/${obligationId}/email`);
      return r.data;
    }, MOCK_ACTIONS.find(a => a.obligation.id === obligationId)?.email_draft),

  uploadDocument: async (file: File): Promise<ParsedDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    return safe(async () => {
      const r = await http.post<ParsedDocument>('/core/ingest/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return r.data;
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
