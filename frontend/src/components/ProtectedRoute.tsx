import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-figma-bg">
        <div className="text-slate-400 font-mono text-sm tracking-widest uppercase animate-pulse">Checking Auth...</div>
      </div>
    );
  }

  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
