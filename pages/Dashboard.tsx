import React, { useEffect, useState, useMemo } from 'react';
import { getFinancialStats, getOrders, getCustomers, getProducts, getTransactions } from '../utils/storage';
import { Order, DashboardStats, Product, TransactionType } from '../types';
import { DollarSign, TrendingUp, AlertCircle, Loader2, Wallet, Users, Package, Coins, Landmark, Layers, Calendar, BarChart3, ArrowRightLeft } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/helpers';
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
  const [productStats, setProductStats] = useState<any[]>([]);
  const [rawOrders, setRawOrders] = useState<Order[]>([]);
  const [analysisData, setAnalysisData] = useState<any[]>([]); // New Data Table

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoadingData(true);
    const [fetchedStats, fetchedOrders, fetchedCustomers, fetchedProducts, fetchedTransactions] = await Promise.all([
      getFinancialStats(),
      getOrders(),
      getCustomers(),
      getProducts(),
      getTransactions()
    ]);
    
    setStats(fetchedStats);
    setRawOrders(fetchedOrders);

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

    // Product Stats Map
    const prodStatsMap: Record<string, { id: string, name: string, sold: number, revenue: number, stock: number }> = {};
    fetchedProducts.forEach(p => {
        prodStatsMap[p.id] = { id: p.id, name: p.name, sold: 0, revenue: 0, stock: p.stock };
    });

    const activeOrders = fetchedOrders.filter(o => !o.isDraft);

    activeOrders.forEach(order => {
       // Items Logic
       order.items.forEach(item => {
           // Product Stats Aggregation
           if (prodStatsMap[item.productId]) {
               prodStatsMap[item.productId].sold += item.quantity;
               prodStatsMap[item.productId].revenue += item.subtotal;
           }
       });
    });

    const sortedProductStats = Object.values(prodStatsMap).sort((a, b) => b.revenue - a.revenue);
    setProductStats(sortedProductStats);

    // Calculate Analysis Data (Sales vs Collected by Month) - Replacing old Cash Analysis
    const analysisStats: Record<string, { sales: number; collected: number }> = {};
    
    // Process Sales (Orders)
    activeOrders.forEach(order => {
        const month = order.date.substring(0, 7);
        if(!analysisStats[month]) analysisStats[month] = { sales: 0, collected: 0 };
        analysisStats[month].sales += order.totalAmount;
    });

    // Process Collections (Transactions)
    fetchedTransactions.forEach(txn => {
        if(txn.type === TransactionType.PAYMENT_RECEIVED) {
            const month = txn.date.substring(0, 7);
            if(!analysisStats[month]) analysisStats[month] = { sales: 0, collected: 0 };
            analysisStats[month].collected += txn.amount;
        }
    });

    const calculatedAnalysisData = Object.keys(analysisStats).map(month => ({
        month,
        sales: analysisStats[month].sales,
        collected: analysisStats[month].collected,
        difference: analysisStats[month].sales - analysisStats[month].collected
    })).sort((a, b) => b.month.localeCompare(a.month)); // Newest first

    setAnalysisData(calculatedAnalysisData);

    setLoadingData(false);
  };
  
  // Calculate Pivot Table for Units
  const pivotData = useMemo(() => {
    const activeOrders = rawOrders.filter(o => !o.isDraft);
    const pData: Record<string, { name: string, total: number, months: Record<string, number> }> = {};
    const monthsSet = new Set<string>();
    const monthTotals: Record<string, number> = {};

    activeOrders.forEach(o => {
        const month = o.date.substring(0, 7);
        monthsSet.add(month);
        
        o.items.forEach(item => {
            if (!pData[item.productId]) {
                pData[item.productId] = {
                    name: item.productName,
                    total: 0,
                    months: {}
                };
            }
            if (!pData[item.productId].months[month]) {
                pData[item.productId].months[month] = 0;
            }
            if (!monthTotals[month]) monthTotals[month] = 0;

            const qty = item.quantity;
            pData[item.productId].months[month] += qty;
            pData[item.productId].total += qty;
            monthTotals[month] += qty;
        });
    });
    
    // Sort months descending (Newest Left)
    const months = Array.from(monthsSet).sort().reverse();
    // Sort products by total quantity
    const rows = Object.values(pData).sort((a, b) => b.total - a.total);

    return { months, rows, monthTotals };
  }, [rawOrders]);

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

      {/* Product Statistics Table */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
         <h3 className="text-base font-semibold mb-3 text-slate-800 border-b pb-2 flex items-center gap-2">
           <BarChart3 size={18} className="text-primary"/> Product Performance Statistics
         </h3>
         <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left text-xs md:text-sm">
               <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                     <th className="p-3 bg-slate-50">Product Name</th>
                     <th className="p-3 text-center bg-slate-50">Units Sold</th>
                     <th className="p-3 text-center bg-slate-50">Current Stock</th>
                     <th className="p-3 text-right bg-slate-50">Total Revenue</th>
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

      {/* Monthly Units Analysis (Pivot Table) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <h3 className="text-base font-semibold mb-3 text-slate-800 border-b pb-2 flex items-center gap-2">
            <Calendar size={18} className="text-primary"/> Monthly Units Analysis (Pivot)
         </h3>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
               <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                     <th className="p-3 min-w-[150px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Product \ Month</th>
                     {pivotData.months.map(m => (
                        <th key={m} className="p-3 text-center min-w-[80px]">{formatDate(m + '-01').substring(3)}</th>
                     ))}
                     <th className="p-3 text-center min-w-[80px] bg-slate-100 font-extrabold text-slate-800 border-l border-slate-200">TOTAL</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {pivotData.rows.length === 0 ? (
                      <tr><td colSpan={pivotData.months.length + 2} className="p-4 text-center text-slate-400">No data available</td></tr>
                  ) : (
                      <>
                        {pivotData.rows.map((row, idx) => (
                           <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3 font-medium text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">{row.name}</td>
                              {pivotData.months.map(m => {
                                 const val = row.months[m] || 0;
                                 return (
                                   <td key={m} className={`p-3 text-center ${val > 0 ? 'text-blue-600 font-medium' : 'text-slate-300'}`}>
                                      {val > 0 ? val : '-'}
                                   </td>
                                 );
                              })}
                              <td className="p-3 text-center font-bold text-slate-900 bg-slate-50 border-l border-slate-200">{row.total}</td>
                           </tr>
                        ))}
                        {/* Column Totals */}
                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-200">
                           <td className="p-3 text-slate-800 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">MONTHLY TOTAL</td>
                           {pivotData.months.map(m => (
                              <td key={m} className="p-3 text-center text-slate-800">
                                 {pivotData.monthTotals[m] || 0}
                              </td>
                           ))}
                           <td className="p-3 text-center text-slate-900 bg-slate-200 border-l border-slate-300">
                              {pivotData.rows.reduce((s, r) => s + r.total, 0)}
                           </td>
                        </tr>
                      </>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* NEW: Performance Data Table (Replaces Monthly Cash Analysis) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <h3 className="font-bold text-slate-800 mb-3 text-base border-b pb-2 flex items-center gap-2">
               <ArrowRightLeft size={18} className="text-primary"/> {t('dataTable')}
             </h3>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                         <th className="p-3 font-medium text-slate-600">{t('month')}</th>
                         <th className="p-3 font-medium text-slate-600 text-right">{t('sales')}</th>
                         <th className="p-3 font-medium text-slate-600 text-right">{t('collected')}</th>
                         <th className="p-3 font-medium text-slate-600 text-right">{t('difference')}</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {analysisData.map(row => (
                         <tr key={row.month} className="hover:bg-slate-50">
                            <td className="p-3 font-medium text-slate-800">{formatDate(row.month + '-01').substring(3)}</td>
                            <td className="p-3 text-right text-slate-600 font-medium">{formatCurrency(row.sales)}</td>
                            <td className="p-3 text-right text-green-600 font-medium">{formatCurrency(row.collected)}</td>
                            <td className={`p-3 text-right font-bold ${row.difference > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                               {formatCurrency(row.difference)}
                            </td>
                         </tr>
                      ))}
                      {analysisData.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">No data available</td></tr>}
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