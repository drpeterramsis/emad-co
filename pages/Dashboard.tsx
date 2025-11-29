
import React, { useEffect, useState } from 'react';
import { getFinancialStats, getOrders } from '../utils/storage';
import { analyzeSalesData } from '../services/geminiService';
import { Order, DashboardStats } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { DollarSign, TrendingUp, Briefcase, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoadingData(true);
    const [fetchedStats, fetchedOrders] = await Promise.all([
      getFinancialStats(),
      getOrders()
    ]);
    setStats(fetchedStats);
    setRecentOrders(fetchedOrders);
    
    // Auto-load AI insights if stats are available
    handleGenerateInsight();
    setLoadingData(false);
  };

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    const insight = await analyzeSalesData();
    setAiInsight(insight);
    setLoadingAi(false);
  };
  
  // Data for Charts
  const salesData = recentOrders.slice(-7).map(o => ({
    name: new Date(o.date).toLocaleDateString(undefined, {weekday: 'short'}),
    amount: o.totalAmount
  }));

  const collectionData = stats ? [
    { name: 'Collected', value: stats.totalCollected },
    { name: 'Outstanding', value: stats.totalSales - stats.totalCollected },
  ] : [];

  const COLORS = ['#0f766e', '#cbd5e1'];

  if (loadingData || !stats) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-500">Overview of your sales performance</p>
        </div>
        <button 
          onClick={handleGenerateInsight}
          disabled={loadingAi}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 disabled:opacity-50"
        >
          <Sparkles size={18} />
          {loadingAi ? 'Asking AI...' : 'Refresh AI Analysis'}
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Sales" 
          value={`EGP ${stats.totalSales.toLocaleString()}`} 
          icon={TrendingUp} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Collected" 
          value={`EGP ${stats.totalCollected.toLocaleString()}`} 
          icon={DollarSign} 
          color="bg-teal-600" 
        />
        <StatCard 
          title="Cash on Hand" 
          value={`EGP ${stats.repCashOnHand.toLocaleString()}`} 
          icon={Briefcase} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="Transferred to HQ" 
          value={`EGP ${stats.transferredToHQ.toLocaleString()}`} 
          icon={AlertCircle} 
          color="bg-slate-600" 
        />
      </div>

      {/* AI Insight Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Sparkles className="text-purple-600" size={20} /> 
          Gemini Sales Analysis
        </h3>
        {loadingAi && !aiInsight ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-slate-600">
             <div dangerouslySetInnerHTML={{ 
               __html: aiInsight.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') 
             }} />
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Recent Sales Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="amount" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Collection Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={collectionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {collectionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="w-3 h-3 rounded-full bg-primary"></span> Collected
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="w-3 h-3 rounded-full bg-slate-300"></span> Outstanding
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
    <div className={`p-3 rounded-lg ${color} text-white shadow-lg shadow-opacity-20`}>
      <Icon size={24} />
    </div>
  </div>
);

export default Dashboard;
