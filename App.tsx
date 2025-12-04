import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import InvoiceList from './pages/InvoiceList';
import Collections from './pages/Collections';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import BillGenerator from './pages/BillGenerator';
import Analysis from './pages/Analysis';
import Login from './pages/Login';
import Returns from './pages/Returns';
import Reports from './pages/Reports';
import { initStorage } from './utils/storage';
import { UserProfile } from './types';
import { Menu } from 'lucide-react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

const AppContent = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const { dir, t } = useLanguage();

  useEffect(() => {
    initStorage();
    const savedUser = localStorage.getItem('emad_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('emad_user');
      }
    }
    setIsAuthLoading(false);

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Init

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = (user: UserProfile) => {
    setUser(user);
    localStorage.setItem('emad_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('emad_user');
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (isAuthLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans text-slate-900" dir={dir}>
      <Sidebar 
        user={user} 
        onLogout={handleLogout} 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}
      />
      
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isMobile 
            ? 'ml-0 w-full' 
            : (isSidebarCollapsed ? (dir === 'rtl' ? 'mr-16' : 'ml-16') : (dir === 'rtl' ? 'mr-60' : 'ml-60'))
        }`}
      >
        {/* Mobile Header */}
        {isMobile && (
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
             <div className="font-bold text-lg">Emad Co.</div>
             <button onClick={toggleSidebar} className="p-1">
               <Menu size={24} />
             </button>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new-order" element={<NewOrder />} />
            <Route path="/invoices" element={<InvoiceList />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/bill-generator" element={<BillGenerator />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        <footer className="py-2 border-t border-slate-200 bg-slate-50 text-center print:hidden mt-auto flex justify-center items-center gap-2">
           <p className="text-[10px] text-slate-400">
             {t('salesPortal')} v2.0.090 • Developer Dr. Peter Ramsis • All rights reserved
           </p>
        </footer>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <LanguageProvider>
      <Router>
        <AppContent />
      </Router>
    </LanguageProvider>
  );
};

export default App;