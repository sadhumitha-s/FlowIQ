import { useState, useRef } from 'react';
import { api } from '../services/api';
import { SectionHeader, Alert, Confidence, Badge, fmt } from '../components/ui';
import type { ParsedDocument } from '../types';
import { clsx } from 'clsx';

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => ref.current?.click()}
      className={clsx(
        'rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all',
        dragging ? 'border-figma-yellow/60 bg-figma-yellow/5' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/20',
      )}
    >
      <div className="text-4xl mb-3">📄</div>
      <p className="font-semibold text-slate-200 text-sm">Drop invoice or receipt here</p>
      <p className="text-xs text-slate-500 mt-1">PDF · PNG · JPG · Handwritten OK · Max 10MB</p>
      <button className="mt-4 px-5 py-2 bg-figma-yellow text-slate-900 rounded-xl text-xs font-bold hover:bg-figma-yellow/80 transition-colors">
        Browse Files
      </button>
      <input ref={ref} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

// ─── Parsed Result ────────────────────────────────────────────────────────────

function ParsedResult({ doc, onAccept, onDiscard }: { doc: ParsedDocument; onAccept: () => void; onDiscard: () => void }) {
  const fields = [
    { key: 'Vendor', value: doc.vendor },
    { key: 'Amount', value: fmt(doc.amount) },
    { key: 'Date', value: doc.date },
    { key: 'Due Date', value: doc.due_date },
    { key: 'Category', value: doc.category },
    { key: 'Invoice #', value: doc.invoice_number },
  ];

  return (
    <div className="bg-figma-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-white text-sm">{doc.filename}</p>
          <p className="text-xs text-slate-500 mt-0.5">Vision AI extraction complete</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-1">Overall confidence</p>
          <span className={clsx(
            'font-mono font-bold text-base',
            doc.confidence >= 0.9 ? 'text-emerald-400' : doc.confidence >= 0.8 ? 'text-amber-400' : 'text-red-400',
          )}>
            {Math.round(doc.confidence * 100)}%
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        {fields.map(f => (
          <div key={f.key} className="flex items-center gap-3 bg-slate-900/50 rounded-xl px-4 py-2.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 w-20 flex-shrink-0">{f.key}</span>
            <span className="text-sm font-medium text-slate-200 flex-1">{f.value}</span>
            <Confidence value={doc.field_confidences[f.key.toLowerCase().replace(' ', '_')] ?? doc.confidence} />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onAccept} className="flex-1 py-2.5 bg-figma-yellow text-slate-900 rounded-xl text-sm font-bold hover:bg-figma-yellow/80 transition-colors">
          ✓ Accept & Add to Queue
        </button>
        <button onClick={onDiscard} className="px-4 py-2.5 bg-figma-card border border-slate-700 rounded-xl text-sm text-slate-300 hover:border-slate-500 transition-colors">
          Discard
        </button>
      </div>
    </div>
  );
}

// ─── History Table ────────────────────────────────────────────────────────────

const HISTORY: ParsedDocument[] = [
  { id: 'h1', filename: 'inv_sharma_0319.pdf', vendor: 'Sharma Fabrics', amount: 54000, date: '2026-03-19', due_date: '2026-03-30', category: 'Raw Materials', invoice_number: 'SF-1092', confidence: 0.98, field_confidences: { vendor: 0.99, amount: 0.99, date: 0.98, due_date: 0.97 }, status: 'accepted' },
  { id: 'h2', filename: 'receipt_fuel.jpg', vendor: 'HP Petrol Station', amount: 4200, date: '2026-03-21', due_date: '2026-03-21', category: 'Fuel / Transport', invoice_number: 'N/A', confidence: 0.94, field_confidences: { vendor: 0.96, amount: 0.98, date: 0.95, due_date: 0.90 }, status: 'accepted' },
  { id: 'h3', filename: 'handwritten_rj.jpg', vendor: 'Rajesh Logistics', amount: 42000, date: '2026-03-21', due_date: '2026-04-02', category: 'Logistics', invoice_number: 'RL-2042', confidence: 0.87, field_confidences: { vendor: 0.96, amount: 0.99, date: 0.92, due_date: 0.87 }, status: 'accepted' },
];

function HistoryTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-figma-card/50 border-b border-slate-800">
            {['File', 'Vendor', 'Amount', 'Category', 'Status', 'Confidence'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-mono tracking-widest uppercase text-slate-500 font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HISTORY.map(doc => (
            <tr key={doc.id} className="border-b border-slate-800/60 hover:bg-figma-card/30 transition-colors last:border-0">
              <td className="px-4 py-3 font-mono text-xs text-slate-400">{doc.filename}</td>
              <td className="px-4 py-3 text-slate-200 font-medium">{doc.vendor}</td>
              <td className="px-4 py-3 font-mono text-slate-300">{fmt(doc.amount)}</td>
              <td className="px-4 py-3 text-slate-400 text-xs">{doc.category}</td>
              <td className="px-4 py-3"><Badge variant="green">{doc.status}</Badge></td>
              <td className="px-4 py-3"><Confidence value={doc.confidence} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Manual Entry Form ────────────────────────────────────────────────────────

function ManualEntry({ onAdd }: { onAdd: () => void }) {
  const [form, setForm] = useState({ vendor: '', amount: '', due_date: '', category: 'supplier', notes: '' });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const inputCls = "w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-figma-yellow/40 focus:border-figma-yellow/30 placeholder-slate-600 transition-all";
  const labelCls = "block text-xs font-medium text-slate-400 mb-1.5";

  return (
    <div className="bg-figma-card rounded-2xl p-5">
      <SectionHeader title="Manual Entry" sub="Add an obligation directly without a document" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Vendor / Counterparty</label>
          <input className={inputCls} placeholder="e.g. Sharma Fabrics" value={form.vendor} onChange={e => set('vendor', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Amount (₹)</label>
          <input className={inputCls} type="number" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Due Date</label>
          <input className={inputCls} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="employee">Employee / Payroll</option>
            <option value="tax">Tax / Government</option>
            <option value="supplier">Supplier</option>
            <option value="utility">Utility / SaaS</option>
            <option value="lender">Lender / EMI</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Notes (optional)</label>
          <input className={inputCls} placeholder="Penalty terms, relationship notes..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>
      <button
        onClick={onAdd}
        className="mt-4 w-full py-2.5 bg-figma-yellow text-slate-900 rounded-xl text-sm font-bold hover:bg-figma-yellow/80 transition-colors"
      >
        + Add to Obligation Queue
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'parsing' | 'done' | 'error';

export default function Ingestion() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [parsedDoc, setParsedDoc] = useState<ParsedDocument | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');

  async function handleFile(file: File) {
    setUploadState('parsing');
    setParsedDoc(null);
    setAccepted(false);
    try {
      const doc = await api.uploadDocument(file);
      setParsedDoc(doc);
      setUploadState('done');
    } catch {
      setUploadState('error');
    }
  }

  return (
    <div className="space-y-6">
      <Alert variant="info">
        <strong>Vision AI:</strong> Upload any invoice or receipt — including handwritten. The engine extracts vendor, amount, dates, and category. Review confidence scores before accepting.
      </Alert>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-figma-card rounded-xl p-1 w-fit">
        {(['upload', 'manual'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
              activeTab === tab ? 'bg-figma-yellow text-slate-900' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {tab === 'upload' ? '↑ Upload Document' : '✎ Manual Entry'}
          </button>
        ))}
      </div>

      {activeTab === 'upload' ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <UploadZone onFile={handleFile} />
            {uploadState === 'parsing' && (
              <div className="bg-figma-card rounded-2xl p-5 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-figma-yellow border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Vision AI parsing document…</p>
              </div>
            )}
            {uploadState === 'error' && (
              <Alert variant="danger">Failed to parse document. Try again or use manual entry.</Alert>
            )}
            {accepted && (
              <Alert variant="info">
                <strong>Added to queue.</strong> The obligation has been ingested and the engine will re-score on next run.
              </Alert>
            )}
          </div>

          <div className="space-y-4">
            {parsedDoc && !accepted ? (
              <ParsedResult
                doc={parsedDoc}
                onAccept={() => { setAccepted(true); setParsedDoc(null); }}
                onDiscard={() => { setParsedDoc(null); setUploadState('idle'); }}
              />
            ) : (
              <div className="bg-figma-card rounded-2xl p-5">
                <SectionHeader title="Recently Parsed" sub="Last 3 documents accepted into the queue" />
                <HistoryTable />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <ManualEntry onAdd={() => {}} />
          <div className="bg-figma-card rounded-2xl p-5">
            <SectionHeader title="Recently Added" />
            <HistoryTable />
          </div>
        </div>
      )}
    </div>
  );
}
