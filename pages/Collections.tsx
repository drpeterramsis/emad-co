import React, { useState, useEffect, useMemo } from 'react';
import { getOrders, addTransaction, getFinancialStats, updateOrder, getTransactions, deleteTransaction, updateTransaction, getProviders, addProvider, updateOrderPaidStatus } from '../utils/storage';
import { Order, TransactionType, OrderStatus, DashboardStats, Transaction, PaymentMethod, Provider, OrderItem } from '../types';
import { ArrowRightLeft, DollarSign, Wallet, Loader2, Filter, Search, Calendar, CheckSquare, X, History, FileText, Trash2, Edit2, Edit, TrendingDown, TrendingUp, Eye, Plus, Printer, Building2, Landmark, ListFilter, Layers } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/helpers';
import ProviderModal from '../components/ProviderModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const Collections = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
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
  const [statementAccount, setStatementAccount] = useState<'CASH' | 'HQ' | 'ALL'>('CASH');
  const [statementFilterType, setStatementFilterType] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
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
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false); // To prevent double click
  
  // Edit Payment State
  const [editPaymentTxn, setEditPaymentTxn] = useState<Transaction | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editPaymentDesc, setEditPaymentDesc] = useState('');
  
  // Filters for Pending
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchMonth, setSearchMonth] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'customer' | 'month'>('none');

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
    setIsPaymentSubmitting(false);
    
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
    if (isPaymentSubmitting) return; // Prevent double click

    const amount = parseFloat(actualCollectedAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setIsPaymentSubmitting(true);

    try {
        // Calculate new totals locally first
        const newPaidAmount = (selectedOrderForPayment.paidAmount || 0) + amount;
        
        let newStatus = selectedOrderForPayment.status;
        if (newPaidAmount >= selectedOrderForPayment.totalAmount) {
            newStatus = OrderStatus.PAID;
        } else if (newPaidAmount > 0) {
            newStatus = OrderStatus.PARTIAL;
        }

        // Apply updates to items (Paid Quantity)
        const updatedItems = [...selectedOrderForPayment.items];
        const paidItemsMetadata: { productId: string, quantity: number }[] = [];
        const paidDetails: string[] = [];

        paymentItems.forEach(state => {
            if (state.selected && state.payQty > 0) {
                const item = updatedItems[state.index];
                const newPaidQty = (item.paidQuantity || 0) + state.payQty;
                updatedItems[state.index] = { ...item, paidQuantity: newPaidQty };
                paidDetails.push(`${state.payQty}x ${item.productName}`);
                paidItemsMetadata.push({ productId: item.productId, quantity: state.payQty });
            }
        });

        // 1. Update Order in DB directly (Status, PaidAmount, Items)
        // Use updateOrderPaidStatus to avoid stock logic overhead, but pass ALL updated fields
        await updateOrderPaidStatus({
            ...selectedOrderForPayment,
            paidAmount: newPaidAmount,
            status: newStatus,
            items: updatedItems
        });

        const description = paidDetails.length > 0 ? `Payment for: ${paidDetails.join(', ')}` : `Lump sum payment`;

        // 2. Add Transaction (Skip Order Update since we handled it above to prevent race conditions)
        await addTransaction({
          id: `TXN-${Date.now()}`,
          type: TransactionType.PAYMENT_RECEIVED,
          amount: amount,
          date: paymentDate,
          referenceId: selectedOrderForPayment.id,
          description: description,
          metadata: { 
             paidItems: paidItemsMetadata,
             skipOrderUpdate: true // Prevent double update
          }
        });

        setSelectedOrderForPayment(null);
        await refreshData();
    } catch (error) {
        console.error(error);
        alert("Failed to record payment. Please check your connection.");
    } finally {
        setIsPaymentSubmitting(false);
    }
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

  /* --- EDIT PAYMENT LOGIC (HISTORY TAB) --- */
  const openEditPaymentModal = (txn: Transaction) => {
      setEditPaymentTxn(txn);
      setEditPaymentAmount(txn.amount.toString());
      setEditPaymentDate(new Date(txn.date).toISOString().split('T')[0]);
      setEditPaymentDesc(txn.description);
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editPaymentTxn) return;
      
      const newAmount = parseFloat(editPaymentAmount);
      if (isNaN(newAmount) || newAmount <= 0) {
          alert("Invalid Amount");
          return;
      }
      
      try {
          await updateTransaction({
              ...editPaymentTxn,
              amount: newAmount,
              date: editPaymentDate,
              description: editPaymentDesc
          });
          setEditPaymentTxn(null);
          await refreshData();
      } catch (err) {
          console.error(err);
          alert("Failed to update payment.");
      }
  };

  const handleDeletePayment = async (txnId: string) => {
      if (window.confirm("Are you sure you want to delete this payment record? This will adjust the order balance.")) {
          try {
              await deleteTransaction(txnId);
              await refreshData();
          } catch (err) {
              console.error(err);
              alert("Failed to delete payment.");
          }
      }
  };

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

  // Calculate Summary for Unpaid Orders
  const unpaidSummary = useMemo(() => {
    return unpaidOrders.reduce((acc, order) => {
      const balance = order.totalAmount - order.paidAmount;
      const units = order.items.reduce((sum, i) => sum + i.quantity + (i.bonusQuantity || 0), 0);
      return {
        total: acc.total + order.totalAmount,
        paid: acc.paid + order.paidAmount,
        balance: acc.balance + balance,
        units: acc.units + units
      };
    }, { total: 0, paid: 0, balance: 0, units: 0 });
  }, [unpaidOrders]);

  // Grouping Logic for Unpaid Orders
  const groupedUnpaidOrders = useMemo(() => {
    if (groupBy === 'none') return { 'All': unpaidOrders };
    
    const groups: Record<string, Order[]> = {};
    unpaidOrders.forEach(order => {
      let key = 'Other';
      if (groupBy === 'customer') key = order.customerName;
      else if (groupBy === 'month') key = order.date.substring(0, 7);
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    });
    
    // Optional: Sort keys
    return groups;
  }, [unpaidOrders, groupBy]);

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
    })
    .sort((a, b) => {
        // Sort Date Descending (Z-A)
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return b.id.localeCompare(a.id); // Tie-break with ID descending
    });

  // Deposits History
  const depositHistory = transactions.filter(t => t.type === TransactionType.DEPOSIT_TO_HQ)
    .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return b.id.localeCompare(a.id);
    });
  
  // Statement Data Preparation
  // Sort ALL transactions Ascending to calculate running balance correctly first
  const allTxnsForStatement = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter by date range first for opening balance calculation
  let statementTxns = allTxnsForStatement;
  let openingBalance = 0;

  if (statementStart) {
    const start = new Date(statementStart).getTime();
    const preTxns = allTxnsForStatement.filter(t => new Date(t.date).getTime() < start);
    
    preTxns.forEach(t => {
      if (statementAccount === 'CASH' || statementAccount === 'ALL') {
          // Cash Logic
          if (t.type === TransactionType.PAYMENT_RECEIVED) openingBalance += t.amount;
          if (t.type === TransactionType.DEPOSIT_TO_HQ && (!t.paymentMethod || t.paymentMethod === PaymentMethod.CASH)) openingBalance -= t.amount;
          if (t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CASH) openingBalance -= t.amount;
      } else if (statementAccount === 'HQ') {
          // HQ Logic: 
          // HQ Balance = (All Deposits) - (Expenses paid by Bank Transfer)
          // Note: Payment Received goes to Rep, not HQ directly unless deposited.
          if (t.type === TransactionType.DEPOSIT_TO_HQ) openingBalance += t.amount;
          if (t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.BANK_TRANSFER) openingBalance -= t.amount;
      }
    });

    statementTxns = allTxnsForStatement.filter(t => {
       const d = new Date(t.date).getTime();
       let matchEnd = true;
       if (statementEnd) matchEnd = d <= new Date(statementEnd).getTime() + 86400000;
       return d >= start && matchEnd;
    });
  } else if (statementEnd) {
     statementTxns = allTxnsForStatement.filter(t => new Date(t.date).getTime() <= new Date(statementEnd).getTime());
  }

  // Calculate Balance & Enrich Data
  let runningBalance = openingBalance;
  let summaryTotalCredit = 0;
  let summaryTotalDebit = 0;

  // Filter Transactions based on Account Selection
  let filteredStatementData = statementTxns.filter(t => {
     if (statementAccount === 'CASH') {
        // Show: Collections, Cash Expenses (including Purchases), Cash Deposits
        const isCollection = t.type === TransactionType.PAYMENT_RECEIVED;
        const isCashDeposit = t.type === TransactionType.DEPOSIT_TO_HQ && (!t.paymentMethod || t.paymentMethod === PaymentMethod.CASH);
        const isCashExpense = t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CASH;
        return isCollection || isCashDeposit || isCashExpense;
     } else if (statementAccount === 'HQ') {
        // Show: Deposits (All types), Expenses paid by HQ
        const isDeposit = t.type === TransactionType.DEPOSIT_TO_HQ;
        const isHQExpense = t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.BANK_TRANSFER;
        return isDeposit || isHQExpense;
     }
     return true; // Show ALL
  }).map(txn => {
    // Determine effect on Running Balance (Mainly relevant for Cash View)
    let amount = txn.amount;
    let isCredit = false; // Add to balance
    let isDebit = false;  // Subtract from balance

    if (statementAccount === 'CASH') {
        if (txn.type === TransactionType.PAYMENT_RECEIVED) isCredit = true;
        else isDebit = true; // Expenses and Deposits reduce cash
    } else if (statementAccount === 'HQ') {
        if (txn.type === TransactionType.DEPOSIT_TO_HQ) isCredit = true; // Money Entering HQ
        else if (txn.type === TransactionType.EXPENSE) isDebit = true; // Money Leaving HQ
    } else {
        // ALL VIEW: Just list them. Running balance is confusing here, maybe track Net Cash Flow?
        if (txn.type === TransactionType.PAYMENT_RECEIVED) isCredit = true;
        else isDebit = true;
    }
    
    // Accumulate summary totals before balance update
    if (isCredit) summaryTotalCredit += amount;
    else if (isDebit) summaryTotalDebit += amount;

    if (isCredit) runningBalance += amount;
    else if (isDebit) runningBalance -= amount;

    // Determine Display Name
    let mainLabel = '';
    let subLabel = txn.description;
    
    if (txn.type === TransactionType.PAYMENT_RECEIVED) {
      mainLabel = txn.referenceId && orderLookup[txn.referenceId] ? orderLookup[txn.referenceId] : 'Customer Payment';
    } else if (txn.type === TransactionType.EXPENSE) {
      // Enhanced item logic
      if (txn.metadata?.quantity && txn.metadata?.productId) {
         // It's a stock purchase with item details
         // Fetch item name from txn.description if available or just show "Stock Purchase"
         mainLabel = txn.providerName || 'Stock Purchase';
         // Ensure subLabel contains item info
         if (!subLabel.includes('Stock Purchase')) subLabel = `${txn.metadata.quantity}x items - ${txn.description}`;
      } else {
         mainLabel = txn.providerName ? txn.providerName : 'Expense';
      }
    } else if (txn.type === TransactionType.DEPOSIT_TO_HQ) {
      mainLabel = 'Deposit to HQ';
    }

    return {
      ...txn,
      balanceSnapshot: runningBalance,
      mainLabel,
      subLabel,
      isCredit,
      isDebit
    };
  }).filter(txn => {
      // Filter by Statement Type (ALL, CREDIT, DEBIT)
      if (statementFilterType === 'CREDIT' && !txn.isCredit) return false;
      if (statementFilterType === 'DEBIT' && !txn.isDebit) return false;
      
      // Search Text Filter
      const search = searchStatement.toLowerCase();
      return (
        txn.mainLabel.toLowerCase().includes(search) ||
        txn.description.toLowerCase().includes(search) ||
        txn.amount.toString().includes(search) ||
        formatDate(txn.date).includes(search)
      );
  });
  
  // Sort Statement Descending (Z-A) for Display
  filteredStatementData = filteredStatementData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const closingBalance = openingBalance + summaryTotalCredit - summaryTotalDebit;

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
              <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Landmark size={18}/></div>
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
          {t('cashStatement')}
        </button>
      </div>

      {/* TAB CONTENT: PENDING */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
           <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center">
              <div className="relative flex-1 min-w-[150px] w-full">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder={t('searchCustomerPlaceholder')} 
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-lg w-full outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="relative flex-1 min-w-[150px] w-full">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder={t('filterByProduct')}
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-lg w-full outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="relative w-full md:w-auto">
                 <input type="month" value={searchMonth} onChange={(e) => setSearchMonth(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="flex items-center gap-2 border-l pl-3 border-slate-200 w-full md:w-auto">
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{t('groupBy')}:</span>
                <select 
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as any)}
                    className="w-full md:w-auto text-sm border border-slate-300 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                    <option value="none">{t('none')}</option>
                    <option value="customer">{t('customer')}</option>
                    <option value="month">{t('month')}</option>
                </select>
             </div>
           </div>

           <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 font-medium bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
               <span>{t('totalRecords')}: {unpaidOrders.length}</span>
               <span className="w-px h-3 bg-slate-300 hidden sm:block"></span>
               <span>{t('total')}: <span className="text-slate-800 font-bold">{formatCurrency(unpaidSummary.total)}</span></span>
               <span className="w-px h-3 bg-slate-300 hidden sm:block"></span>
               <span>{t('paid')}: <span className="text-green-600 font-bold">{formatCurrency(unpaidSummary.paid)}</span></span>
               <span className="w-px h-3 bg-slate-300 hidden sm:block"></span>
               <span>{t('balance')}: <span className="text-red-600 font-bold">{formatCurrency(unpaidSummary.balance)}</span></span>
               <span className="w-px h-3 bg-slate-300 hidden sm:block"></span>
               <span>{t('quantity')}: <span className="text-slate-800 font-bold">{unpaidSummary.units}</span></span>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-medium text-slate-600">{t('invoiceId')}</th>
                    <th className="p-3 font-medium text-slate-600">{t('customer')}</th>
                    <th className="p-3 font-medium text-slate-600">{t('date')}</th>
                    <th className="p-3 font-medium text-slate-600">{t('summary')}</th>
                    <th className="p-3 font-medium text-slate-600">{t('total')}</th>
                    <th className="p-3 font-medium text-slate-600">{t('paid')}</th>
                    <th className="p-3 font-medium text-slate-600">{t('balance')}</th>
                    <th className="p-3 font-medium text-slate-600 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unpaidOrders.length === 0 ? (
                     <tr><td colSpan={8} className="p-6 text-center text-slate-400">All invoices paid or no matches!</td></tr>
                  ) : (
                    Object.entries(groupedUnpaidOrders).map(([groupKey, groupOrders]) => (
                      <React.Fragment key={groupKey}>
                        {groupBy !== 'none' && (
                          <tr className="bg-slate-100 border-b border-slate-200">
                            <td colSpan={8} className="p-3 font-bold text-slate-700 text-xs">
                              <div className="flex justify-between items-center">
                                <span>
                                  {groupBy === 'month' ? formatDate(groupKey + '-01').substring(3) : groupKey} 
                                  <span className="text-slate-500 font-normal ml-2">({(groupOrders as Order[]).length})</span>
                                </span>
                                <span className="text-red-600">
                                  {t('outstanding')}: {formatCurrency((groupOrders as Order[]).reduce((sum, o) => sum + (o.totalAmount - o.paidAmount), 0))}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                        {(groupOrders as Order[]).map(order => {
                          const balance = order.totalAmount - order.paidAmount;
                          const totalDiscount = order.items.reduce((s, i) => s + (i.discount || 0), 0);
                          const grossTotal = order.totalAmount + totalDiscount;
                          const effectiveDiscountPercent = grossTotal > 0 ? (totalDiscount / grossTotal) * 100 : 0;
                          
                          return (
                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-mono text-[10px] align-top">{order.id}</td>
                              <td className="p-3 font-medium text-slate-800 align-top">{order.customerName}</td>
                              <td className="p-3 text-slate-600 align-top">{formatDate(order.date)}</td>
                              <td className="p-3 align-top min-w-[200px]">
                                <div className="flex flex-col gap-1 text-[10px] md:text-xs max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                                   {(order.items).map((item, i) => (
                                     <div key={i} className="flex justify-between gap-2 border-b border-slate-100 last:border-0 pb-0.5 last:pb-0">
                                       <span className="font-medium text-slate-700 truncate max-w-[120px]" title={item.productName}>{item.productName}</span>
                                       <div className="flex gap-1 text-slate-500 whitespace-nowrap">
                                          <span>{item.quantity}u</span>
                                          {item.bonusQuantity > 0 && <span className="text-orange-600 font-bold">+{item.bonusQuantity}b</span>}
                                       </div>
                                     </div>
                                   ))}
                                   {totalDiscount > 0 && (
                                     <div className="mt-1 pt-0.5 border-t border-slate-200 text-blue-600 font-medium flex justify-between bg-blue-50 px-1.5 py-0.5 rounded">
                                        <span>Disc:</span>
                                        <span>{formatCurrency(totalDiscount)} ({effectiveDiscountPercent.toFixed(1)}%)</span>
                                     </div>
                                   )}
                                </div>
                              </td>
                              <td className="p-3 align-top">{formatCurrency(order.totalAmount)}</td>
                              <td className="p-3 text-green-600 font-medium align-top">{formatCurrency(order.paidAmount)}</td>
                              <td className="p-3 font-bold text-red-500 align-top">{formatCurrency(balance)}</td>
                              <td className="p-3 text-right align-top">
                                <div className="flex justify-end gap-2 items-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/new-order?id=${order.id}`); }}
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title={t('edit')}
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button onClick={() => openPaymentModal(order)} className="text-[10px] bg-primary text-white px-2 py-1 rounded hover:bg-teal-800 shadow-sm">
                                      {t('recordPayment')}
                                    </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
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
                     <th className="p-3 font-medium text-slate-600 text-right">{t('actions')}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {collectionHistory.length === 0 ? (
                      <tr><td colSpan={5} className="p-6 text-center text-slate-400">{t('noHistoryFound')}</td></tr>
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
                           <td className="p-3 text-right">
                               <div className="flex justify-end gap-2">
                                   <button 
                                     onClick={() => openEditPaymentModal(txn)}
                                     className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                     title={t('edit')}
                                   >
                                       <Edit2 size={14}/>
                                   </button>
                                   <button 
                                     onClick={() => handleDeletePayment(txn.id)}
                                     className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                     title={t('delete')}
                                   >
                                       <Trash2 size={14}/>
                                   </button>
                               </div>
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
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center print:hidden">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-sm">{t('cashStatementReport')}</h3>
                  <div className="text-xs text-slate-500">{t('statementSubtitle')}</div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                   
                   {/* Account Switcher */}
                   <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                      <button 
                        onClick={() => setStatementAccount('CASH')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statementAccount === 'CASH' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Cash (Rep)
                      </button>
                      <button 
                        onClick={() => setStatementAccount('HQ')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statementAccount === 'HQ' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        HQ (Bank)
                      </button>
                      <button 
                        onClick={() => setStatementAccount('ALL')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statementAccount === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        All (Log)
                      </button>
                   </div>
                   
                   <div className="w-px h-6 bg-slate-200 mx-1"></div>

                   {/* Transaction Type Filter */}
                   <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                       <span className="text-[10px] font-medium text-slate-500 ml-1"><ListFilter size={12}/></span>
                       <select 
                         value={statementFilterType}
                         onChange={(e) => setStatementFilterType(e.target.value as any)}
                         className="text-xs bg-transparent outline-none w-20 text-slate-700 font-medium"
                       >
                         <option value="ALL">All Types</option>
                         <option value="CREDIT">In (Credit)</option>
                         <option value="DEBIT">Out (Debit)</option>
                       </select>
                   </div>

                   <div className="w-px h-6 bg-slate-200 mx-1"></div>

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
               <h1 className="text-xl font-bold">{t('cashStatementReport')} - {statementAccount}</h1>
               <p className="text-slate-600 mt-2 text-sm">
                 {t('duration')}: <span className="font-bold">{statementStart ? formatDate(statementStart) : t('start')}</span> {t('to')} <span className="font-bold">{statementEnd ? formatDate(statementEnd) : t('present')}</span>
               </p>
            </div>
            
            {/* Statement Summary Cards */}
            {statementAccount !== 'ALL' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{t('openingBalance')}</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(openingBalance)}</p>
                 </div>
                 <div className="bg-white p-3 rounded-xl shadow-sm border border-green-200 bg-green-50/30">
                    <p className="text-[10px] text-green-600 font-bold uppercase">{t('totalCredits')}</p>
                    <p className="text-sm font-bold text-green-700">+{formatCurrency(summaryTotalCredit)}</p>
                 </div>
                 <div className="bg-white p-3 rounded-xl shadow-sm border border-red-200 bg-red-50/30">
                    <p className="text-[10px] text-red-600 font-bold uppercase">{t('totalDebits')}</p>
                    <p className="text-sm font-bold text-red-700">-{formatCurrency(summaryTotalDebit)}</p>
                 </div>
                 <div className="bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-700 text-white">
                    <p className="text-[10px] text-slate-300 font-bold uppercase">{t('closingBalance')}</p>
                    <p className="text-sm font-bold text-white">{formatCurrency(closingBalance)}</p>
                 </div>
              </div>
            )}

            <div className="text-xs text-slate-500 font-medium print:hidden flex justify-between items-center">
               <span>{t('totalRecords')}: {filteredStatementData.length}</span>
               <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">{statementAccount} VIEW</span>
            </div>
            
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
                       {/* Opening Balance Row if date filter active & viewing single account */}
                       {statementStart && statementAccount !== 'ALL' && (
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
                             return (
                                <tr key={txn.id} className="hover:bg-slate-50">
                                   <td className="p-2 text-slate-600 align-top pt-3">{formatDate(txn.date)}</td>
                                   <td className="p-2 align-top pt-2">
                                      <div className="flex flex-col">
                                         <span className="font-bold text-slate-800 text-xs">
                                            {txn.mainLabel}
                                         </span>
                                         <span className="text-slate-500 text-[10px] mt-0.5 whitespace-pre-wrap">
                                            {txn.subLabel}
                                         </span>
                                      </div>
                                   </td>
                                   <td className="p-2 text-center align-top pt-3">
                                      {txn.type === TransactionType.PAYMENT_RECEIVED && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Coll.</span>}
                                      {txn.type === TransactionType.DEPOSIT_TO_HQ && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Dep.</span>}
                                      {txn.type === TransactionType.EXPENSE && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Exp.</span>}
                                   </td>
                                   <td className="p-2 text-right text-slate-500 align-top pt-3 font-medium">
                                      {txn.isDebit ? formatCurrency(txn.amount) : '-'}
                                   </td>
                                   <td className="p-2 text-right text-slate-500 align-top pt-3 font-medium">
                                      {txn.isCredit ? formatCurrency(txn.amount) : '-'}
                                   </td>
                                   <td className="p-2 text-right font-bold text-slate-800 align-top pt-3">
                                      {statementAccount !== 'ALL' ? formatCurrency(txn.balanceSnapshot) : '-'}
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

      {/* Edit Payment Modal */}
      {editPaymentTxn && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl">
                 <h3 className="text-lg font-bold mb-4">{t('edit')} {t('recordPayment')}</h3>
                 <form onSubmit={handleUpdatePayment} className="space-y-4">
                     <div>
                         <label className="block text-xs font-medium mb-1">{t('date')}</label>
                         <input 
                           type="date" 
                           required 
                           value={editPaymentDate} 
                           onChange={(e) => setEditPaymentDate(e.target.value)} 
                           className="w-full p-2 border rounded-lg outline-none text-sm" 
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-medium mb-1">{t('description')}</label>
                         <input 
                           type="text" 
                           required 
                           value={editPaymentDesc} 
                           onChange={(e) => setEditPaymentDesc(e.target.value)} 
                           className="w-full p-2 border rounded-lg outline-none text-sm" 
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-medium mb-1">{t('amount')}</label>
                         <input 
                           type="number" 
                           step="any" 
                           required 
                           value={editPaymentAmount} 
                           onChange={(e) => setEditPaymentAmount(e.target.value)} 
                           className="w-full p-2 border rounded-lg outline-none text-sm font-bold text-slate-800" 
                         />
                         <p className="text-[10px] text-red-500 mt-1">Warning: Changing amount will affect invoice balance.</p>
                     </div>
                     <div className="flex justify-end gap-2 pt-2">
                         <button type="button" onClick={() => setEditPaymentTxn(null)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">{t('cancel')}</button>
                         <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm">{t('saveChanges')}</button>
                     </div>
                 </form>
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
               <button 
                  onClick={handleSavePayment} 
                  disabled={isPaymentSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-teal-800 font-medium shadow-lg shadow-teal-700/30 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isPaymentSubmitting ? <Loader2 className="animate-spin" size={16}/> : null}
                 {t('confirmPayment')}
               </button>
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
                       <Landmark size={10}/> {t('transferredToHQ')}: {formatCurrency(stats.transferredToHQ)}
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