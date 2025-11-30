
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Briefcase, 
  Package, 
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Globe,
  Pill,
  RotateCcw,
  BarChart3
} from 'lucide-react';
import { UserProfile } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  user: UserProfile;
  onLogout: () => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobile?: boolean;
}

const Sidebar = ({ user, onLogout, isCollapsed, toggleSidebar, isMobile }: SidebarProps) => {
  const { t, language, setLanguage, dir } = useLanguage();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/new-order', icon: ShoppingCart, label: t('newSale') },
    { to: '/returns', icon: RotateCcw, label: t('customerReturn') },
    { to: '/invoices', icon: FileText, label: t('invoices') },
    { to: '/reports', icon: BarChart3, label: t('advancedReports') },
    { to: '/collections', icon: Briefcase, label: t('collections') },
    { to: '/inventory', icon: Package, label: t('inventory') },
    { to: '/customers', icon: Users, label: t('customers') },
    { to: '/bill-generator', icon: FileSpreadsheet, label: t('billGenerator') },
  ];

  // Get initials
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Mobile classes logic
  const mobileClasses = isMobile 
    ? `transform ${isCollapsed ? (dir === 'rtl' ? 'translate-x-full' : '-translate-x-full') : 'translate-x-0'} w-64` 
    : `${isCollapsed ? 'w-16' : 'w-60'}`; // Slightly narrower collapsed width

  // Direction specific border logic
  const borderSide = dir === 'rtl' ? 'border-l' : 'border-r';
  const sidebarPos = dir === 'rtl' ? 'right-0' : 'left-0';

  return (
    <div 
      className={`bg-slate-900 text-white min-h-screen flex flex-col fixed top-0 h-full overflow-y-auto print:hidden z-40 transition-all duration-300 ${mobileClasses} ${sidebarPos}`}
    >
      <div className={`p-4 border-b border-slate-700 flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'justify-between'}`}>
        {(!isCollapsed || isMobile) && (
          <div className="flex items-center gap-3">
            <div className="bg-teal-500/20 p-2 rounded-lg">
              <Pill className="text-teal-400" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap leading-none">
                {t('welcome')}
              </h1>
              <p className="text-slate-400 text-[10px] mt-0.5">{t('salesPortal')}</p>
            </div>
          </div>
        )}
        {isCollapsed && !isMobile && (
          <Pill className="text-teal-400" size={24} />
        )}
        
        {/* Toggle Button - Hidden on Mobile inside sidebar (used header instead) */}
        {!isMobile && (
          <button 
            onClick={toggleSidebar}
            className={`text-slate-400 hover:text-white transition-colors ${isCollapsed ? 'hidden' : 'block'}`}
          >
            {dir === 'rtl' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Desktop Collapsed Toggle */}
      {isCollapsed && !isMobile && (
        <div className="flex justify-center py-4 border-b border-slate-800">
           <button 
            onClick={toggleSidebar}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {dir === 'rtl' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={isMobile ? toggleSidebar : undefined}
            title={isCollapsed && !isMobile ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                isActive 
                  ? 'bg-primary text-white shadow-lg shadow-teal-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              } ${isCollapsed && !isMobile ? 'justify-center px-2' : ''}`
            }
          >
            <item.icon size={20} className="shrink-0" />
            {(!isCollapsed || isMobile) && <span className="font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-3 border-t border-slate-800 space-y-3">
        {/* Language Toggle */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className={`w-full flex items-center gap-2 px-2 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs ${isCollapsed && !isMobile ? 'justify-center' : ''}`}
          title={t('language')}
        >
          <Globe size={isCollapsed && !isMobile ? 18 : 14} />
          {(!isCollapsed || isMobile) && <span>{t('switchLang')}</span>}
        </button>

        <div className={`flex items-center gap-3 ${isCollapsed && !isMobile ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 border-2 border-slate-800">
            {initials}
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="overflow-hidden">
              <p className="text-xs font-medium truncate text-slate-200" title={user.name}>{user.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide truncate" title={user.title}>{user.title}</p>
            </div>
          )}
        </div>
        
        <button 
          onClick={onLogout}
          className={`w-full flex items-center gap-2 px-2 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs ${isCollapsed && !isMobile ? 'justify-center' : ''}`}
          title={isCollapsed && !isMobile ? t('signOut') : undefined}
        >
          <LogOut size={isCollapsed && !isMobile ? 18 : 14} /> 
          {(!isCollapsed || isMobile) && t('signOut')}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
