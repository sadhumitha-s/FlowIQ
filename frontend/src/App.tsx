import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Ingestion from './pages/Ingestion';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ingest" element={<Ingestion />} />
          <Route path="/transactions" element={<div className="text-white">Transactions Area</div>} />
          <Route path="/analytics" element={<div className="text-white">Analytics Dashboard</div>} />
          <Route path="/cards" element={<div className="text-white">Payment Cards</div>} />
          <Route path="/settings" element={<div className="text-white">User Settings</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
