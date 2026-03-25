import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface FinancialItem {
  id?: number;
  name: string;
  amount: number;
  due_date: string;
  item_type?: 'payable' | 'receivable';
  category?: 'fixed' | 'flexible' | 'strategic' | 'unassigned';
  penalty_rate?: number;
  relationship_risk?: 'low' | 'medium' | 'high';
}

export interface OCRIngestionResponse {
  created_count: number;
  items: FinancialItem[];
}

export interface ActionDirective {
  item_id: number;
  name: string;
  action: 'Pay' | 'Negotiate' | 'Delay';
  amount_to_pay: number;
  justification: string;
}

export interface NegotiationEmailResponse {
  item_id: number;
  vendor_name: string;
  relationship_tier: 'Formal' | 'Strategic' | 'Flexible';
  amount_total: number;
  amount_to_pay_now: number;
  amount_deferred: number;
  subject: string;
  body: string;
}

export const FinanceAPI = {
  getInsights: () => api.get('/engine/insights'),
  getActions: () => api.get<ActionDirective[]>('/engine/actions'),
  generateNegotiationEmail: (itemId: number) =>
    api.post<NegotiationEmailResponse>(`/engine/actions/${itemId}/negotiation-email`),
  getPayables: () => api.get('/payables/'),
  getReceivables: () => api.get('/receivables/'),
  addPayable: (data: FinancialItem) => api.post('/payables/', data),
  addReceivable: (data: FinancialItem) => api.post('/receivables/', data),
  deletePayable: (id: number) => api.delete(`/payables/${id}`),
  deleteReceivable: (id: number) => api.delete(`/receivables/${id}`),
  uploadOCRDocument: (file: File, defaultItemType: 'payable' | 'receivable' = 'payable') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('default_item_type', defaultItemType);
    return api.post<OCRIngestionResponse>('/ingestion/ocr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getBalance: () => api.get('/accounts/'),
  updateBalance: (amount: number) => api.post('/accounts/', { amount }),
};
