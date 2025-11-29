import React, { useState, useEffect } from 'react';
import { getOrders, addTransaction, getFinancialStats } from '../utils/storage';
import { Order, TransactionType, OrderStatus, DashboardStats } from '../types';
import { ArrowRightLeft, DollarSign, Wallet, Loader2 } from 'lucide-react';

const Collections = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [loading, setLoading] = useState(true);

  // Filtering Logic
  const unpaidOrders = orders.filter(o => o.status !== OrderStatus.PAID);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    const [fetchedOrders, fetchedStats] = await Promise.all([
      getOrders(),
      getFinancialStats()
    ]);
    setOrders(fetchedOrders);
    setStats(fetchedStats);
    setLoading(false);
  };

  const handleCollect = async (orderId: string, amountDue: number) => {
    const amountStr = prompt(`Enter amount collected for Order #${orderId} (Max: ${amountDue})`, amountDue.toString());
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > amountDue) {
      alert("Invalid amount.");
      return;
    }

    await addTransaction({
      id: `TXN-${Date.now()}`,
      type: TransactionType.PAYMENT_RECEIVED,
      amount: amount,
      date: new Date().toISOString(),
      referenceId: orderId,
      description: `Collection for Order #${orderId}`
    });

    await refreshData();
  };

  const handleDepositToHQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stats) return;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0 || amount > stats.repCashOnHand) {
      alert("Invalid transfer amount. Cannot exceed Cash on Hand.");
      return;
    }

    await addTransaction({
      id: `TXN-${Date.now()}`,
      type: TransactionType.DEPOSIT_TO_HQ,
      amount: amount,
      date: new Date().toISOString(),
      description: 'Transfer to HQ Bank Account'
    });

    setTransferAmount('');
    setShowTransferModal(false);
    await refreshData();
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Collections</h2>
          <p className="text-slate-500">Manage payments and transfers</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg flex items-center gap-3">
             <div className="bg-amber-100 p-2 rounded-full text-amber-600"><Wallet size={18}/></div>
             <div>
               <p className="text-xs text-amber-800 font-bold uppercase tracking-wider">Cash on Hand</p>
               <p className="text-xl font-bold text-amber-900">${stats.repCashOnHand.toLocaleString()}</p>
             </div>
          </div>
          <button 
            onClick={() => setShowTransferModal(true)}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 flex items-center gap-2 shadow-lg shadow-slate-900/20"
          >
            <ArrowRightLeft size={18} /> Deposit to HQ
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">Outstanding Invoices</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-medium text-slate-600">Invoice ID</th>
              <th className="p-4 font-medium text-slate-600">Customer</th>
              <th className="p-4 font-medium text-slate-600">Date</th>
              <th className="p-4 font-medium text-slate-600">Total</th>
              <th className="p-4 font-medium text-slate-600">Paid</th>
              <th className="p-4 font-medium text-slate-600">Balance</th>
              <th className="p-4 font-medium text-slate-600 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {unpaidOrders.length === 0 ? (
               <tr><td colSpan={7} className="p-8 text-center text-slate-400">All invoices paid!</td></tr>
            ) : (
              unpaidOrders.map(order => {
                const balance = order.totalAmount - order.paidAmount;
                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-xs">{order.id}</td>
                    <td className="p-4 font-medium text-slate-800">{order.customerName}</td>
                    <td className="p-4 text-slate-600">{new Date(order.date).toLocaleDateString()}</td>
                    <td className="p-4">${order.totalAmount.toFixed(2)}</td>
                    <td className="p-4 text-green-600 font-medium">${order.paidAmount.toFixed(2)}</td>
                    <td className="p-4 font-bold text-red-500">${balance.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleCollect(order.id, balance)}
                        className="text-xs bg-primary text-white px-3 py-1.5 rounded hover:bg-teal-800 transition-colors"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Deposit Cash to HQ</h3>
            <form onSubmit={handleDepositToHQ}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Amount to Transfer</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                  <input 
                    type="number" 
                    max={stats.repCashOnHand}
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Available: ${stats.repCashOnHand.toFixed(2)}</p>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collections;