
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
import { Menu, Pill } from 'lucide-react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

const AppContent = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const { dir } = useLanguage();

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
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
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

  const marginSide = dir === 'rtl' ? 'mr' : 'ml';
  const contentMargin = isMobile ? '0' : (isSidebarCollapsed ? `${marginSide}-16` : `${marginSide}-60`);

  return (
    <Router>
      <div className="flex bg-slate-50 min-h-screen font-sans print:bg-white print:block" dir={dir}>
        
        {/* Mobile Header */}
        {isMobile && (
          <div className="fixed top-0 left-0 right-0 h-14 bg-slate-900 z-30 flex items-center px-4 justify-between print:hidden">
            <div className="flex items-center gap-3">
              <button onClick={toggleSidebar} className="text-white p-1">
                <Menu size={24} />
              </button>
              <div className="flex items-center gap-2">
                 <Pill className="text-teal-400" size={18} />
                 <span className="text-white font-bold text-sm">Emad Co.</span>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <Sidebar 
          user={user} 
          onLogout={handleLogout} 
          isCollapsed={isSidebarCollapsed} 
          toggleSidebar={toggleSidebar} 
          isMobile={isMobile}
        />

        {/* Mobile Overlay */}
        {isMobile && !isSidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}

        <main 
          className={`flex-1 relative min-h-screen flex flex-col transition-all duration-300 
            ${isMobile ? 'mt-14' : ''} ${contentMargin}
            print:!ml-0 print:!mr-0 print:!w-full print:!m-0 print:!mt-0`}
        >
          {/* Main Content Area */}
          <div className="flex-1 pb-8 print:pb-0">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new-order" element={<NewOrder />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/collections" element={<Collections />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/bill-generator" element={<BillGenerator />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* Fixed Footer */}
          <footer 
            className={`fixed bottom-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} bg-slate-50/90 backdrop-blur-sm border-t border-slate-200 py-1.5 px-6 flex justify-between items-center text-[10px] text-slate-400 z-20 print:hidden transition-all duration-300 
              ${isMobile ? 'w-full' : (isSidebarCollapsed ? `w-[calc(100%-4rem)]` : `w-[calc(100%-15rem)]`)}`}
          >
            <div className="flex gap-4 items-center">
              <span>&copy; {new Date().getFullYear()} Emad Co. Pharmaceutical</span>
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-[10px] text-slate-500 opacity-75 hover:opacity-100 transition-opacity cursor-default" title="Developer">Dev by Dr. Peter Ramsis</span>
            </div>
            <span className="font-mono font-medium">v2.0.045</span>
          </footer>
        </main>
      </div>
    </Router>
  );
};

const App = () => (
  <LanguageProvider>
    <AppContent />
  </LanguageProvider>
);

export default App;
