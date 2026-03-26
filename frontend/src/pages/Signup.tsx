import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.signup(email, password);
      const { access_token } = await api.login(email, password);
      login(access_token);
      navigate('/');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? 'An error occurred during signup');
      } else {
        setError('An error occurred during signup');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-figma-bg px-4 font-sans text-slate-700">
      <div className="w-full max-w-sm bg-figma-card p-8 rounded-2xl shadow-xl border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Account</h2>
        <p className="text-sm text-slate-500 mb-6">Sign up to FlowIQ</p>
        
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required 
              className="w-full bg-white border border-slate-200 text-sm rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-figma-yellow transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}
              className="w-full bg-white border border-slate-200 text-sm rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-figma-yellow transition-colors" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-figma-yellow text-slate-900 font-bold py-3 rounded-xl hover:bg-figma-yellow/80 transition-colors mt-2 disabled:opacity-50">
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="text-figma-yellow hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
