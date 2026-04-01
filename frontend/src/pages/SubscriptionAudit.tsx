import { useState } from 'react';
import { api } from '../services/api';
import { SectionHeader, Alert, fmtFull } from '../components/ui';
import { UploadCloud, Zap, ShieldCheck } from 'lucide-react';

type Subscription = {
  id: number;
  name: string;
  monthly_cost: number;
  category: string;
  alternative_suggestion: string;
  last_detected: string;
};

type AuditResult = {
  detected_subscriptions: Subscription[];
  total_monthly_bleed: number;
  annual_bleed: number;
};

export default function SubscriptionAudit() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const runAudit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.auditSubscriptions(file);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to audit CSV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Subscription Audit & Creep Detector" 
        sub="Identify recurring SaaS waste and switch to open-source alternatives" 
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="col-span-1 bg-figma-card rounded-2xl p-6 border border-slate-800">
          <SectionHeader title="Ingest Bank Statement" sub="Upload CSV to detect recurring charges" />
          
          <div className="mt-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-8 bg-slate-900/40 hover:bg-slate-900/60 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              accept=".csv" 
              onChange={onFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <UploadCloud size={32} className="text-slate-500 mb-2" />
            <p className="text-sm font-medium text-slate-300">
              {file ? file.name : "Select or drag CSV"}
            </p>
            <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest font-mono">
              CSV bank statements only
            </p>
          </div>

          <button
            onClick={runAudit}
            disabled={!file || loading}
            className="w-full mt-6 py-3 bg-figma-yellow text-slate-900 rounded-xl font-bold text-sm hover:bg-figma-yellow/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Analyzing transactions...' : 'Detect Subscriptions'}
          </button>

          {error && (
            <div className="mt-4">
              <Alert variant="danger">{error}</Alert>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="col-span-2 space-y-6">
          {!result && !loading && (
            <div className="bg-figma-card rounded-2xl p-12 flex flex-col items-center justify-center border border-dashed border-slate-800 text-center h-full">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <ShieldCheck size={24} className="text-slate-500" />
              </div>
              <h3 className="text-slate-300 font-medium">No active audit</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">Upload your bank statement to see where your cash is bleeding.</p>
            </div>
          )}

          {result && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-figma-card rounded-2xl p-6 border border-slate-800 shadow-xl">
                  <p className="text-xs text-slate-500 mb-1 font-mono uppercase tracking-widest">Monthly Bleed</p>
                  <p className="text-3xl font-bold text-red-400 font-mono italic">{fmtFull(result.total_monthly_bleed)}</p>
                </div>
                <div className="bg-figma-card rounded-2xl p-6 border border-slate-800 shadow-xl">
                  <p className="text-xs text-slate-500 mb-1 font-mono uppercase tracking-widest">Annualized Leakage</p>
                  <p className="text-3xl font-bold text-amber-400 font-mono italic">{fmtFull(result.annual_bleed)}</p>
                </div>
              </div>

              <div className="bg-figma-card rounded-2xl overflow-hidden border border-slate-800">
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40">
                  <SectionHeader title="Detected SaaS Subscriptions" sub={`Found ${result.detected_subscriptions.length} recurring charges`} />
                </div>
                <div className="divide-y divide-slate-800">
                  {result.detected_subscriptions.map(sub => (
                    <div key={sub.id} className="p-6 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                          <Zap size={18} className="text-figma-yellow" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-200">{sub.name}</p>
                          <p className="text-xs text-slate-500">{sub.category}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8 text-right">
                        <div>
                          <p className="text-sm font-mono text-slate-300">{fmtFull(sub.monthly_cost)}</p>
                          <p className="text-[10px] text-slate-600 uppercase font-mono">per month</p>
                        </div>
                        
                        <div className="w-48 p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/20 text-left">
                          <p className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold mb-0.5">Switch to:</p>
                          <p className="text-[11px] text-emerald-100 font-medium truncate">{sub.alternative_suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
