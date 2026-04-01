import { useState, useEffect } from 'react';
import { SectionHeader, Alert, Skeleton } from '../components/ui';
import { api } from '../services/api';
import { useSettings } from '../hooks/useData';
import type { WorkspaceSettings } from '../types';

export default function Settings() {
  const { data: initialSettings, loading, refetch } = useSettings();
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    
    setSaving(true);
    setMessage(null);
    try {
      await api.updateSettings(settings);
      setMessage({ type: 'success', text: 'Settings updated successfully. Consequence model re-calibrating.' });
      refetch();
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to update settings. Please check your connection.' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="space-y-6 max-w-2xl">
        <SectionHeader title="Workspace Settings" sub="Configure engine parameters and preferences" />
        <div className="bg-figma-card rounded-2xl p-8 border border-slate-800 space-y-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-12 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionHeader title="Workspace Settings" sub="Configure engine parameters and preferences" />
      
      {message && (
        <Alert variant={message.type}>
          {message.text}
        </Alert>
      )}

      {settings && (
        <form onSubmit={handleSave} className="bg-figma-card rounded-2xl p-6 border border-slate-800 space-y-6 shadow-xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-1">Corporate Tax Rate</label>
              <p className="text-xs text-slate-500 mb-4">The percentage of incoming receivables to ring-fence for government obligations.</p>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input 
                    type="number" step="0.01" min="0" max="1" required 
                    value={settings.tax_rate} onChange={e => setSettings({...settings, tax_rate: parseFloat(e.target.value)})}
                    className="w-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-figma-yellow transition-all font-mono text-lg" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">%</span>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-slate-900/40 border border-slate-800/50">
                  <p className="text-[10px] uppercase font-mono text-slate-500 mb-1">Current Effective Rate</p>
                  <p className="text-sm font-mono text-figma-yellow font-bold">{(settings.tax_rate * 100).toFixed(0)}% of gross revenue</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800/50">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" checked={settings.notifications_enabled}
                    onChange={e => setSettings({...settings, notifications_enabled: e.target.checked})}
                    className="w-6 h-6 accent-figma-yellow bg-slate-900 border-slate-700 rounded-lg cursor-pointer" 
                  />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-200 block">Enable Actionable Insights</span>
                  <span className="text-xs text-slate-500">Receive real-time alerts when liquidity thresholds are breached.</span>
                </div>
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving} 
            className="w-full sm:w-auto px-8 py-3 bg-figma-yellow text-slate-900 font-bold rounded-xl text-sm hover:bg-yellow-300 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Syncing...' : 'Save Workspace Config'}
          </button>
        </form>
      )}
    </div>
  );
}
