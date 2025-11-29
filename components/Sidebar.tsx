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
  ChevronRight
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  user: UserProfile;
  onLogout: () => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ user, onLogout, isCollapsed, toggleSidebar }: SidebarProps) => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/new-order', icon: ShoppingCart, label: 'New Sale' },
    { to: '/invoices', icon: FileText, label: 'Invoices' },
    { to: '/collections', icon: Briefcase, label: 'Collections' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/customers', icon: Users, label: 'Customers' },
  ];

  // Get initials
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div 
      className={`bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 h-full overflow-y-auto print:hidden z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      <div className={`p-6 border-b border-slate-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap">
              Emad Co.
            </h1>
            <p className="text-slate-400 text-sm">Sales Portal</p>
          </div>
        )}
        {isCollapsed && (
          <h1 className="text-xl font-bold text-teal-400">EC</h1>
        )}
        
        <button 
          onClick={toggleSidebar}
          className={`text-slate-400 hover:text-white transition-colors ${isCollapsed ? 'hidden' : 'block'}`}
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Collapsed Toggle button if header one is hidden/different style */}
      {isCollapsed && (
        <div className="flex justify-center py-4 border-b border-slate-800">
           <button 
            onClick={toggleSidebar}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={isCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-primary text-white shadow-lg shadow-teal-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon size={22} className="shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className={`flex items-center gap-3 mb-4 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold text-white shrink-0 border-2 border-slate-800">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate" title={user.name}>{user.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide truncate" title={user.title}>{user.title}</p>
            </div>
          )}
        </div>
        
        <button 
          onClick={onLogout}
          className={`w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut size={isCollapsed ? 20 : 16} /> 
          {!isCollapsed && "Sign Out"}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;