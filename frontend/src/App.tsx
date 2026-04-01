import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TradeOff from './pages/TradeOff';
import ActionCenter from './pages/ActionCenter';
import ScenarioSimulator from './pages/ScenarioSimulator';
import Ingestion from './pages/Ingestion';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Transactions from './pages/Transactions';
import PaymentCards from './pages/PaymentCards';
import Settings from './pages/Settings';
import SubscriptionAudit from './pages/SubscriptionAudit';
import Canvas from './pages/Canvas';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected Area */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tradeoff" element={<TradeOff />} />
              <Route path="/actions" element={<ActionCenter />} />
              <Route path="/simulate" element={<ScenarioSimulator />} />
              <Route path="/ingest" element={<Ingestion />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/cards" element={<PaymentCards />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/audit" element={<SubscriptionAudit />} />
              <Route path="/canvas" element={<Canvas />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
