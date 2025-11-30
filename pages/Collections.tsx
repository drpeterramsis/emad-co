
import React, { useState, useEffect, useMemo } from 'react';
import { getOrders, addTransaction, getFinancialStats, updateOrder, getTransactions, deleteTransaction, updateTransaction, getProviders, addProvider } from '../utils/storage';
import { Order, TransactionType, OrderStatus, DashboardStats, Transaction, PaymentMethod, Provider } from '../types';
import { ArrowRightLeft, DollarSign, Wallet, Loader2, Filter, Search, Calendar, CheckSquare, X, History, FileText, Trash2, Edit2, TrendingDown, TrendingUp, Eye, Plus, Printer, Building2 } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/helpers';
import ProviderModal from '../components/ProviderModal';
import { useLanguage } from '../contexts/LanguageContext';

const Collections = () => {
  const { t } = useLanguage();
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
  const [transferSource, setTransferSource] = useState<'CASH' | 'EXTERNAL'>('CASH');
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
      // Map paymentMethod to transferSource. If not BANK_TRANSFER, assume CASH.
      if (deposit.paymentMethod === PaymentMethod.BANK_TRANSFER) {
        setTransferSource('EXTERNAL');
      } else {
        setTransferSource('CASH');
      }
    } else {
      setEditingDeposit(null);
      setTransferAmount('');
      setTransferDate(new Date().toISOString().split('T')[0]);
      setTransferDesc('Transfer to HQ Bank Account');
      setTransferSource('CASH');
    }
    setShowTransferModal(true);
  };

  const handleDepositToHQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stats) return;

    try {
      const amount = parseFloat(transferAmount);
      if (isNaN(amount) || amount <= 0) {
        alert("Invalid amount.");
        return;
      }
      
      // Check constraints only if source is CASH
      if (transferSource === 'CASH') {
         let availableCash = stats.repCashOnHand;
         // If we are editing an existing CASH deposit, add that amount back to available for validation
         if (editingDeposit && (!editingDeposit.paymentMethod || editingDeposit.paymentMethod === PaymentMethod.CASH)) {
             availableCash += editingDeposit.amount;
         }
         
         if (amount > availableCash) {
            alert("Invalid transfer amount. Cannot exceed Cash on Hand.");
            return;
         }
      }

      const method = transferSource === 'CASH' ? PaymentMethod.CASH : PaymentMethod.BANK_TRANSFER;
      // Ensure description is not empty, which might be rejected by some DBs
      const finalDesc = transferDesc.trim() || (transferSource === 'CASH' ? 'Cash Deposit to HQ' : 'External Deposit to HQ');
      const txnDate = transferDate ? new Date(transferDate).toISOString() : new Date().toISOString();

      if (editingDeposit) {
         await updateTransaction({
           ...editingDeposit,
           amount,
           date: txnDate,
           description: finalDesc,
           paymentMethod: method
         });
      } else {
        await addTransaction({
          id: `TXN-${Date.now()}`,
          type: TransactionType.DEPOSIT_TO_HQ,
          amount: amount,
          date: txnDate,
          description: finalDesc,
          paymentMethod: method
        });
      }

      setTransferAmount('');
      setShowTransferModal(false);
      await refreshData();
    } catch (error: any) {
      console.error("Deposit error:", error);
      alert(`Failed to save deposit: ${error.message || "Please check your connection or input."}`);
    }
  };

  const handleDeleteDeposit = async (id: string) => {
    if(window.confirm("Are you sure you want to delete this deposit?")){
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
    .filter(o => !o.isDraft && o.status !== OrderStatus.DRAFT) // Exclude Drafts
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
      else if (t.type === TransactionType.DEPOSIT_TO_HQ) {
         if (!t.paymentMethod || t.paymentMethod === PaymentMethod.CASH) openingBalance -= t.amount;
         // External deposits don't affect balance
      }
      else if (t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CASH) openingBalance -= t.amount;
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
    const isDebit = (txn.type === TransactionType.DEPOSIT_TO_HQ && (!txn.paymentMethod || txn.paymentMethod === PaymentMethod.CASH)) || 
                    (txn.type === TransactionType.EXPENSE && txn.paymentMethod === PaymentMethod.CASH);
    
    // Only adjust balance if it affects cash on hand
    if (isCredit) runningBalance += txn.amount;
    else if (isDebit) runningBalance -= txn.amount;

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
      mainLabel,
      affectsCash: isCredit || isDebit
    };
  }).filter(t => t.affectsCash); // Only show cash-affecting transactions in Cash Statement

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
    <div className="p-4 md:p-6 pb-20">
      {/* Top Header & Report */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">{t('collectionsTitle')}</h2>
          <p className="text-slate-500 text-xs md:text-sm">{t('collectionsSubtitle')}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
           <button 
             onClick={() => setShowExpenseModal(true)}
             className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 flex items-center gap-2 text-xs md:text-sm"
           >
              <Plus size={16}/> {t('addExpense')}
           </button>
           
           {/* Cash on Hand Card */}
           <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
              <div className="bg-amber-100 p-2 rounded-full text-amber-600"><Wallet size={18}/></div>
              <div>
                <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">{t('cashOnHand')}</p>
                <p className="text-lg font-bold text-amber-900">{formatCurrency(stats.repCashOnHand)}</p>
              </div>
           </div>

           {/* HQ Balance Card */}
           <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Building2 size={18}/></div>
              <div>
                <p className="text-[10px] text-blue-800 font-bold uppercase tracking-wider">{t('hqBalance')}</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(stats.transferredToHQ)}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Monthly Summary (Visible mostly when filters active or just generally) */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 text-white shadow-lg mb-6 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg"><FileText size={20} /></div>
            <div>
               <h3 className="font-bold text-base">{t('monthlyReport')}</h3>
               <p className="text-slate-300 text-xs">{t('summaryFor')} {report.month}</p>
            </div>
         </div>
         <div className="flex gap-6 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
               <p className="text-[10px] text-slate-400 uppercase font-bold">{t('totalCollected')}</p>
               <p className="text-base font-bold text-teal-400">{formatCurrency(report.collected)}</p>
            </div>
            <div className="text-right border-l border-white/10 pl-6">
               <p className="text-[10px] text-slate-400 uppercase font-bold">{t('deposited')}</p>
               <p className="text-base font-bold text-blue-400">{formatCurrency(report.deposited)}</p>
            </div>
            <div className="text-right border-l border-white/10 pl-6">
               <p className="text-[10px] text-slate-400 uppercase font-bold">{t('net')}</p>
               <p className="text-base font-bold text-white">{formatCurrency(report.collected - report.deposited)}</p>
            </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto print:hidden">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium text-xs md:text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          {t('outstandingInvoices')} ({unpaidOrders.length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium text-xs md:text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          {t('collectionHistory')} ({collectionHistory.length})
        </button>
        <button 
          onClick={() => setActiveTab('deposits')}
          className={`px-4 py-2 font-medium text-xs md:text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'deposits' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          {t('hqDeposits')} ({depositHistory.length})
        </button>
        <button 
          onClick={() => setActiveTab('statement')}
          className={`px-4 py-2 font-medium text-xs md:text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'statement' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          {t('cashStatement')} ({filteredStatementData.length})
        </button>
      </div>

      {/* TAB CONTENT: PENDING */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
           <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder={t('searchCustomerPlaceholder')} 
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-lg w-full"
                />
              </div>
              <div className="relative">
                 <input type="month" value={searchMonth} onChange={(e) => setSearchMonth(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg" />
              </div>
           </div>

           <div className="text-xs text-slate-500 font-medium">{t('totalRecords')}: {unpaidOrders.length}</div>
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-medium text-slate-600">{t('invoiceId')}</th>
                    <th className="p-3 font-medium text-slate-600">{t('customer')}</th>
                    <th className="p-3 font-medium text-slate-600">{t('date')}</th>
                    <th className="p-3 font-medium text-slate-600">{t('total')}</th>
                    <th className="p-3 font-medium text-slate-600">{t('paid')}</th>
                    <th className="p-3 font-medium text-slate-600">{t('balance')}</th>
                    <th className="p-3 font-medium text-slate-600 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unpaidOrders.length === 0 ? (
                     <tr><td colSpan={7} className="p-6 text-center text-slate-400">All invoices paid or no matches!</td></tr>
                  ) : (
                    unpaidOrders.map(order => {
                      const balance = order.totalAmount - order.paidAmount;
                      return (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-[10px]">{order.id}</td>
                          <td className="p-3 font-medium text-slate-800">{order.customerName}</td>
                          <td className="p-3 text-slate-600">{formatDate(order.date)}</td>
                          <td className="p-3">{formatCurrency(order.totalAmount)}</td>
                          <td className="p-3 text-green-600 font-medium">{formatCurrency(order.paidAmount)}</td>
                          <td className="p-3 font-bold text-red-500">{formatCurrency(balance)}</td>
                          <td className="p-3 text-right">
                            <button onClick={() => openPaymentModal(order)} className="text-[10px] bg-primary text-white px-2 py-1 rounded hover:bg-teal-800 shadow-sm">
                              {t('recordPayment')}
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
        <div className="space-y-4">
           <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder={t('searchCustomerPlaceholder')}
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-lg w-full"
                />
              </div>
              <div className="relative">
                 <input type="month" value={historyMonth} onChange={(e) => setHistoryMonth(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg" />
              </div>
           </div>

           <div className="text-xs text-slate-500 font-medium">{t('totalRecords')}: {collectionHistory.length}</div>
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-xs md:text-sm">
                 <thead className="bg-slate-50 border-b border-slate-200">
                   <tr>
                     <th className="p-3 font-medium text-slate-600">{t('date')}</th>
                     <th className="p-3 font-medium text-slate-600">{t('refId')}</th>
                     <th className="p-3 font-medium text-slate-600">{t('description')}</th>
                     <th className="p-3 font-medium text-slate-600 text-right">{t('amount')}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {collectionHistory.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-slate-400">{t('noHistoryFound')}</td></tr>
                   ) : (
                     collectionHistory.map(txn => {
                       const order = orders.find(o => o.id === txn.referenceId);
                       return (
                         <tr key={txn.id} className="hover:bg-slate-50">
                           <td className="p-3 text-slate-600">{formatDate(txn.date)}</td>
                           <td className="p-3 font-mono text-[10px] text-slate-500">{txn.referenceId || '-'}</td>
                           <td className="p-3">
                              <p className="font-medium text-slate-800">{order?.customerName || 'Unknown'}</p>
                              <p className="text-[10px] text-slate-500">{txn.description}</p>
                           </td>
                           <td className="p-3 text-right font-bold text-teal-600">
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
        <div className="space-y-4">
           <div className="flex justify-end">
              <button 
                onClick={() => openDepositModal()}
                className="bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 flex items-center gap-2 shadow-lg shadow-slate-900/20 text-sm"
              >
                <ArrowRightLeft size={16} /> {t('newDeposit')}
              </button>
           </div>

           <div className="text-xs text-slate-500 font-medium">{t('totalRecords')}: {depositHistory.length}</div>
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-xs md:text-sm">
                 <thead className="bg-slate-50 border-b border-slate-200">
                   <tr>
                     <th className="p-3 font-medium text-slate-600">{t('depositDate')}</th>
                     <th className="p-3 font-medium text-slate-600">{t('description')}</th>
                     <th className="p-3 font-medium text-slate-600">{t('amount')}</th>
                     <th className="p-3 font-medium text-slate-600 text-right">{t('actions')}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {depositHistory.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-slate-400">{t('noDepositsFound')}</td></tr>
                   ) : (
                     depositHistory.map(txn => {
                       const isExternal = txn.paymentMethod === PaymentMethod.BANK_TRANSFER;
                       return (
                       <tr key={txn.id} className="hover:bg-slate-50">
                         <td className="p-3 text-slate-600">{formatDate(txn.date)}</td>
                         <td className="p-3 text-slate-800">
                            <div>{txn.description}</div>
                            <div className="mt-1">
                               {isExternal ? (
                                   <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">External Investment</span>
                               ) : (
                                   <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">From Collections</span>
                               )}
                            </div>
                         </td>
                         <td className="p-3 font-bold text-slate-800">{formatCurrency(txn.amount)}</td>
                         <td className="p-3 text-right flex justify-end gap-2">
                            <button 
                              onClick={() => openDepositModal(txn)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title={t('editDeposit')}
                            >
                               <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteDeposit(txn.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete Deposit"
                            >
                               <Trash2 size={14} />
                            </button>
                         </td>
                       </tr>
                     )})
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}

      {/* TAB CONTENT: STATEMENT */}
      {activeTab === 'statement' && (
         <div className="space-y-4">
            {/* Statement Header Controls */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center print:hidden">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-sm">{t('cashStatementReport')}</h3>
                  <div className="text-xs text-slate-500">{t('statementSubtitle')}</div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                   <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-medium text-slate-500 ml-1">{t('from')}:</span>
                      <input 
                        type="date" 
                        value={statementStart} 
                        onChange={(e) => setStatementStart(e.target.value)} 
                        className="text-xs bg-transparent outline-none w-28"
                      />
                   </div>
                   <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-medium text-slate-500 ml-1">{t('to')}:</span>
                      <input 
                        type="date" 
                        value={statementEnd} 
                        onChange={(e) => setStatementEnd(e.target.value)} 
                        className="text-xs bg-transparent outline-none w-28"
                      />
                   </div>
                   <button 
                     onClick={() => window.print()} 
                     className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                     title={t('printReport')}
                   >
                     <Printer size={18}/>
                   </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block text-center border-b pb-4 mb-4">
               <h1 className="text-xl font-bold">{t('cashStatementReport')}</h1>
               <p className="text-slate-600 mt-2 text-sm">
                 {t('duration')}: <span className="font-bold">{statementStart ? formatDate(statementStart) : t('start')}</span> {t('to')} <span className="font-bold">{statementEnd ? formatDate(statementEnd) : t('present')}</span>
               </p>
            </div>

            <div className="text-xs text-slate-500 font-medium print:hidden">{t('totalRecords')}: {filteredStatementData.length}</div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border">
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
                       <tr>
                          <th className="p-2 font-medium text-slate-600 w-24">{t('date')}</th>
                          <th className="p-2 font-medium text-slate-600">{t('description')}</th>
                          <th className="p-2 font-medium text-slate-600 text-center w-20">{t('type')}</th>
                          <th className="p-2 font-medium text-slate-600 text-right w-24">{t('debitOut')}</th>
                          <th className="p-2 font-medium text-slate-600 text-right w-24">{t('creditIn')}</th>
                          <th className="p-2 font-medium text-slate-600 text-right w-24">{t('balance')}</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {/* Opening Balance Row if date filter active */}
                       {statementStart && (
                          <tr className="bg-yellow-50 font-medium">
                             <td className="p-2 text-slate-800">{formatDate(statementStart)}</td>
                             <td className="p-2 text-slate-800" colSpan={4}>{t('openingBalance')}</td>
                             <td className="p-2 text-right font-bold text-slate-800">{formatCurrency(openingBalance)}</td>
                          </tr>
                       )}
                       
                       {filteredStatementData.length === 0 ? (
                          <tr><td colSpan={6} className="p-6 text-center text-slate-400">{t('noTransactionsFound')}</td></tr>
                       ) : (
                          filteredStatementData.map(txn => {
                             const isCredit = txn.type === TransactionType.PAYMENT_RECEIVED;
                             return (
                                <tr key={txn.id} className="hover:bg-slate-50">
                                   <td className="p-2 text-slate-600 align-top pt-3">{formatDate(txn.date)}</td>
                                   <td className="p-2 align-top pt-2">
                                      <div className="flex flex-col">
                                         <span className="font-bold text-slate-800 text-xs">
                                            {txn.mainLabel}
                                         </span>
                                         <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                            {txn.description}
                                         </span>
                                      </div>
                                   </td>
                                   <td className="p-2 text-center align-top pt-3">
                                      {txn.type === TransactionType.PAYMENT_RECEIVED && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Coll.</span>}
                                      {txn.type === TransactionType.DEPOSIT_TO_HQ && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Dep.</span>}
                                      {txn.type === TransactionType.EXPENSE && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Exp.</span>}
                                   </td>
                                   <td className="p-2 text-right text-slate-500 align-top pt-3">
                                      {!isCredit ? formatCurrency(txn.amount) : '-'}
                                   </td>
                                   <td className="p-2 text-right text-slate-500 align-top pt-3">
                                      {isCredit ? formatCurrency(txn.amount) : '-'}
                                   </td>
                                   <td className="p-2 text-right font-bold text-slate-800 align-top pt-3">{formatCurrency(txn.balanceSnapshot)}</td>
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
                  <X size={18}/>
               </button>
               
               <h3 className="text-lg font-bold text-slate-800 mb-1">{t('transactionDetails')}</h3>
               <p className="text-xs text-slate-500 mb-6 font-mono">{viewTxn.id}</p>

               <div className="mt-6 text-right">
                  <button onClick={() => setViewTxn(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm">
                     {t('close')}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Itemized Payment Modal */}
      {selectedOrderForPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{t('recordPayment')}</h3>
                <p className="text-slate-500 text-xs">
                  #{selectedOrderForPayment.id} - {selectedOrderForPayment.customerName}
                </p>
              </div>
              <button onClick={() => setSelectedOrderForPayment(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              
              {/* Previous Payments Summary */}
              {selectedOrderHistory.length > 0 && (
                <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-700 text-xs mb-2 flex items-center gap-2">
                    <History size={14}/> {t('previousPayments')}
                  </h4>
                  <ul className="space-y-1 text-xs">
                    {selectedOrderHistory.map(tx => (
                      <li key={tx.id} className="flex justify-between text-slate-600">
                        <span>{formatDate(tx.date)} - {tx.description}</span>
                        <span className="font-medium text-green-600">{formatCurrency(tx.amount)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1 mt-1">
                      <span>{t('totalPaid')}</span>
                      <span>{formatCurrency(selectedOrderHistory.reduce((s,t) => s + t.amount, 0))}</span>
                    </li>
                  </ul>
                </div>
              )}

              <div className="mb-4">
                 <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2 text-sm">
                   <CheckSquare size={16} className="text-primary"/> {t('selectItemsPaid')}
                 </h4>
                 <div className="border border-slate-200 rounded-lg overflow-hidden">
                   <table className="w-full text-left text-xs">
                     <thead className="bg-slate-50 border-b border-slate-200">
                       <tr>
                         <th className="p-2 w-8"></th>
                         <th className="p-2 text-slate-600">{t('product')}</th>
                         <th className="p-2 text-slate-600 text-right">{t('price')}</th>
                         <th className="p-2 text-slate-600 text-center">{t('remaining')}</th>
                         <th className="p-2 text-slate-600 text-center w-20">{t('payNow')}</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {selectedOrderForPayment.items.map((item, idx) => {
                         const state = paymentItems.find(i => i.index === idx);
                         if (!state) return null;
                         const remaining = item.quantity - (item.paidQuantity || 0);
                         
                         return (
                           <tr key={idx} className={state.selected ? 'bg-teal-50/30' : ''}>
                             <td className="p-2 text-center">
                               <input 
                                 type="checkbox" 
                                 checked={state.selected}
                                 onChange={(e) => handlePaymentItemChange(idx, 'selected', e.target.checked)}
                                 disabled={remaining <= 0}
                                 className="rounded border-slate-300 text-primary focus:ring-primary"
                               />
                             </td>
                             <td className="p-2 font-medium text-slate-800">{item.productName}</td>
                             <td className="p-2 text-right">{(item.subtotal / (item.quantity || 1)).toFixed(2)}</td>
                             <td className="p-2 text-center font-bold text-slate-700">{remaining}</td>
                             <td className="p-2">
                               <input 
                                 type="number" 
                                 min="0"
                                 max={remaining}
                                 value={state.payQty}
                                 onChange={(e) => handlePaymentItemChange(idx, 'payQty', e.target.value)}
                                 disabled={!state.selected || remaining <= 0}
                                 className="w-full p-1 text-center border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none text-xs"
                               />
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-2">
                       <Calendar size={14} /> {t('paymentDate')}
                    </label>
                    <input 
                      type="date" 
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-sm"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-2">
                       <DollarSign size={14} /> {t('collectedAmount')}
                    </label>
                    <div className="relative">
                       <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">EGP</span>
                       <input 
                         type="number"
                         step="any" 
                         value={actualCollectedAmount}
                         onChange={(e) => setActualCollectedAmount(e.target.value)}
                         className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none font-bold text-base bg-white text-primary"
                       />
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
               <button onClick={() => setSelectedOrderForPayment(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium text-sm">{t('cancel')}</button>
               <button onClick={handleSavePayment} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-teal-800 font-medium shadow-lg shadow-teal-700/30 text-sm">{t('confirmPayment')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-5 rounded-xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-3">{editingDeposit ? t('editDeposit') : t('depositCashToHQ')}</h3>
            <form onSubmit={handleDepositToHQ}>
              <div className="mb-3">
                 <label className="block text-xs font-medium text-slate-700 mb-1">Source of Funds</label>
                 <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="source" 
                        checked={transferSource === 'CASH'} 
                        onChange={() => setTransferSource('CASH')} 
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-sm">Collections (Cash)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="source" 
                        checked={transferSource === 'EXTERNAL'} 
                        onChange={() => setTransferSource('EXTERNAL')} 
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-sm">External / Personal</span>
                    </label>
                 </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">{t('date')}</label>
                <input 
                   type="date"
                   required
                   value={transferDate}
                   onChange={(e) => setTransferDate(e.target.value)}
                   className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">{t('description')}</label>
                <input 
                   type="text"
                   value={transferDesc}
                   onChange={(e) => setTransferDesc(e.target.value)}
                   className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">{t('amountToTransfer')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">EGP</span>
                  <input 
                    type="number" 
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                    placeholder="0.00"
                  />
                </div>
                {transferSource === 'CASH' && <p className="text-[10px] text-slate-500 mt-1">{t('available')}: {formatCurrency(stats.repCashOnHand)}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowTransferModal(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">{t('cancel')}</button>
                <button type="submit" className="px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm">{editingDeposit ? 'Update' : t('confirmDeposit')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* General Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-5 rounded-xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-2 text-slate-800">{t('addGeneralExpense')}</h3>
            <p className="text-xs text-slate-500 mb-4">{t('expenseSubtitle')}</p>
            <form onSubmit={handleSaveExpense}>
              <div className="mb-3">
                 <label className="block text-xs font-medium text-slate-700 mb-1">{t('description')}</label>
                 <input 
                   type="text"
                   required
                   value={expenseDesc}
                   onChange={(e) => setExpenseDesc(e.target.value)}
                   className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                   placeholder="e.g. Office Electricity"
                 />
              </div>

              {/* Provider Selection */}
              <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-slate-700">{t('providerOptional')}</label>
                    <button 
                      type="button" 
                      onClick={() => setShowProviderModal(true)}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus size={10}/> {t('new')}
                    </button>
                  </div>
                  <select 
                    value={expenseProvider} 
                    onChange={e => setExpenseProvider(e.target.value)} 
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
                  >
                    <option value="">{t('noneGeneral')}</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                   <label className="block text-xs font-medium text-slate-700 mb-1">{t('amount')}</label>
                   <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 text-xs">EGP</span>
                      <input 
                        type="number"
                        step="any"
                        required
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        className="w-full pl-10 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                      />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-medium text-slate-700 mb-1">{t('date')}</label>
                   <input 
                     type="date"
                     required
                     value={expenseDate}
                     onChange={(e) => setExpenseDate(e.target.value)}
                     className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                   />
                </div>
              </div>

              <div className="mb-4">
                 <label className="block text-xs font-medium text-slate-700 mb-1">{t('paymentMethod')}</label>
                 <div className="flex gap-3 flex-col sm:flex-row">
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input 
                         type="radio" 
                         name="method"
                         checked={expenseMethod === PaymentMethod.CASH}
                         onChange={() => setExpenseMethod(PaymentMethod.CASH)}
                         className="text-primary focus:ring-primary"
                       />
                       <span className="text-xs text-slate-700">{t('cashFromRep')}</span
                    ></label>
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input 
                         type="radio" 
                         name="method"
                         checked={expenseMethod === PaymentMethod.BANK_TRANSFER}
                         onChange={() => setExpenseMethod(PaymentMethod.BANK_TRANSFER)}
                         className="text-primary focus:ring-primary"
                       />
                       <span className="text-xs text-slate-700">{t('hqBankTransfer')}</span>
                    </label>
                 </div>
                 {expenseMethod === PaymentMethod.CASH && stats && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                       <Wallet size={10}/> {t('balance')}: {formatCurrency(stats.repCashOnHand)}
                    </p>
                 )}
                 {expenseMethod === PaymentMethod.BANK_TRANSFER && stats && (
                    <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                       <Building2 size={10}/> {t('transferredToHQ')}: {formatCurrency(stats.transferredToHQ)}
                    </p>
                 )}
              </div>

              <div className="flex justify-end gap-2">
                 <button type="button" onClick={() => setShowExpenseModal(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">{t('cancel')}</button>
                 <button type="submit" className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-lg shadow-red-500/30 text-sm">{t('recordExpense')}</button>
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
