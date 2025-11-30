import React, { useEffect, useState } from 'react';
import { getFinancialStats, getOrders, getCustomers } from '../utils/storage';
import { Order, DashboardStats } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { DollarSign, TrendingUp, Briefcase, AlertCircle, Loader2, Wallet, Users } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoadingData(true);
    const [fetchedStats, fetchedOrders, fetchedCustomers] = await Promise.all([
      getFinancialStats(),
      getOrders(),
      getCustomers()
    ]);
    // Filter drafts from recent orders list for dashboard display
    const activeOrders = fetchedOrders.filter(o => !o.isDraft);
    setStats(fetchedStats);
    setRecentOrders(activeOrders);
    setCustomerCount(fetchedCustomers.length);
    setLoadingData(false);
  };
  
  // Data for Charts
  const salesData = recentOrders.slice(-7).map(o => ({
    name: new Date(o.date).toLocaleDateString(undefined, {weekday: 'short'}),
    amount: o.totalAmount
  }));

  const collectionData = stats ? [
    { name: t('collected'), value: stats.totalCollected },
    { name: t('outstanding'), value: stats.totalSales - stats.totalCollected },
  ] : [];

  const COLORS = ['#0f766e', '#cbd5e1'];

  if (loadingData || !stats) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const outstanding = stats.totalSales - stats.totalCollected;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">{t('dashboard')}</h2>
          <p className="text-slate-500 text-xs md:text-sm">Overview of your sales performance</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
        <StatCard 
          title={t('totalSales')}
          value={formatCurrency(stats.totalSales)}
          icon={TrendingUp} 
          color="bg-blue-500" 
        />
        <StatCard 
          title={t('collected')} 
          value={formatCurrency(stats.totalCollected)} 
          icon={DollarSign} 
          color="bg-teal-600" 
        />
        <StatCard 
          title={t('outstanding')} 
          value={formatCurrency(outstanding)}
          icon={AlertCircle} 
          color="bg-red-500" 
        />
        <StatCard 
          title={t('cashOnHand')} 
          value={formatCurrency(stats.repCashOnHand)} 
          icon={Wallet} 
          color="bg-amber-500" 
        />
        <StatCard 
          title={t('transferredToHQ')} 
          value={formatCurrency(stats.transferredToHQ)} 
          icon={Briefcase} 
          color="bg-slate-600" 
        />
        <StatCard 
          title={t('customers')} 
          value={customerCount} 
          icon={Users} 
          color="bg-indigo-500" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-base font-semibold mb-3 text-slate-800">{t('recentSalesTrend')}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{top: 5, right: 0, left: -20, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{fontSize: '12px', padding: '8px'}} />
                <Bar dataKey="amount" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-semibold mb-3 text-slate-800">{t('collectionStatus')}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={collectionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {collectionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{fontSize: '12px', padding: '8px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span> {t('collected')}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> {t('outstanding')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between min-h-[90px]">
    <div>
      <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-base md:text-lg font-bold text-slate-800">{value}</h3>
    </div>
    <div className={`p-2 rounded-lg ${color} text-white shadow-lg shadow-opacity-20`}>
      <Icon size={18} />
    </div>
  </div>
);

export default Dashboard;