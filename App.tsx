import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import InvoiceList from './pages/InvoiceList';
import Collections from './pages/Collections';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import { initStorage } from './utils/storage';

const App = () => {
  useEffect(() => {
    initStorage();
  }, []);

  return (
    <Router>
      <div className="flex bg-slate-50 min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 relative min-h-screen flex flex-col">
          {/* Main Content Area with padding at bottom for footer */}
          <div className="flex-1 pb-10">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new-order" element={<NewOrder />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/collections" element={<Collections />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* Fixed Footer */}
          <footer className="fixed bottom-0 right-0 left-64 bg-slate-50/90 backdrop-blur-sm border-t border-slate-200 py-1.5 px-6 flex justify-between items-center text-[11px] text-slate-400 z-50 print:hidden">
            <span>&copy; {new Date().getFullYear()} Emad Co. Pharmaceutical - Sales Portal</span>
            <span className="font-mono font-medium">v2.0.012</span>
          </footer>
        </main>
      </div>
    </Router>
  );
};

export default App;