import React, { useEffect, useState } from 'react';
import { getOrders, getTransactions } from '../utils/storage';
import { TransactionType } from '../types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/helpers';
import {  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Analysis = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    calculateAnalysis();
  }, []);

  const calculateAnalysis = async () => {
    const [orders, transactions] = await Promise.all([
      getOrders(),
      getTransactions()
    ]);

    const stats: Record<string, { sales: number; collected: number }> = {};

    // Process Sales (Orders)
    orders.forEach(order => {
      if (order.isDraft) return;
      // Use YYYY-MM format
      const month = order.date.substring(0, 7); 
      if (!stats[month]) stats[month] = { sales: 0, collected: 0 };
      stats[month].sales += order.totalAmount;
    });

    // Process Collections (Transactions)
    transactions.forEach(txn => {
      if (txn.type === TransactionType.PAYMENT_RECEIVED) {
        const month = txn.date.substring(0, 7);
        if (!stats[month]) stats[month] = { sales: 0, collected: 0 };
        stats[month].collected += txn.amount;
      }
    });

    // Convert to array and sort
    const data = Object.keys(stats).map(month => ({
      month,
      sales: stats[month].sales,
      collected: stats[month].collected,
      outstanding: stats[month].sales - stats[month].collected // Gap for that month (Net)
    })).sort((a, b) => b.month.localeCompare(a.month)); // Newest first

    setMonthlyData(data);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="p-4 md:p-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Monthly Analysis</h2>
          <p className="text-slate-500 text-xs md:text-sm">Detailed breakdown of sales vs collections</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-80">
          <h3 className="font-bold text-slate-700 mb-4">Performance Overview</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...monthlyData].reverse()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{fontSize: 10}} />
              <YAxis tick={{fontSize: 10}} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#0f766e" name="Sales" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" fill="#0ea5e9" name="Collected" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <h3 className="font-bold text-slate-700 mb-4">Data Table</h3>
             <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 border-b">
                      <tr>
                         <th className="p-2">Month</th>
                         <th className="p-2 text-right">Sales</th>
                         <th className="p-2 text-right">Collected</th>
                         <th className="p-2 text-right">Difference</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y">
                      {monthlyData.map(row => (
                         <tr key={row.month} className="hover:bg-slate-50">
                            <td className="p-2 font-medium">{row.month}</td>
                            <td className="p-2 text-right text-slate-600">{formatCurrency(row.sales)}</td>
                            <td className="p-2 text-right text-green-600">{formatCurrency(row.collected)}</td>
                            <td className={`p-2 text-right font-bold ${row.outstanding > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                               {formatCurrency(row.outstanding)}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Analysis;