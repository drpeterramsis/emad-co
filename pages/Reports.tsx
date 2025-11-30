
import React, { useState, useEffect, useMemo } from 'react';
import { getOrders, getCustomers, getProducts } from '../utils/storage';
import { Order, Customer, Product, OrderStatus, OrderItem } from '../types';
import { Loader2, Filter, Calendar, User, Package, Layers, Download, Printer, TrendingUp, DollarSign, BarChart3, AlertCircle } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/helpers';
import { useLanguage } from '../contexts/LanguageContext';

type GroupByOption = 'none' | 'customer' | 'product' | 'month';

const Reports = () => {
  const { t } = useLanguage();
  
  // Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  
  // View State
  const [groupBy, setGroupBy] = useState<GroupByOption>('customer');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [o, c, p] = await Promise.all([
      getOrders(),
      getCustomers(),
      getProducts()
    ]);
    // Filter out drafts immediately
    setOrders(o.filter(x => !x.isDraft));
    setCustomers(c);
    setProducts(p);
    setLoading(false);
  };

  // --- ENGINE: Filter & Aggregate ---

  const reportData = useMemo(() => {
    // 1. Filter Orders
    let filteredOrders = orders.filter(o => {
      // Date Filter
      if (dateStart && new Date(o.date) < new Date(dateStart)) return false;
      if (dateEnd && new Date(o.date) > new Date(dateEnd)) return false;

      // Customer Filter
      if (selectedCustomer !== 'All' && o.customerId !== selectedCustomer) return false;

      // Status Filter
      if (selectedStatus !== 'All' && o.status !== selectedStatus) return false;
      
      return true;
    });

    // 2. Filter Items (If Product is selected, we only consider that product's contribution)
    // Note: If grouping by Order/Customer, we usually sum the WHOLE order, 
    // but if filtering by Product, we typically only want stats for THAT product.
    
    // Helper to calculate relevant totals based on product filter
    const getRelevantItems = (order: Order) => {
      if (selectedProduct === 'All') return order.items;
      return order.items.filter(i => i.productId === selectedProduct);
    };

    // If Product Filter is active, filter out orders that don't contain the product at all
    if (selectedProduct !== 'All') {
      filteredOrders = filteredOrders.filter(o => o.items.some(i => i.productId === selectedProduct));
    }

    // 3. Grouping Logic
    let groupedResult: any[] = [];
    let summary = { totalSales: 0, totalCount: 0, totalProfit: 0 }; // Profit not calculated yet

    if (groupBy === 'customer') {
      const groups: Record<string, { id: string, name: string, count: number, total: number, lastDate: string }> = {};
      
      filteredOrders.forEach(o => {
        const relevantItems = getRelevantItems(o);
        const orderTotal = relevantItems.reduce((sum, i) => sum + i.subtotal, 0);
        
        // For Customers, we aggregate the filtered value
        if (!groups[o.customerId]) {
          groups[o.customerId] = { id: o.customerId, name: o.customerName, count: 0, total: 0, lastDate: o.date };
        }
        groups[o.customerId].count += 1;
        groups[o.customerId].total += orderTotal;
        if (new Date(o.date) > new Date(groups[o.customerId].lastDate)) {
           groups[o.customerId].lastDate = o.date;
        }
      });
      groupedResult = Object.values(groups).sort((a, b) => b.total - a.total);
    
    } else if (groupBy === 'product') {
      const groups: Record<string, { id: string, name: string, qty: number, bonus: number, revenue: number, ordersCount: number }> = {};
      
      filteredOrders.forEach(o => {
        const relevantItems = getRelevantItems(o);
        relevantItems.forEach(item => {
           if (!groups[item.productId]) {
             groups[item.productId] = { 
               id: item.productId, 
               name: item.productName, 
               qty: 0, 
               bonus: 0, 
               revenue: 0, 
               ordersCount: 0 
             };
           }
           groups[item.productId].qty += item.quantity;
           groups[item.productId].bonus += item.bonusQuantity;
           groups[item.productId].revenue += item.subtotal;
           groups[item.productId].ordersCount += 1;
        });
      });
      groupedResult = Object.values(groups).sort((a, b) => b.revenue - a.revenue);

    } else if (groupBy === 'month') {
      const groups: Record<string, { month: string, count: number, total: number }> = {};
      
      filteredOrders.forEach(o => {
        const relevantItems = getRelevantItems(o);
        const orderTotal = relevantItems.reduce((sum, i) => sum + i.subtotal, 0);
        const monthKey = o.date.substring(0, 7); // YYYY-MM
        
        if (!groups[monthKey]) {
          groups[monthKey] = { month: monthKey, count: 0, total: 0 };
        }
        groups[monthKey].count += 1;
        groups[monthKey].total += orderTotal;
      });
      groupedResult = Object.values(groups).sort((a, b) => b.month.localeCompare(a.month));

    } else {
      // None / Flat List
      groupedResult = filteredOrders.map(o => {
        const relevantItems = getRelevantItems(o);
        const orderTotal = relevantItems.reduce((sum, i) => sum + i.subtotal, 0);
        return {
          ...o,
          computedTotal: orderTotal // This might differ from o.totalAmount if product filter is on
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Calculate Grand Totals
    if (groupBy === 'none') {
       summary.totalSales = groupedResult.reduce((sum, item) => sum + item.computedTotal, 0);
       summary.totalCount = groupedResult.length;
    } else if (groupBy === 'product') {
       summary.totalSales = groupedResult.reduce((sum, item) => sum + item.revenue, 0);
       summary.totalCount = filteredOrders.length; // Approximate context
    } else {
       summary.totalSales = groupedResult.reduce((sum, item) => sum + item.total, 0);
       summary.totalCount = filteredOrders.length;
    }

    return { data: groupedResult, summary };

  }, [orders, dateStart, dateEnd, selectedCustomer, selectedProduct, selectedStatus, groupBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-primary" /> {t('advancedReports')}
          </h2>
          <p className="text-slate-500 text-xs md:text-sm">{t('reportSubtitle')}</p>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm font-medium print:hidden">
          <Printer size={16} /> {t('printReport')}
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 print:hidden">
        <div className="flex items-center gap-2 mb-3 text-slate-700 font-bold text-sm">
          <Filter size={16} /> {t('reportFilters')}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">{t('dateRange')}</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={dateStart} 
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-primary"
              />
              <span className="text-slate-400">-</span>
              <input 
                type="date" 
                value={dateEnd} 
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Customer */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">{t('customer')}</label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-primary bg-white appearance-none"
              >
                <option value="All">{t('allCustomers')}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-1">
             <label className="text-[10px] uppercase font-bold text-slate-500">{t('product')}</label>
             <div className="relative">
              <Package className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-primary bg-white appearance-none"
              >
                <option value="All">{t('allProducts')}</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Status & Group By */}
          <div className="space-y-1">
             <div className="flex gap-2">
               <div className="flex-1">
                 <label className="text-[10px] uppercase font-bold text-slate-500">{t('status')}</label>
                 <select
                   value={selectedStatus}
                   onChange={(e) => setSelectedStatus(e.target.value)}
                   className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-primary bg-white"
                 >
                   <option value="All">{t('allStatus')}</option>
                   {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>
               <div className="flex-1">
                 <label className="text-[10px] uppercase font-bold text-slate-500">{t('groupBy')}</label>
                 <select
                   value={groupBy}
                   onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                   className="w-full p-2 border border-teal-200 bg-teal-50 text-teal-800 rounded-lg text-xs outline-none focus:border-teal-500 font-medium"
                 >
                   <option value="customer">{t('customer')}</option>
                   <option value="product">{t('product')}</option>
                   <option value="month">{t('month')}</option>
                   <option value="none">{t('noneFlatList')}</option>
                 </select>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
           <div className="bg-teal-100 p-3 rounded-full text-teal-600">
             <DollarSign size={24} />
           </div>
           <div>
             <p className="text-xs text-slate-500 font-bold uppercase">{t('totalSales')}</p>
             <h3 className="text-xl font-bold text-slate-800">{formatCurrency(reportData.summary.totalSales)}</h3>
           </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
           <div className="bg-blue-100 p-3 rounded-full text-blue-600">
             <Layers size={24} />
           </div>
           <div>
             <p className="text-xs text-slate-500 font-bold uppercase">{groupBy === 'product' ? t('productsSold') : t('ordersCount')}</p>
             <h3 className="text-xl font-bold text-slate-800">
               {groupBy === 'product' ? reportData.data.length : reportData.summary.totalCount}
             </h3>
           </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
           <div className="bg-amber-100 p-3 rounded-full text-amber-600">
             <TrendingUp size={24} />
           </div>
           <div>
             <p className="text-xs text-slate-500 font-bold uppercase">{t('averageValue')}</p>
             <h3 className="text-xl font-bold text-slate-800">
               {formatCurrency(reportData.summary.totalCount > 0 ? reportData.summary.totalSales / reportData.summary.totalCount : 0)}
             </h3>
           </div>
        </div>
      </div>

      {/* Dynamic Report Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">{t('reportResults')} - {t(groupBy === 'none' ? 'none' : groupBy)}</h3>
          <span className="text-xs text-slate-500">{reportData.data.length} {t('records')}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            {/* Table Header */}
            <thead className="bg-white border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
              {groupBy === 'customer' && (
                <tr>
                   <th className="p-3">{t('customerName')}</th>
                   <th className="p-3 text-center">{t('ordersCount')}</th>
                   <th className="p-3">{t('lastActivity')}</th>
                   <th className="p-3 text-right">{t('totalRevenue')}</th>
                </tr>
              )}
              {groupBy === 'product' && (
                <tr>
                   <th className="p-3">{t('productName')}</th>
                   <th className="p-3 text-center">{t('unitsSold')}</th>
                   <th className="p-3 text-center">{t('bonusUnits')}</th>
                   <th className="p-3 text-center">{t('ordersInvolved')}</th>
                   <th className="p-3 text-right">{t('totalRevenue')}</th>
                </tr>
              )}
              {groupBy === 'month' && (
                <tr>
                   <th className="p-3">{t('month')}</th>
                   <th className="p-3 text-center">{t('ordersCount')}</th>
                   <th className="p-3 text-right">{t('totalSales')}</th>
                </tr>
              )}
              {groupBy === 'none' && (
                <tr>
                   <th className="p-3">{t('date')}</th>
                   <th className="p-3">{t('invoiceId')}</th>
                   <th className="p-3">{t('customer')}</th>
                   <th className="p-3">{t('status')}</th>
                   <th className="p-3 text-right">{t('amount')}</th>
                </tr>
              )}
            </thead>
            
            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {reportData.data.length === 0 ? (
                 <tr><td colSpan={5} className="p-8 text-center text-slate-400">{t('noDataFound')}</td></tr>
              ) : (
                reportData.data.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    
                    {/* CUSTOMER VIEW */}
                    {groupBy === 'customer' && (
                      <>
                        <td className="p-3 font-medium text-slate-800">{row.name}</td>
                        <td className="p-3 text-center text-slate-600">{row.count}</td>
                        <td className="p-3 text-slate-500">{formatDate(row.lastDate)}</td>
                        <td className="p-3 text-right font-bold text-primary">{formatCurrency(row.total)}</td>
                      </>
                    )}

                    {/* PRODUCT VIEW */}
                    {groupBy === 'product' && (
                      <>
                        <td className="p-3 font-medium text-slate-800">{row.name}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{row.qty}</td>
                        <td className="p-3 text-center text-orange-600">{row.bonus > 0 ? `+${row.bonus}` : '-'}</td>
                        <td className="p-3 text-center text-slate-500">{row.ordersCount}</td>
                        <td className="p-3 text-right font-bold text-primary">{formatCurrency(row.revenue)}</td>
                      </>
                    )}

                    {/* MONTH VIEW */}
                    {groupBy === 'month' && (
                      <>
                        <td className="p-3 font-medium text-slate-800">{row.month}</td>
                        <td className="p-3 text-center text-slate-600">{row.count}</td>
                        <td className="p-3 text-right font-bold text-primary">{formatCurrency(row.total)}</td>
                      </>
                    )}

                    {/* FLAT LIST VIEW */}
                    {groupBy === 'none' && (
                      <>
                        <td className="p-3 text-slate-600">{formatDate(row.date)}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-500">{row.id}</td>
                        <td className="p-3 font-medium text-slate-800">{row.customerName}</td>
                        <td className="p-3">
                           <span className={`px-2 py-0.5 rounded text-[10px] border ${
                             row.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                             row.status === 'Returned' ? 'bg-red-50 text-red-700 border-red-200' : 
                             'bg-slate-50 text-slate-600 border-slate-200'
                           }`}>
                             {row.status}
                           </span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">{formatCurrency(row.computedTotal)}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
