import React, { useEffect, useState } from 'react';
import { getFinancialStats, getOrders, getCustomers, getProducts } from '../utils/storage';
import { Order, DashboardStats, Product } from '../types';
import { DollarSign, TrendingUp, AlertCircle, Loader2, Wallet, Users, Package, Coins, Landmark, Layers } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  
  // New Stats
  const [inventoryCapital, setInventoryCapital] = useState(0);
  const [pharmacyValue, setPharmacyValue] = useState(0);
  const [sumAllCapitals, setSumAllCapitals] = useState(0);
  
  // Table Data
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [productStats, setProductStats] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoadingData(true);
    const [fetchedStats, fetchedOrders, fetchedCustomers, fetchedProducts] = await Promise.all([
      getFinancialStats(),
      getOrders(),
      getCustomers(),
      getProducts()
    ]);
    
    setStats(fetchedStats);

    // Calculate Inventory Stats
    const savedSettings = localStorage.getItem('emad_inventory_settings');
    let settings = { factoryPercent: 30, customerPercent: 75 };
    if (savedSettings) {
      try { settings = JSON.parse(savedSettings); } catch(e) {}
    }

    const totalCap = fetchedProducts.reduce((acc, p) => acc + (p.stock * p.basePrice * (settings.factoryPercent / 100)), 0);
    const totalPharm = fetchedProducts.reduce((acc, p) => acc + (p.stock * p.basePrice * (settings.customerPercent / 100)), 0);
    
    setInventoryCapital(totalCap);
    setPharmacyValue(totalPharm);

    // Sum of All Capitals = Outstanding + HQ + Pharmacy Value
    const outstanding = fetchedStats.totalSales - fetchedStats.totalCollected;
    setSumAllCapitals(outstanding + fetchedStats.transferredToHQ + totalPharm);

    // Prepare Table Data (Group by Month of Order)
    const activeOrders = fetchedOrders.filter(o => !o.isDraft);
    const monthMap: Record<string, { month: string, cashCollected: number, cashOutstanding: number, unitsCollected: number, unitsOutstanding: number }> = {};

    // Product Stats Map
    const prodStatsMap: Record<string, { id: string, name: string, sold: number, revenue: number, stock: number }> = {};
    fetchedProducts.forEach(p => {
        prodStatsMap[p.id] = { id: p.id, name: p.name, sold: 0, revenue: 0, stock: p.stock };
    });

    activeOrders.forEach(order => {
       const month = order.date.substring(0, 7); // YYYY-MM
       if (!monthMap[month]) {
          monthMap[month] = { 
            month, 
            cashCollected: 0, 
            cashOutstanding: 0, 
            unitsCollected: 0, 
            unitsOutstanding: 0 
          };
       }
       
       // Cash
       monthMap[month].cashCollected += order.paidAmount;
       monthMap[month].cashOutstanding += (order.totalAmount - order.paidAmount);

       // Items Logic
       order.items.forEach(item => {
           const paid = item.paidQuantity || 0;
           const totalQty = item.quantity;
           const remaining = Math.max(0, totalQty - paid);
           
           monthMap[month].unitsCollected += paid;
           monthMap[month].unitsOutstanding += remaining;

           // Product Stats Aggregation
           if (prodStatsMap[item.productId]) {
               prodStatsMap[item.productId].sold += item.quantity;
               prodStatsMap[item.productId].revenue += item.subtotal;
           }
       });
    });

    const sortedMonths = Object.values(monthMap).sort((a, b) => b.month.localeCompare(a.month)); // Newest first
    setMonthlyData(sortedMonths);

    const sortedProductStats = Object.values(prodStatsMap).sort((a, b) => b.revenue - a.revenue);
    setProductStats(sortedProductStats);

    setLoadingData(false);
  };
  
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
          <p className="text-slate-500 text-xs md:text-sm">{t('dashboardOverview')}</p>
        </div>
        <button 
          onClick={() => navigate('/analysis')}
          className="text-primary hover:bg-teal-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-transparent hover:border-teal-100"
        >
           <TrendingUp size={16} /> {t('monthlyAnalysis')}
        </button>
      </header>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Row 1: Sales & Collection Flow */}
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
        
        {/* Row 2: Asset & Capital */}
        <StatCard 
          title={t('transferredToHQ')} 
          value={formatCurrency(stats.transferredToHQ)} 
          icon={Landmark} 
          color="bg-slate-600" 
        />
        <StatCard 
          title={t('totalCapital')}
          subtitle="(Factory Value)"
          value={formatCurrency(inventoryCapital)} 
          icon={Coins} 
          color="bg-indigo-500" 
        />
        <StatCard 
          title={t('pharmacyValue')} 
          subtitle="(Sales Value)"
          value={formatCurrency(pharmacyValue)} 
          icon={Package} 
          color="bg-emerald-500" 
        />
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-xl shadow-lg border border-slate-700 flex flex-col justify-center text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
               <Layers size={64} />
            </div>
            <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Sum of All Capitals</p>
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">{formatCurrency(sumAllCapitals)}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Outstanding + HQ + Inventory</p>
        </div>
      </div>

      {/* Data Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        
        {/* Table 1: Cash Analysis */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-semibold mb-3 text-slate-800 border-b pb-2">Monthly Cash Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2">Month</th>
                  <th className="p-2 text-right">Collected</th>
                  <th className="p-2 text-right">Outstanding</th>
                  <th className="p-2 text-right">Total Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 font-medium text-slate-700">{row.month}</td>
                    <td className="p-2 text-right text-green-600 font-medium">{formatCurrency(row.cashCollected)}</td>
                    <td className="p-2 text-right text-red-500 font-medium">{formatCurrency(row.cashOutstanding)}</td>
                    <td className="p-2 text-right text-slate-800 font-bold">{formatCurrency(row.cashCollected + row.cashOutstanding)}</td>
                  </tr>
                ))}
                {monthlyData.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-400">No data available</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Unit Analysis */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-semibold mb-3 text-slate-800 border-b pb-2">Monthly Units Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2">Month</th>
                  <th className="p-2 text-center">Paid Units</th>
                  <th className="p-2 text-center">Unpaid Units</th>
                  <th className="p-2 text-center">Total Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 font-medium text-slate-700">{row.month}</td>
                    <td className="p-2 text-center text-green-600 font-medium">{row.unitsCollected}</td>
                    <td className="p-2 text-center text-amber-500 font-medium">{row.unitsOutstanding}</td>
                    <td className="p-2 text-center text-slate-800 font-bold">{row.unitsCollected + row.unitsOutstanding}</td>
                  </tr>
                ))}
                {monthlyData.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-400">No data available</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Statistics Table */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
         <h3 className="text-base font-semibold mb-3 text-slate-800 border-b pb-2">Product Performance Statistics</h3>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
               <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                     <th className="p-3">Product Name</th>
                     <th className="p-3 text-center">Units Sold</th>
                     <th className="p-3 text-center">Current Stock</th>
                     <th className="p-3 text-right">Total Revenue</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {productStats.map((prod, idx) => (
                     <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-800">{prod.name}</td>
                        <td className="p-3 text-center text-blue-600 font-medium">{prod.sold}</td>
                        <td className="p-3 text-center text-slate-600">{prod.stock}</td>
                        <td className="p-3 text-right text-emerald-600 font-bold">{formatCurrency(prod.revenue)}</td>
                     </tr>
                  ))}
                  {productStats.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">No product sales data found</td></tr>}
               </tbody>
            </table>
         </div>
      </div>

    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between min-h-[90px] relative overflow-hidden group">
    <div className="relative z-10">
      <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">
          {title} {subtitle && <span className="text-[9px] text-slate-400 font-normal lowercase">{subtitle}</span>}
      </p>
      <h3 className="text-base md:text-lg font-bold text-slate-800">{value}</h3>
    </div>
    <div className={`p-2 rounded-lg ${color} text-white shadow-lg shadow-opacity-20 relative z-10`}>
      <Icon size={18} />
    </div>
    {/* Decorative BG Icon */}
    <div className={`absolute -bottom-2 -right-2 opacity-5 text-slate-900 group-hover:scale-110 transition-transform`}>
        <Icon size={64} />
    </div>
  </div>
);

export default Dashboard;