import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Briefcase, 
  Package, 
  Users,
  LogOut
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  user: UserProfile;
  onLogout: () => void;
}

const Sidebar = ({ user, onLogout }: SidebarProps) => {
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
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 h-full overflow-y-auto print:hidden z-40">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
          Emad Co.
        </h1>
        <p className="text-slate-400 text-sm">Sales Portal</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-primary text-white shadow-lg shadow-teal-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold text-white shrink-0 border-2 border-slate-800">
            {initials}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate" title={user.name}>{user.name}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide truncate" title={user.title}>{user.title}</p>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;