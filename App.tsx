import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import InvoiceList from './pages/InvoiceList';
import Collections from './pages/Collections';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Login from './pages/Login';
import { initStorage } from './utils/storage';
import { UserProfile } from './types';

const App = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Initialize DB
    initStorage();

    // Check for persisted user
    const savedUser = localStorage.getItem('emad_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('emad_user');
      }
    }
    setIsAuthLoading(false);
  }, []);

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    localStorage.setItem('emad_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('emad_user');
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="flex bg-slate-50 min-h-screen font-sans print:bg-white print:block">
        <Sidebar 
          user={user} 
          onLogout={handleLogout} 
          isCollapsed={isSidebarCollapsed} 
          toggleSidebar={toggleSidebar} 
        />
        <main 
          className={`flex-1 relative min-h-screen flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} print:!ml-0 print:!w-full print:!m-0`}
        >
          {/* Main Content Area with padding at bottom for footer */}
          <div className="flex-1 pb-10 print:pb-0">
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
          <footer 
            className={`fixed bottom-0 right-0 bg-slate-50/90 backdrop-blur-sm border-t border-slate-200 py-1.5 px-6 flex justify-between items-center text-[11px] text-slate-400 z-30 print:hidden transition-all duration-300 ${isSidebarCollapsed ? 'left-20' : 'left-64'}`}
          >
            <span>&copy; {new Date().getFullYear()} Emad Co. Pharmaceutical - Sales Portal</span>
            <span className="font-mono font-medium">v2.0.022</span>
          </footer>
        </main>
      </div>
    </Router>
  );
};

export default App;