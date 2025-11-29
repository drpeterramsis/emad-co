import React, { useState, useEffect } from 'react';
import { getOrders, addTransaction, getFinancialStats, updateOrder, getTransactions, deleteTransaction, updateTransaction } from '../utils/storage';
import { Order, TransactionType, OrderStatus, DashboardStats, Transaction, PaymentMethod } from '../types';
import { ArrowRightLeft, DollarSign, Wallet, Loader2, Filter, Search, Calendar, CheckSquare, X, History, FileText, Trash2, Edit2, TrendingDown, TrendingUp } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/helpers';

const Collections = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'deposits' | 'statement'>('pending');

  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters for History
  const [searchHistory, setSearchHistory] = useState('');
  const [historyMonth, setHistoryMonth] = useState('');

  // HQ Transfer State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferDesc, setTransferDesc] = useState('Transfer to HQ Bank Account');
  const [editingDeposit, setEditingDeposit] = useState<Transaction | null>(null);
  
  // Itemized Payment State
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentItems, setPaymentItems] = useState<{index: number, payQty: number, selected: boolean}[]>([]);
  const [actualCollectedAmount, setActualCollectedAmount] = useState<string>('');
  
  // Filters for Pending
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchMonth, setSearchMonth] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    const [fetchedOrders, fetchedStats, fetchedTxns] = await Promise.all([
      getOrders(),
      getFinancialStats(),
      getTransactions()
    ]);
    setOrders(fetchedOrders);
    setStats(fetchedStats);
    setTransactions(fetchedTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setLoading(false);
  };

  /* --- PAYMENT LOGIC --- */
  const openPaymentModal = (order: Order) => {
    setSelectedOrderForPayment(order);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    const initItems = order.items.map((item, idx) => ({
      index: idx,
      payQty: item.quantity - (item.paidQuantity || 0),
      selected: (item.quantity - (item.paidQuantity || 0)) > 0
    }));
    setPaymentItems(initItems);
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

    const updatedItems = [...selectedOrderForPayment.items];
    const paidDetails: string[] = [];

    paymentItems.forEach(state => {
      if (state.selected && state.payQty > 0) {
        const item = updatedItems[state.index];
        const newPaidQty = (item.paidQuantity || 0) + state.payQty;
        updatedItems[state.index] = { ...item, paidQuantity: newPaidQty };
        paidDetails.push(`${state.payQty}x ${item.productName}`);
      }
    });

    await updateOrder({ ...selectedOrderForPayment, items: updatedItems });

    const description = paidDetails.length > 0 ? `Payment for: ${paidDetails.join(', ')}` : `Lump sum payment`;

    await addTransaction({
      id: `TXN-${Date.now()}`,
      type: TransactionType.PAYMENT_RECEIVED,
      amount: amount,
      date: paymentDate,
      referenceId: selectedOrderForPayment.id,
      description: description
    });

    setSelectedOrderForPayment(null);
    await refreshData();
  };

  /* --- DEPOSIT LOGIC --- */
  const openDepositModal = (deposit?: Transaction) => {
    if (deposit) {
      setEditingDeposit(deposit);
      setTransferAmount(deposit.amount.toString());
      setTransferDate(new Date(deposit.date).toISOString().split('T')[0]);
      setTransferDesc(deposit.description);
    } else {
      setEditingDeposit(null);
      setTransferAmount('');
      setTransferDate(new Date().toISOString().split('T')[0]);
      setTransferDesc('Transfer to HQ Bank Account');
    }
    setShowTransferModal(true);
  };

  const handleDepositToHQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stats) return;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid amount.");
      return;
    }
    
    // Check constraints only for new deposits
    if (!editingDeposit && amount > stats.repCashOnHand) {
       alert("Invalid transfer amount. Cannot exceed Cash on Hand.");
       return;
    }

    if (editingDeposit) {
       await updateTransaction({
         ...editingDeposit,
         amount,
         date: new Date(transferDate).toISOString(),
         description: transferDesc
       });
    } else {
      await addTransaction({
        id: `TXN-${Date.now()}`,
        type: TransactionType.DEPOSIT_TO_HQ,
        amount: amount,
        date: new Date(transferDate).toISOString(),
        description: transferDesc
      });
    }

    setTransferAmount('');
    setShowTransferModal(false);
    await refreshData();
  };

  const handleDeleteDeposit = async (id: string) => {
    if(window.confirm("Are you sure you want to delete this deposit? This will return the amount to 'Cash on Hand'.")){
      await deleteTransaction(id);
      await refreshData();
    }
  }

  /* --- DATA FILTERS --- */
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

  // Collections History
  const collectionHistory = transactions
    .filter(t => t.type === TransactionType.PAYMENT_RECEIVED)
    .filter(t => {
      // Find customer name from order ref if possible, or just search description/id
      const order = orders.find(o => o.id === t.referenceId);
      const customerName = order?.customerName || '';
      
      const matchesSearch = customerName.toLowerCase().includes(searchHistory.toLowerCase()) || 
                            t.description.toLowerCase().includes(searchHistory.toLowerCase()) ||
                            t.referenceId?.toLowerCase().includes(searchHistory.toLowerCase());
      
      const matchesMonth = historyMonth === '' || t.date.startsWith(historyMonth);
      return matchesSearch && matchesMonth;
    });

  // Deposits History
  const depositHistory = transactions.filter(t => t.type === TransactionType.DEPOSIT_TO_HQ);
  
  // Statement Data: All transactions affecting Rep Cash
  // (Collections + Deposits + Cash Expenses)
  const statementData = transactions
    .filter(t => 
      t.type === TransactionType.PAYMENT_RECEIVED || 
      t.type === TransactionType.DEPOSIT_TO_HQ || 
      (t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CASH)
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Chronological for ledger

  // Calculate Monthly Report Stats
  const getMonthlyReport = () => {
     const monthFilter = historyMonth || new Date().toISOString().slice(0, 7); // Default to current or selected
     
     const collected = transactions
        .filter(t => t.type === TransactionType.PAYMENT_RECEIVED && t.date.startsWith(monthFilter))
        .reduce((sum, t) => sum + t.amount, 0);
        
     const deposited = transactions
        .filter(t => t.type === TransactionType.DEPOSIT_TO_HQ && t.date.startsWith(monthFilter))
        .reduce((sum, t) => sum + t.amount, 0);
        
     return { month: monthFilter, collected, deposited };
  }
  
  const report = getMonthlyReport();


  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 pb-24">
      {/* Top Header & Report */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Collections & Deposits</h2>
          <p className="text-slate-500">Manage payments, history, and HQ transfers</p>
        </div>
        
        {/* Cash on Hand Card */}
        <div className="bg-amber-50 border border-amber-200 px-6 py-3 rounded-xl flex items-center gap-4 shadow-sm">
           <div className="bg-amber-100 p-3 rounded-full text-amber-600"><Wallet size={24}/></div>
           <div>
             <p className="text-xs text-amber-800 font-bold uppercase tracking-wider">Cash on Hand</p>
             <p className="text-2xl font-bold text-amber-900">{formatCurrency(stats.repCashOnHand)}</p>
           </div>
        </div>
      </div>

      {/* Monthly Summary (Visible mostly when filters active or just generally) */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white shadow-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg"><FileText size={24} /></div>
            <div>
               <h3 className="font-bold text-lg">Monthly Report</h3>
               <p className="text-slate-300 text-sm">Summary for {report.month}</p>
            </div>
         </div>
         <div className="flex gap-8">
            <div className="text-right">
               <p className="text-xs text-slate-400 uppercase font-bold">Total Collected</p>
               <p className="text-xl font-bold text-teal-400">{formatCurrency(report.collected)}</p>
            </div>
            <div className="text-right border-l border-white/10 pl-8">
               <p className="text-xs text-slate-400 uppercase font-bold">Deposited to HQ</p>
               <p className="text-xl font-bold text-blue-400">{formatCurrency(report.deposited)}</p>
            </div>
            <div className="text-right border-l border-white/10 pl-8">
               <p className="text-xs text-slate-400 uppercase font-bold">Net Difference</p>
               <p className="text-xl font-bold text-white">{formatCurrency(report.collected - report.deposited)}</p>
            </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Outstanding Invoices
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Collection History
        </button>
        <button 
          onClick={() => setActiveTab('deposits')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'deposits' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          HQ Deposits
        </button>
        <button 
          onClick={() => setActiveTab('statement')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'statement' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Cash Statement
        </button>
      </div>

      {/* TAB CONTENT: PENDING */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search Customer..." 
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg w-full"
                />
              </div>
              <div className="relative">
                 <input type="month" value={searchMonth} onChange={(e) => setSearchMonth(e.target.value)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg" />
              </div>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                          <button onClick={() => openPaymentModal(order)} className="text-xs bg-primary text-white px-3 py-1.5 rounded hover:bg-teal-800 shadow-sm">
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
        </div>
      )}

      {/* TAB CONTENT: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search Customer or Transaction..." 
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg w-full"
                />
              </div>
              <div className="relative">
                 <input type="month" value={historyMonth} onChange={(e) => setHistoryMonth(e.target.value)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg" />
              </div>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                   <th className="p-4 font-medium text-slate-600">Date</th>
                   <th className="p-4 font-medium text-slate-600">Ref ID</th>
                   <th className="p-4 font-medium text-slate-600">Customer / Description</th>
                   <th className="p-4 font-medium text-slate-600 text-right">Amount</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {collectionHistory.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">No history found.</td></tr>
                 ) : (
                   collectionHistory.map(txn => {
                     const order = orders.find(o => o.id === txn.referenceId);
                     return (
                       <tr key={txn.id} className="hover:bg-slate-50">
                         <td className="p-4 text-slate-600">{formatDate(txn.date)}</td>
                         <td className="p-4 font-mono text-xs text-slate-500">{txn.referenceId || '-'}</td>
                         <td className="p-4">
                            <p className="font-medium text-slate-800">{order?.customerName || 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{txn.description}</p>
                         </td>
                         <td className="p-4 text-right font-bold text-teal-600">
                           {formatCurrency(txn.amount)}
                         </td>
                       </tr>
                     )
                   })
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* TAB CONTENT: DEPOSITS */}
      {activeTab === 'deposits' && (
        <div className="space-y-6">
           <div className="flex justify-end">
              <button 
                onClick={() => openDepositModal()}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 flex items-center gap-2 shadow-lg shadow-slate-900/20"
              >
                <ArrowRightLeft size={18} /> New Deposit to HQ
              </button>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                   <th className="p-4 font-medium text-slate-600">Deposit Date</th>
                   <th className="p-4 font-medium text-slate-600">Description</th>
                   <th className="p-4 font-medium text-slate-600">Amount</th>
                   <th className="p-4 font-medium text-slate-600 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {depositHistory.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">No deposits found.</td></tr>
                 ) : (
                   depositHistory.map(txn => (
                     <tr key={txn.id} className="hover:bg-slate-50">
                       <td className="p-4 text-slate-600">{formatDate(txn.date)}</td>
                       <td className="p-4 text-slate-800">{txn.description}</td>
                       <td className="p-4 font-bold text-slate-800">{formatCurrency(txn.amount)}</td>
                       <td className="p-4 text-right flex justify-end gap-2">
                          <button 
                            onClick={() => openDepositModal(txn)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Deposit"
                          >
                             <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDeposit(txn.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Return/Delete Deposit"
                          >
                             <Trash2 size={16} />
                          </button>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* TAB CONTENT: STATEMENT */}
      {activeTab === 'statement' && (
         <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800">Cash Statement Report</h3>
                <div className="text-sm text-slate-500">
                   Running Balance for Rep Cash on Hand
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                     <tr>
                        <th className="p-3 font-medium text-slate-600">Date</th>
                        <th className="p-3 font-medium text-slate-600">Description</th>
                        <th className="p-3 font-medium text-slate-600 text-center">Type</th>
                        <th className="p-3 font-medium text-slate-600 text-right">Debit (Out)</th>
                        <th className="p-3 font-medium text-slate-600 text-right">Credit (In)</th>
                        <th className="p-3 font-medium text-slate-600 text-right">Balance</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {(() => {
                        let balance = 0;
                        if (statementData.length === 0) return <tr><td colSpan={6} className="p-8 text-center text-slate-400">No transactions recorded.</td></tr>;

                        return statementData.map(txn => {
                           const isCredit = txn.type === TransactionType.PAYMENT_RECEIVED;
                           // Calculate Balance
                           if (isCredit) balance += txn.amount;
                           else balance -= txn.amount;

                           return (
                              <tr key={txn.id} className="hover:bg-slate-50">
                                 <td className="p-3 text-slate-600">{formatDate(txn.date)}</td>
                                 <td className="p-3 text-slate-800">{txn.description}</td>
                                 <td className="p-3 text-center">
                                    {txn.type === TransactionType.PAYMENT_RECEIVED && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Collection</span>}
                                    {txn.type === TransactionType.DEPOSIT_TO_HQ && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">Deposit</span>}
                                    {txn.type === TransactionType.EXPENSE && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">Expense</span>}
                                 </td>
                                 <td className="p-3 text-right text-slate-500">
                                    {!isCredit ? formatCurrency(txn.amount) : '-'}
                                 </td>
                                 <td className="p-3 text-right text-slate-500">
                                    {isCredit ? formatCurrency(txn.amount) : '-'}
                                 </td>
                                 <td className="p-3 text-right font-bold text-slate-800">{formatCurrency(balance)}</td>
                              </tr>
                           );
                        });
                     })()}
                  </tbody>
               </table>
            </div>
         </div>
      )}

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
                         <th className="p-3 text-slate-600 text-center">Remaining Qty</th>
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
                 </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 shrink-0">
               <button onClick={() => setSelectedOrderForPayment(null)} className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
               <button onClick={handleSavePayment} className="px-6 py-2.5 rounded-lg bg-primary text-white hover:bg-teal-800 font-medium shadow-lg shadow-teal-700/30">Confirm Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingDeposit ? 'Edit Deposit' : 'Deposit Cash to HQ'}</h3>
            <form onSubmit={handleDepositToHQ}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                <input 
                   type="date"
                   required
                   value={transferDate}
                   onChange={(e) => setTransferDate(e.target.value)}
                   className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <input 
                   type="text"
                   value={transferDesc}
                   onChange={(e) => setTransferDesc(e.target.value)}
                   className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Amount to Transfer</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">EGP</span>
                  <input 
                    type="number" 
                    max={editingDeposit ? undefined : stats.repCashOnHand} // Limit only on new
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    placeholder="0.00"
                  />
                </div>
                {!editingDeposit && <p className="text-xs text-slate-500 mt-1">Available: {formatCurrency(stats.repCashOnHand)}</p>}
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowTransferModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900">{editingDeposit ? 'Update' : 'Confirm Deposit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collections;