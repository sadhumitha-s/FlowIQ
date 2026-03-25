import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { FinanceAPI, type FinancialItem } from '../services/api';

type ItemType = 'payable' | 'receivable';

function isItemType(value: string): value is ItemType {
  return value === 'payable' || value === 'receivable';
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === 'string'
  ) {
    return (error as { response: { data: { detail: string } } }).response.data.detail;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function Ingestion() {
  const [balance, setBalance] = useState(0);
  const [payables, setPayables] = useState<FinancialItem[]>([]);
  const [receivables, setReceivables] = useState<FinancialItem[]>([]);

  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemDate, setItemDate] = useState('');
  const [itemType, setItemType] = useState<ItemType>('payable');

  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrType, setOcrType] = useState<ItemType>('payable');
  const [isUploadingOCR, setIsUploadingOCR] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [balanceRes, payablesRes, receivablesRes] = await Promise.all([
        FinanceAPI.getBalance(),
        FinanceAPI.getPayables(),
        FinanceAPI.getReceivables(),
      ]);

      setBalance(balanceRes.data.amount || 0);
      setPayables(payablesRes.data);
      setReceivables(receivablesRes.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load financial records.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleUpdateBalance = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setStatus('');

    try {
      await FinanceAPI.updateBalance(Number(balance));
      await fetchData();
      setStatus('Balance updated.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update balance.'));
    }
  };

  const handleAddItem = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setStatus('');

    const parsedAmount = Number(itemAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    const data: FinancialItem = {
      name: itemName.trim(),
      amount: parsedAmount,
      due_date: itemDate,
    };

    try {
      if (itemType === 'payable') {
        await FinanceAPI.addPayable(data);
      } else {
        await FinanceAPI.addReceivable(data);
      }

      setItemName('');
      setItemAmount('');
      setItemDate('');
      await fetchData();
      setStatus('Record added.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to add record.'));
    }
  };

  const handleDelete = async (id: number, type: ItemType) => {
    setError('');
    setStatus('');

    try {
      if (type === 'payable') {
        await FinanceAPI.deletePayable(id);
      } else {
        await FinanceAPI.deleteReceivable(id);
      }
      await fetchData();
      setStatus('Record deleted.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to delete record.'));
    }
  };

  const handleOCRUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setStatus('');

    if (!ocrFile) {
      setError('Select an image before uploading.');
      return;
    }

    try {
      setIsUploadingOCR(true);
      const response = await FinanceAPI.uploadOCRDocument(ocrFile, ocrType);
      setStatus(`Imported ${response.data.created_count} item(s) from OCR.`);
      setOcrFile(null);
      await fetchData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'OCR upload failed.'));
    } finally {
      setIsUploadingOCR(false);
    }
  };

  const handleItemTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (isItemType(event.target.value)) {
      setItemType(event.target.value);
    }
  };

  const handleOCRTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (isItemType(event.target.value)) {
      setOcrType(event.target.value);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto">
      {error && <p className="rounded-md border border-[#C4554D]/40 bg-[#C4554D]/10 px-4 py-2 text-sm text-[#8D3D37]">{error}</p>}
      {status && <p className="rounded-md border border-[#3A9D5D]/40 bg-[#3A9D5D]/10 px-4 py-2 text-sm text-[#2F7D4A]">{status}</p>}

      <div className="border-b border-[#DDE3E8] pb-5">
        <h2 className="text-lg font-semibold mb-4">Core Cash Balance</h2>
        <form onSubmit={handleUpdateBalance} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs text-[#6B7280] mb-1">Current Bank Balance ($)</label>
            <input
              type="number"
              value={balance}
              onChange={(event) => setBalance(Number(event.target.value || 0))}
              className="w-full bg-white border border-[#DDE3E8] rounded-md px-3 py-2 text-[#2B2F36] focus:outline-none focus:border-[#2F5BFF]"
            />
          </div>
          <button type="submit" className="bg-[#2F5BFF] text-white px-4 py-2 rounded-md font-medium">
            Update
          </button>
        </form>
      </div>

      <div className="border-b border-[#DDE3E8] pb-5">
        <h2 className="text-lg font-semibold mb-5">Add Obligation / Receivable</h2>
        <form onSubmit={handleAddItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Name / Vendor</label>
              <input required type="text" value={itemName} onChange={(event) => setItemName(event.target.value)} className="w-full bg-white border border-[#DDE3E8] rounded-md px-3 py-2 text-[#2B2F36]" />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Amount ($)</label>
              <input required min="0.01" step="0.01" type="number" value={itemAmount} onChange={(event) => setItemAmount(event.target.value)} className="w-full bg-white border border-[#DDE3E8] rounded-md px-3 py-2 text-[#2B2F36]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Due Date</label>
              <input
                required
                type="date"
                value={itemDate}
                onChange={(event) => setItemDate(event.target.value)}
                className="w-full bg-white border border-[#DDE3E8] rounded-md px-3 py-2 text-[#2B2F36]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Type</label>
              <select value={itemType} onChange={handleItemTypeChange} className="w-full bg-white border border-[#DDE3E8] rounded-md px-3 py-2 text-[#2B2F36]">
                <option value="payable">Payable (Bill)</option>
                <option value="receivable">Receivable (Invoice)</option>
              </select>
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="w-full bg-[#3A9D5D] text-white px-6 py-2 rounded-md font-medium">
              Add Record
            </button>
          </div>
        </form>
      </div>

      <div className="border-b border-[#DDE3E8] pb-5">
        <h2 className="text-lg font-semibold mb-2">OCR Document Ingestion</h2>
        <p className="text-xs text-[#6B7280] mb-4">
          Upload an image of a financial document. OCR extracts line-items and maps them into the ingestion pipeline.
        </p>
        <form onSubmit={handleOCRUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Document Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setOcrFile(event.target.files?.[0] || null)}
                className="w-full bg-white border border-[#DDE3E8] rounded-md px-3 py-2 text-[#2B2F36]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Default Type (when OCR text is ambiguous)</label>
              <select value={ocrType} onChange={handleOCRTypeChange} className="w-full bg-white border border-[#DDE3E8] rounded-md px-3 py-2 text-[#2B2F36]">
                <option value="payable">Payable (Bill)</option>
                <option value="receivable">Receivable (Invoice)</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={isUploadingOCR}
            className="w-full bg-[#2F5BFF] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium"
          >
            {isUploadingOCR ? 'Processing OCR...' : 'Upload & Parse'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-b border-[#DDE3E8] pb-5">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3A9D5D]"></span> Receivables
          </h3>
          {isLoading && receivables.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Loading receivables...</p>
          ) : (
            <ul className="divide-y divide-[#DDE3E8]">
              {receivables.map((r) => (
                <li key={r.id} className="flex justify-between items-center text-sm py-3">
                  <span>{r.name} <span className="text-[#6B7280] text-xs ml-2">{r.due_date}</span></span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[#3A9D5D]">${r.amount}</span>
                    {(() => {
                      const id = r.id;
                      if (typeof id !== 'number') {
                        return null;
                      }
                      return (
                        <button type="button" onClick={() => void handleDelete(id, 'receivable')} className="text-[#C4554D]">×</button>
                      );
                    })()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-b border-[#DDE3E8] pb-5">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C4554D]"></span> Payables
          </h3>
          {isLoading && payables.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Loading payables...</p>
          ) : (
            <ul className="divide-y divide-[#DDE3E8]">
              {payables.map((p) => (
                <li key={p.id} className="flex justify-between items-center text-sm py-3">
                  <span>{p.name} <span className="text-[#6B7280] text-xs ml-2">{p.due_date}</span></span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[#C4554D]">${p.amount}</span>
                    {(() => {
                      const id = p.id;
                      if (typeof id !== 'number') {
                        return null;
                      }
                      return (
                        <button type="button" onClick={() => void handleDelete(id, 'payable')} className="text-[#C4554D]">×</button>
                      );
                    })()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
