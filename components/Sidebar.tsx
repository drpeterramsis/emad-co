import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Briefcase, 
  Package, 
  Users 
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/new-order', icon: ShoppingCart, label: 'New Sale' },
    { to: '/invoices', icon: FileText, label: 'Invoices' },
    { to: '/collections', icon: Briefcase, label: 'Collections' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/customers', icon: Users, label: 'Customers' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 h-full overflow-y-auto">
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
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold">
            AR
          </div>
          <div>
            <p className="text-sm font-medium">Ahmed Rep</p>
            <p className="text-xs text-slate-500">Sales Representative</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;