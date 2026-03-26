import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../config/demo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { access_token } = await api.login(email, password);
      login(access_token);
      navigate('/');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'Invalid demo credentials. Please use the demo email/password.');
        return;
      }
      setError(err instanceof Error ? err.message : 'Invalid demo credentials. Please use the demo email/password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-figma-bg px-4 font-sans text-slate-700">
      <div className="w-full max-w-sm bg-figma-card p-8 rounded-2xl shadow-xl border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
        <p className="text-sm text-slate-500 mb-4">Use the demo credentials below to access analytics</p>

        <div className="mb-5 rounded-xl border border-figma-yellow/40 bg-figma-yellow/10 p-3 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Demo Credentials</p>
              <p className="font-mono mt-1">Email: {DEMO_EMAIL}</p>
              <p className="font-mono">Password: {DEMO_PASSWORD}</p>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className="px-3 py-1.5 rounded-lg bg-figma-yellow text-slate-900 font-semibold text-[11px] hover:bg-figma-yellow/80 transition-colors"
            >
              Use Demo
            </button>
          </div>
        </div>
        
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required 
              className="w-full bg-white border border-slate-200 text-sm rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-figma-yellow transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required 
              className="w-full bg-white border border-slate-200 text-sm rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-figma-yellow transition-colors" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-figma-yellow text-slate-900 font-bold py-3 rounded-xl hover:bg-figma-yellow/80 transition-colors mt-2 disabled:opacity-50">
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          Demo access only.
        </p>
      </div>
    </div>
  );
}
