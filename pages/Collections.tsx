

import React, { useState, useEffect } from 'react';
import { getOrders, addTransaction, getFinancialStats, updateOrder } from '../utils/storage';
import { Order, TransactionType, OrderStatus, DashboardStats, OrderItem } from '../types';
import { ArrowRightLeft, DollarSign, Wallet, Loader2, Filter, Search, Calendar, CheckSquare, X } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/helpers';

const Collections = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // HQ Transfer State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  
  // Itemized Payment State
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentItems, setPaymentItems] = useState<{index: number, payQty: number, selected: boolean}[]>([]);
  const [actualCollectedAmount, setActualCollectedAmount] = useState<string>('');
  
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchMonth, setSearchMonth] = useState('');

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

  const openPaymentModal = (order: Order) => {
    setSelectedOrderForPayment(order);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    // Initialize payment state for items
    const initItems = order.items.map((item, idx) => ({
      index: idx,
      payQty: item.quantity - (item.paidQuantity || 0), // Default to remaining qty
      selected: (item.quantity - (item.paidQuantity || 0)) > 0 // Select if there is remaining qty
    }));
    setPaymentItems(initItems);
    
    // Initial Calc
    const suggested = calculateSuggestedAmount(order, initItems);
    setActualCollectedAmount(suggested.toFixed(2));
  };

  const calculateSuggestedAmount = (order: Order, itemsState: typeof paymentItems) => {
    let total = 0;
    itemsState.forEach(state => {
      if (state.selected) {
        const item = order.items[state.index];
        const unitSubtotal = item.quantity > 0 ? item.subtotal / item.quantity : 0;
        total += unitSubtotal * state.payQty;
      }
    });
    return total;
  };

  const handlePaymentItemChange = (index: number, field: 'selected' | 'payQty', value: any) => {
    const newItems = [...paymentItems];
    const itemState = newItems.find(i => i.index === index);
    if (!itemState) return;

    if (field === 'selected') {
      itemState.selected = value;
    } else if (field === 'payQty') {
      itemState.payQty = Number(value);
    }

    setPaymentItems(newItems);
    
    // Update Suggested Amount
    if (selectedOrderForPayment) {
      const suggested = calculateSuggestedAmount(selectedOrderForPayment, newItems);
      setActualCollectedAmount(suggested.toFixed(2));
    }
  };

  const handleSavePayment = async () => {
    if (!selectedOrderForPayment) return;
    
    const amount = parseFloat(actualCollectedAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    // 1. Build Description & Update Items
    const updatedItems = [...selectedOrderForPayment.items];
    const paidDetails: string[] = [];

    paymentItems.forEach(state => {
      if (state.selected && state.payQty > 0) {
        const item = updatedItems[state.index];
        const newPaidQty = (item.paidQuantity || 0) + state.payQty;
        // Update item in local copy
        updatedItems[state.index] = { ...item, paidQuantity: newPaidQty };
        paidDetails.push(`${state.payQty}x ${item.productName}`);
      }
    });

    // 2. Update Order Items (to persist paidQuantity)
    await updateOrder({
      ...selectedOrderForPayment,
      items: updatedItems
    });

    // 3. Add Transaction (This will also update order paidAmount and status)
    const description = paidDetails.length > 0 
      ? `Payment for: ${paidDetails.join(', ')}`
      : `Lump sum payment`;

    await addTransaction({
      id: `TXN-${Date.now()}`,
      type: TransactionType.PAYMENT_RECEIVED,
      amount: amount,
      date: paymentDate, // Use selected date
      referenceId: selectedOrderForPayment.id,
      description: description
    });

    setSelectedOrderForPayment(null);
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

  // Filter Logic
  const unpaidOrders = orders
    .filter(o => o.status !== OrderStatus.PAID)
    .filter(o => {
      const matchesCustomer = o.customerName.toLowerCase().includes(searchCustomer.toLowerCase()) || 
                              o.id.toLowerCase().includes(searchCustomer.toLowerCase());
      
      const matchesProduct = searchProduct === '' || o.items.some(item => 
        item.productName.toLowerCase().includes(searchProduct.toLowerCase())
      );
  
      const matchesMonth = searchMonth === '' || o.date.startsWith(searchMonth);
  
      return matchesCustomer && matchesProduct && matchesMonth;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Collections</h2>
            <p className="text-slate-500">Manage payments and transfers</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg flex items-center gap-3">
               <div className="bg-amber-100 p-2 rounded-full text-amber-600"><Wallet size={18}/></div>
               <div>
                 <p className="text-xs text-amber-800 font-bold uppercase tracking-wider">Cash on Hand</p>
                 <p className="text-xl font-bold text-amber-900">{formatCurrency(stats.repCashOnHand)}</p>
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

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-slate-500 mr-2">
            <Filter size={20} />
            <span className="font-medium text-sm">Filters:</span>
          </div>
          
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Customer or Invoice #..." 
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none w-full"
            />
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter by Product..." 
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none w-full"
            />
          </div>

          <div className="relative">
             <input 
              type="month"
              value={searchMonth}
              onChange={(e) => setSearchMonth(e.target.value)}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-600"
            />
          </div>

           <button 
             onClick={() => { setSearchCustomer(''); setSearchProduct(''); setSearchMonth(''); }}
             className="text-sm text-slate-500 hover:text-red-500 underline"
           >
             Clear
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
               <tr><td colSpan={7} className="p-8 text-center text-slate-400">All invoices paid or no matches!</td></tr>
            ) : (
              unpaidOrders.map(order => {
                const balance = order.totalAmount - order.paidAmount;
                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-xs">{order.id}</td>
                    <td className="p-4 font-medium text-slate-800">{order.customerName}</td>
                    <td className="p-4 text-slate-600">{formatDate(order.date)}</td>
                    <td className="p-4">{formatCurrency(order.totalAmount)}</td>
                    <td className="p-4 text-green-600 font-medium">{formatCurrency(order.paidAmount)}</td>
                    <td className="p-4 font-bold text-red-500">{formatCurrency(balance)}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => openPaymentModal(order)}
                        className="text-xs bg-primary text-white px-3 py-1.5 rounded hover:bg-teal-800 transition-colors shadow-sm"
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

      {/* Itemized Payment Modal */}
      {selectedOrderForPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Record Payment</h3>
                <p className="text-slate-500 text-sm">
                  #{selectedOrderForPayment.id} - {selectedOrderForPayment.customerName}
                </p>
              </div>
              <button onClick={() => setSelectedOrderForPayment(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                 <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                   <CheckSquare size={18} className="text-primary"/> Select Items Paid
                 </h4>
                 <div className="border border-slate-200 rounded-lg overflow-hidden">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200">
                       <tr>
                         <th className="p-3 w-10"></th>
                         <th className="p-3 text-slate-600">Product</th>
                         <th className="p-3 text-slate-600 text-right">Unit Price</th>
                         <th className="p-3 text-slate-600 text-center">Total Qty</th>
                         <th className="p-3 text-slate-600 text-center">Prev. Paid</th>
                         <th className="p-3 text-slate-600 text-center">Remaining</th>
                         <th className="p-3 text-slate-600 text-center w-24">Pay Now</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {selectedOrderForPayment.items.map((item, idx) => {
                         const state = paymentItems.find(i => i.index === idx);
                         if (!state) return null;
                         const remaining = item.quantity - (item.paidQuantity || 0);
                         
                         return (
                           <tr key={idx} className={state.selected ? 'bg-teal-50/30' : ''}>
                             <td className="p-3 text-center">
                               <input 
                                 type="checkbox" 
                                 checked={state.selected}
                                 onChange={(e) => handlePaymentItemChange(idx, 'selected', e.target.checked)}
                                 disabled={remaining <= 0}
                                 className="rounded border-slate-300 text-primary focus:ring-primary"
                               />
                             </td>
                             <td className="p-3 font-medium text-slate-800">{item.productName}</td>
                             <td className="p-3 text-right">{(item.subtotal / (item.quantity || 1)).toFixed(2)}</td>
                             <td className="p-3 text-center text-slate-500">{item.quantity}</td>
                             <td className="p-3 text-center text-green-600 font-medium">{item.paidQuantity || 0}</td>
                             <td className="p-3 text-center font-bold text-slate-700">{remaining}</td>
                             <td className="p-3">
                               <input 
                                 type="number" 
                                 min="0"
                                 max={remaining}
                                 value={state.payQty}
                                 onChange={(e) => handlePaymentItemChange(idx, 'payQty', e.target.value)}
                                 disabled={!state.selected || remaining <= 0}
                                 className="w-full p-1 text-center border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none"
                               />
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                       <Calendar size={16} /> Payment Date
                    </label>
                    <input 
                      type="date" 
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                       <DollarSign size={16} /> Collected Amount
                    </label>
                    <div className="relative">
                       <span className="absolute left-3 top-2.5 text-slate-400 font-bold">EGP</span>
                       <input 
                         type="number"
                         step="any" 
                         value={actualCollectedAmount}
                         onChange={(e) => setActualCollectedAmount(e.target.value)}
                         className="w-full pl-12 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none font-bold text-lg bg-white text-primary"
                       />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Based on selected items, expected: {calculateSuggestedAmount(selectedOrderForPayment, paymentItems).toFixed(2)}
                    </p>
                 </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 shrink-0">
               <button 
                  onClick={() => setSelectedOrderForPayment(null)}
                  className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium"
               >
                 Cancel
               </button>
               <button 
                  onClick={handleSavePayment}
                  className="px-6 py-2.5 rounded-lg bg-primary text-white hover:bg-teal-800 font-medium shadow-lg shadow-teal-700/30"
               >
                 Confirm Payment
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Deposit Cash to HQ</h3>
            <form onSubmit={handleDepositToHQ}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Amount to Transfer</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">EGP</span>
                  <input 
                    type="number" 
                    max={stats.repCashOnHand}
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Available: {formatCurrency(stats.repCashOnHand)}</p>
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