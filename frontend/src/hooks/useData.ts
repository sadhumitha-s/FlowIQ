import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type {
  FinancialState,
  RunwayResult,
  ScenarioResult,
  ActionItem,
  Transaction,
  PaymentCard,
  WorkspaceSettings,
} from '../types';

function useFetch<T>(fetchFn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}

export const useFinancialState = () =>
  useFetch<FinancialState>(() => api.getFinancialState());

export const useRunway = () =>
  useFetch<RunwayResult>(() => api.getRunway());

export const useScenarios = () =>
  useFetch<ScenarioResult[]>(() => api.getScenarios());

export const useActions = () =>
  useFetch<ActionItem[]>(() => api.getActions());

export const useTransactions = () =>
  useFetch<Transaction[]>(() => api.getTransactions());

export const usePaymentCards = () =>
  useFetch<PaymentCard[]>(() => api.getPaymentCards());

export const useSettings = () =>
  useFetch<WorkspaceSettings>(() => api.getSettings());
