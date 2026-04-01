// ─── Financial State ────────────────────────────────────────────────────────

export type ObligationType = 'employee' | 'tax' | 'lender' | 'utility' | 'supplier';
export type ObligationCluster = 'Fixed' | 'Flexible' | 'Strategic';
export type ObligationStatus = 'pending' | 'paid' | 'deferred' | 'negotiating';
export type ActionDirective = 'PAY' | 'DELAY' | 'NEGOTIATE' | 'PARTIAL';

export interface Obligation {
  id: string;
  counterparty: string;
  counterparty_type: ObligationType;
  cluster: ObligationCluster;
  amount: number;
  due_date: string;           // ISO date string
  days_until_due: number;     // computed
  penalty_per_day: number;
  penalty_pct: number;
  is_negotiable: boolean;
  max_defer_days: number;
  relationship_score: number; // 0–1
  status: ObligationStatus;
  score: number;              // deterministic engine score
  directive: ActionDirective;
}

export interface Receivable {
  id: string;
  counterparty: string;
  amount: number;
  expected_date: string;
  collection_confidence: number; // 0–1
  status: 'outstanding' | 'received' | 'disputed';
}

export interface FinancialState {
  cash_balance: number;
  available_cash: number;       // after tax reservation
  tax_reserved: number;
  tax_rate: number;
  total_obligations: number;
  total_receivables_expected: number;
  shortfall: number;
  runway_days: number | null;
  as_of_date: string;
  payables: Obligation[];
  receivables: Receivable[];
}

// ─── Runway / Projection ────────────────────────────────────────────────────

export interface DailyPosition {
  date: string;
  balance: number;
  balance_optimal: number;
}

export interface RunwayResult {
  days_to_zero: number | null;
  minimum_balance: number;
  minimum_balance_date: string;
  daily_positions: DailyPosition[];
  failure_modes: FailureMode[];
}

export interface FailureMode {
  date: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  amount: number;
}

// ─── Scenarios ───────────────────────────────────────────────────────────────

export interface ScenarioResult {
  scenario: 'optimal' | 'chronological' | 'custom';
  label: string;
  paid_obligations: Obligation[];
  deferred_obligations: Obligation[];
  remaining_cash: number;
  estimated_penalty: number;
  payroll_protected: boolean;
  relationship_impact: 'low' | 'medium' | 'critical';
  net_cost: number;
}

export interface SimulationParams {
  delay_receivable_days?: number;
  override_directives?: Record<string, ActionDirective>;
  partial_payments?: Record<string, number>;
}

// ─── COT / Explainability ────────────────────────────────────────────────────

export interface ScoreBreakdown {
  obligation_id: string;
  urgency: number;
  penalty_weight: number;
  relationship_score: number;
  flexibility_discount: number;
  type_multiplier: number;
  final_score: number;
  formulas: Record<string, string>;
}

// ─── Actions / Emails ────────────────────────────────────────────────────────

export interface ActionItem {
  obligation: Obligation;
  directive: ActionDirective;
  reason: string;
  email_draft?: EmailDraft;
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  tone: string;
  strategy: string;
}

// ─── Ingestion ───────────────────────────────────────────────────────────────

export interface ParsedDocument {
  id: string;
  filename: string;
  vendor: string;
  amount: number;
  date: string;
  due_date: string;
  category: string;
  invoice_number: string;
  confidence: number;
  field_confidences: Record<string, number>;
  status: 'parsed' | 'accepted' | 'error';
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  ok: boolean;
  error?: string;
}

// ─── Core Models ─────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  counterparty?: string;
  date: string;
}

export interface PaymentCard {
  id: string;
  brand?: string;
  last4?: string;
  expiry?: string;
  spending_limit?: number;
}

export interface WorkspaceSettings {
  tax_rate: number;
  theme: string;
  notifications_enabled: boolean;
}
