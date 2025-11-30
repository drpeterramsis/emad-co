import React, { useState, useEffect, useMemo } from 'react';
import { getOrders, addTransaction, getFinancialStats, updateOrder, getTransactions, deleteTransaction, updateTransaction, getProviders, addProvider } from '../utils/storage';
import { Order, TransactionType, OrderStatus, DashboardStats, Transaction, PaymentMethod, Provider } from '../types';
import { ArrowRightLeft, DollarSign, Wallet, Loader2, Filter, Search, Calendar, CheckSquare, X, History, FileText, Trash2, Edit2, TrendingDown, TrendingUp, Eye, Plus, Printer } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/helpers';
import ProviderModal from '../components/ProviderModal';

const Collections = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'deposits' | 'statement'>('pending');

  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters for History
  const [searchHistory, setSearchHistory] = useState('');
  const [historyMonth, setHistoryMonth] = useState('');

  // Filters for Statement
  const [searchStatement, setSearchStatement] = useState('');
  const [statementStart, setStatementStart] = useState('');
  const [statementEnd, setStatementEnd] = useState('');
  const [viewTxn, setViewTxn] = useState<Transaction | null>(null);

  // HQ Transfer State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferDesc, setTransferDesc] = useState('Transfer to HQ Bank Account');
  const [editingDeposit, setEditingDeposit] = useState<Transaction | null>(null);

  // General Expense State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseMethod, setExpenseMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [expenseProvider, setExpenseProvider] = useState('');

  // Provider Modal State for Expenses
  const [showProviderModal, setShowProviderModal] = useState(false);
  
  // Itemized Payment State
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [selectedOrderHistory, setSelectedOrderHistory] = useState<Transaction[]>([]);
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
    const [fetchedOrders, fetchedStats, fetchedTxns, fetchedProviders] = await Promise.all([
      getOrders(),
      getFinancialStats(),
      getTransactions(),
      getProviders()
    ]);
    setOrders(fetchedOrders);
    setStats(fetchedStats);
    setTransactions(fetchedTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setProviders(fetchedProviders);
    setLoading(false);
  };

  /* --- DATA PROCESSING --- */
  
  // Lookup map for fast Customer Name access by Order ID
  const orderLookup = useMemo(() => {
    const map: Record<string, string> = {};
    orders.forEach(o => { map[o.id] = o.customerName; });
    return map;
  }, [orders]);

  /* --- PAYMENT LOGIC --- */
  const openPaymentModal = (order: Order) => {
    setSelectedOrderForPayment(order);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    
    // Fetch History
    const history = transactions
      .filter(t => t.referenceId === order.id && t.type === TransactionType.PAYMENT_RECEIVED)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setSelectedOrderHistory(history);

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

  /* --- GENERAL EXPENSE LOGIC --- */
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if(isNaN(amount) || amount <= 0) {
       alert("Invalid amount.");
       return;
    }

    // If Cash, check funds
    if (expenseMethod === PaymentMethod.CASH && stats && amount > stats.repCashOnHand) {
      alert("Insufficient Cash on Hand for this expense.");
      return;
    }

    const provider = providers.find(p => p.id === expenseProvider);

    await addTransaction({
      id: `TXN-${Date.now()}`,
      type: TransactionType.EXPENSE,
      amount: amount,
      date: expenseDate,
      description: expenseDesc || 'General Expense',
      paymentMethod: expenseMethod,
      providerId: expenseProvider || undefined,
      providerName: provider?.name || undefined
    });

    setShowExpenseModal(false);
    setExpenseAmount('');
    setExpenseDesc('');
    setExpenseProvider('');
    await refreshData();
  };

  const handleSaveNewProvider = async (newProvider: Provider) => {
    await addProvider(newProvider);
    // Refresh providers list locally
    const updated = await getProviders();
    setProviders(updated);
    // Auto select
    setExpenseProvider(newProvider.id);
    setShowProviderModal(false);
  }

  /* --- DATA FILTERS & CALCULATIONS --- */
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
  
  // Statement Data Preparation
  const rawStatementTxns = transactions
    .filter(t => 
      t.type === TransactionType.PAYMENT_RECEIVED || 
      t.type === TransactionType.DEPOSIT_TO_HQ || 
      (t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CASH)
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ascending for balance calc

  // Filter by date range for Report
  let statementTxns = rawStatementTxns;
  let openingBalance = 0;

  if (statementStart) {
    const start = new Date(statementStart).getTime();
    const preTxns = rawStatementTxns.filter(t => new Date(t.date).getTime() < start);
    preTxns.forEach(t => {
      if (t.type === TransactionType.PAYMENT_RECEIVED) openingBalance += t.amount;
      else openingBalance -= t.amount;
    });

    statementTxns = rawStatementTxns.filter(t => {
       const d = new Date(t.date).getTime();
       let matchEnd = true;
       if (statementEnd) matchEnd = d <= new Date(statementEnd).getTime() + 86400000;
       return d >= start && matchEnd;
    });
  } else if (statementEnd) {
     statementTxns = rawStatementTxns.filter(t => new Date(t.date).getTime() <= new Date(statementEnd).getTime());
  }

  // Calculate Balance & Enrich Data
  let runningBalance = openingBalance;
  const enrichedStatementData = statementTxns.map(txn => {
    const isCredit = txn.type === TransactionType.PAYMENT_RECEIVED;
    const amount = txn.amount;
    
    if (isCredit) runningBalance += amount;
    else runningBalance -= amount;

    // Determine Display Name
    let mainLabel = '';
    if (txn.type === TransactionType.PAYMENT_RECEIVED) {
      mainLabel = txn.referenceId && orderLookup[txn.referenceId] ? orderLookup[txn.referenceId] : 'Customer Payment';
    } else if (txn.type === TransactionType.EXPENSE) {
      mainLabel = txn.providerName ? txn.providerName : 'Cash Expense';
    } else if (txn.type === TransactionType.DEPOSIT_TO_HQ) {
      mainLabel = 'Deposit to HQ';
    }

    return {
      ...txn,
      balanceSnapshot: runningBalance,
      mainLabel
    };
  });

  // Apply Filters
  const filteredStatementData = enrichedStatementData.filter(txn => {
    const search = searchStatement.toLowerCase();
    return (
      txn.mainLabel.toLowerCase().includes(search) ||
      txn.description.toLowerCase().includes(search) ||
      txn.amount.toString().includes(search) ||
      formatDate(txn.date).includes(search)
    );
  });

  // Calculate Monthly Report Stats
  const getMonthlyReport = () => {
     const monthFilter = historyMonth || new Date().toISOString().slice(0, 7); 
     
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
    <div className="p-4 md:p-8 pb-24">
      {/* Top Header & Report */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Collections & Deposits</h2>
          <p className="text-slate-500 text-sm md:text-base">Manage payments, history, and HQ transfers</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
           <button 
             onClick={() => setShowExpenseModal(true)}
             className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 flex items-center gap-2 text-sm md:text-base"
           >
              <Plus size={18}/> Add Expense
           </button>
           
           {/* Cash on Hand Card */}
           <div className="bg-amber-50 border border-amber-200 px-6 py-3 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="bg-amber-100 p-3 rounded-full text-amber-600"><Wallet size={24}/></div>
              <div>
                <p className="text-xs text-amber-800 font-bold uppercase tracking-wider">Cash on Hand</p>
                <p className="text-2xl font-bold text-amber-900">{formatCurrency(stats.repCashOnHand)}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Monthly Summary (Visible mostly when filters active or just generally) */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white shadow-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-6 print:hidden">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg"><FileText size={24} /></div>
            <div>
               <h3 className="font-bold text-lg">Monthly Report</h3>
               <p className="text-slate-300 text-sm">Summary for {report.month}</p>
            </div>
         </div>
         <div className="flex gap-8 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
               <p className="text-xs text-slate-400 uppercase font-bold">Total Collected</p>
               <p className="text-xl font-bold text-teal-400">{formatCurrency(report.collected)}</p>
            </div>
            <div className="text-right border-l border-white/10 pl-8">
               <p className="text-xs text-slate-400 uppercase font-bold">Deposited</p>
               <p className="text-xl font-bold text-blue-400">{formatCurrency(report.deposited)}</p>
            </div>
            <div className="text-right border-l border-white/10 pl-8">
               <p className="text-xs text-slate-400 uppercase font-bold">Net</p>
               <p className="text-xl font-bold text-white">{formatCurrency(report.collected - report.deposited)}</p>
            </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto print:hidden">
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
            <div className="overflow-x-auto">
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
             <div className="overflow-x-auto">
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
             <div className="overflow-x-auto">
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
        </div>
      )}

      {/* TAB CONTENT: STATEMENT */}
      {activeTab === 'statement' && (
         <div className="space-y-6">
            {/* Statement Header Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center print:hidden">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">Cash Statement Report</h3>
                  <div className="text-sm text-slate-500">Filtered Ledger for Rep Cash on Hand</div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                   <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span className="text-xs font-medium text-slate-500 ml-1">From:</span>
                      <input 
                        type="date" 
                        value={statementStart} 
                        onChange={(e) => setStatementStart(e.target.value)} 
                        className="text-sm bg-transparent outline-none w-32"
                      />
                   </div>
                   <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span className="text-xs font-medium text-slate-500 ml-1">To:</span>
                      <input 
                        type="date" 
                        value={statementEnd} 
                        onChange={(e) => setStatementEnd(e.target.value)} 
                        className="text-sm bg-transparent outline-none w-32"
                      />
                   </div>
                   <button 
                     onClick={() => window.print()} 
                     className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                     title="Print Report"
                   >
                     <Printer size={20}/>
                   </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block text-center border-b pb-4 mb-4">
               <h1 className="text-2xl font-bold">Cash Statement Report</h1>
               <p className="text-slate-600 mt-2">
                 Duration: <span className="font-bold">{statementStart ? formatDate(statementStart) : 'Start'}</span> to <span className="font-bold">{statementEnd ? formatDate(statementEnd) : 'Present'}</span>
               </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border">
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
                       <tr>
                          <th className="p-3 font-medium text-slate-600 w-28">Date</th>
                          <th className="p-3 font-medium text-slate-600">Description</th>
                          <th className="p-3 font-medium text-slate-600 text-center w-24">Type</th>
                          <th className="p-3 font-medium text-slate-600 text-right w-28">Debit (Out)</th>
                          <th className="p-3 font-medium text-slate-600 text-right w-28">Credit (In)</th>
                          <th className="p-3 font-medium text-slate-600 text-right w-28">Balance</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {/* Opening Balance Row if date filter active */}
                       {statementStart && (
                          <tr className="bg-yellow-50 font-medium">
                             <td className="p-3 text-slate-800">{formatDate(statementStart)}</td>
                             <td className="p-3 text-slate-800" colSpan={4}>Opening Balance</td>
                             <td className="p-3 text-right font-bold text-slate-800">{formatCurrency(openingBalance)}</td>
                          </tr>
                       )}
                       
                       {filteredStatementData.length === 0 ? (
                          <tr><td colSpan={6} className="p-8 text-center text-slate-400">No transactions found for this period.</td></tr>
                       ) : (
                          filteredStatementData.map(txn => {
                             const isCredit = txn.type === TransactionType.PAYMENT_RECEIVED;
                             return (
                                <tr key={txn.id} className="hover:bg-slate-50">
                                   <td className="p-3 text-slate-600 align-top pt-4">{formatDate(txn.date)}</td>
                                   <td className="p-3 align-top">
                                      <div className="flex flex-col">
                                         <span className="font-bold text-slate-800 text-sm">
                                            {txn.mainLabel}
                                         </span>
                                         <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                            {txn.description}
                                         </span>
                                      </div>
                                   </td>
                                   <td className="p-3 text-center align-top pt-4">
                                      {txn.type === TransactionType.PAYMENT_RECEIVED && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Coll.</span>}
                                      {txn.type === TransactionType.DEPOSIT_TO_HQ && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Dep.</span>}
                                      {txn.type === TransactionType.EXPENSE && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Exp.</span>}
                                   </td>
                                   <td className="p-3 text-right text-slate-500 align-top pt-4">
                                      {!isCredit ? formatCurrency(txn.amount) : '-'}
                                   </td>
                                   <td className="p-3 text-right text-slate-500 align-top pt-4">
                                      {isCredit ? formatCurrency(txn.amount) : '-'}
                                   </td>
                                   <td className="p-3 text-right font-bold text-slate-800 align-top pt-4">{formatCurrency(txn.balanceSnapshot)}</td>
                                </tr>
                             );
                          })
                       )}
                    </tbody>
                 </table>
               </div>
            </div>
         </div>
      )}

      {/* Transaction Details Modal */}
      {viewTxn && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6 relative">
               <button 
                 onClick={() => setViewTxn(null)} 
                 className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
               >
                  <X size={20}/>
               </button>
               
               <h3 className="text-xl font-bold text-slate-800 mb-1">Transaction Details</h3>
               <p className="text-sm text-slate-500 mb-6 font-mono">{viewTxn.id}</p>

               <div className="mt-6 text-right">
                  <button onClick={() => setViewTxn(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium">
                     Close
                  </button>
               </div>
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
              
              {/* Previous Payments Summary */}
              {selectedOrderHistory.length > 0 && (
                <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2">
                    <History size={16}/> Previous Payments
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {selectedOrderHistory.map(tx => (
                      <li key={tx.id} className="flex justify-between text-slate-600">
                        <span>{formatDate(tx.date)} - {tx.description}</span>
                        <span className="font-medium text-green-600">{formatCurrency(tx.amount)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1 mt-1">
                      <span>Total Paid</span>
                      <span>{formatCurrency(selectedOrderHistory.reduce((s,t) => s + t.amount, 0))}</span>
                    </li>
                  </ul>
                </div>
              )}

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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

      {/* General Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Add General Expense</h3>
            <p className="text-sm text-slate-500 mb-4">Record rent, bills, or other operational costs.</p>
            <form onSubmit={handleSaveExpense}>
              <div className="mb-4">
                 <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                 <input 
                   type="text"
                   required
                   value={expenseDesc}
                   onChange={(e) => setExpenseDesc(e.target.value)}
                   className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                   placeholder="e.g. Office Electricity"
                 />
              </div>

              {/* Provider Selection */}
              <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-slate-700">Provider (Optional)</label>
                    <button 
                      type="button" 
                      onClick={() => setShowProviderModal(true)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus size={12}/> New
                    </button>
                  </div>
                  <select 
                    value={expenseProvider} 
                    onChange={e => setExpenseProvider(e.target.value)} 
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white"
                  >
                    <option value="">None / General</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                   <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 text-xs">EGP</span>
                      <input 
                        type="number"
                        step="any"
                        required
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        className="w-full pl-10 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      />
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                   <input 
                     type="date"
                     required
                     value={expenseDate}
                     onChange={(e) => setExpenseDate(e.target.value)}
                     className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                   />
                </div>
              </div>

              <div className="mb-6">
                 <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                 <div className="flex gap-4 flex-col sm:flex-row">
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input 
                         type="radio" 
                         name="method"
                         checked={expenseMethod === PaymentMethod.CASH}
                         onChange={() => setExpenseMethod(PaymentMethod.CASH)}
                         className="text-primary focus:ring-primary"
                       />
                       <span className="text-sm text-slate-700">Cash from Rep</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input 
                         type="radio" 
                         name="method"
                         checked={expenseMethod === PaymentMethod.BANK_TRANSFER}
                         onChange={() => setExpenseMethod(PaymentMethod.BANK_TRANSFER)}
                         className="text-primary focus:ring-primary"
                       />
                       <span className="text-sm text-slate-700">HQ Bank Transfer</span>
                    </label>
                 </div>
                 {expenseMethod === PaymentMethod.CASH && stats && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                       <Wallet size={12}/> Balance: {formatCurrency(stats.repCashOnHand)}
                    </p>
                 )}
              </div>

              <div className="flex justify-end gap-3">
                 <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                 <button type="submit" className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-lg shadow-red-500/30">Record Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provider Modal for Expense Creation */}
      <ProviderModal 
        isOpen={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        onSave={handleSaveNewProvider}
      />
    </div>
  );
};

export default Collections;