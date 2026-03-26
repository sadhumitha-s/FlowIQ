import { useState, useEffect } from 'react';
import { SectionHeader } from '../components/ui';
import axios from 'axios';

type WorkspaceSettings = {
  tax_rate: number;
  theme: string;
  notifications_enabled: boolean;
};

export default function Settings() {
  const [settings, setSettings] = useState<WorkspaceSettings>({ tax_rate: 0.18, theme: 'dark', notifications_enabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:8000/api/v1/user/settings', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setSettings(res.data)).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await axios.put('http://localhost:8000/api/v1/user/settings', settings, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    setSaving(false);
    alert('Settings saved!');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionHeader title="Workspace Settings" sub="Configure engine parameters and preferences" />
      
      {loading ? <p className="text-slate-500">Loading settings...</p> : (
        <form onSubmit={handleSave} className="bg-figma-card rounded-2xl p-6 border border-slate-800 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Corporate Tax Rate</label>
            <p className="text-xs text-slate-500 mb-3">Used for computing the reserved tax envelope.</p>
            <div className="flex items-center gap-2">
              <input type="number" step="0.01" min="0" max="1" required 
                value={settings.tax_rate} onChange={e => setSettings({...settings, tax_rate: parseFloat(e.target.value)})}
                className="w-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-figma-yellow transition-colors font-mono" />
              <span className="text-slate-500 font-mono">({(settings.tax_rate * 100).toFixed(0)}%)</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={settings.notifications_enabled}
                onChange={e => setSettings({...settings, notifications_enabled: e.target.checked})}
                className="w-5 h-5 accent-figma-yellow bg-slate-900 border-slate-700 rounded cursor-pointer" />
              <span className="text-sm font-medium text-slate-300">Enable Actionable Insights Notifications</span>
            </label>
          </div>

          <button type="submit" disabled={saving} className="px-6 py-3 bg-figma-yellow text-slate-900 font-bold rounded-xl text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      )}
    </div>
  );
}
