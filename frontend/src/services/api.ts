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

export const FinanceAPI = {
  getInsights: () => api.get('/engine/insights'),
  getActions: () => api.get('/engine/actions'),
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
