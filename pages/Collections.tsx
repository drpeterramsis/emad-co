import React, { useState, useEffect, useMemo } from 'react';
import { getOrders, addTransaction, getFinancialStats, updateOrder, getTransactions, deleteTransaction, updateTransaction, getProviders, addProvider, updateOrderPaidStatus } from '../utils/storage';
import { Order, TransactionType, OrderStatus, DashboardStats, Transaction, PaymentMethod, Provider, OrderItem } from '../types';
import { ArrowRightLeft, DollarSign, Wallet, Loader2, Filter, Search, Calendar, CheckSquare, X, History, FileText, Trash2, Edit2, Edit, TrendingDown, TrendingUp, Eye, Plus, Printer, Building2, Landmark, ListFilter, Layers, AlertTriangle, Calculator } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/helpers';
import ProviderModal from '../components/ProviderModal';
import CalculatorModal from '../components/CalculatorModal';
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
  
  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false);
  
  // Itemized Payment State
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [selectedOrderHistory, setSelectedOrderHistory] = useState<Transaction[]>([]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentItems, setPaymentItems] = useState<{index: number, payQty: number, selected: boolean}[]>([]);
  const [actualCollectedAmount, setActualCollectedAmount] = useState<string>('');
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [isItemDataInconsistent, setIsItemDataInconsistent] = useState(false);
  
  // Edit Payment State
  const [editingPaymentTxnId, setEditingPaymentTxnId] = useState<string | null>(null);
  
  // Filters for Pending
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchMonth, setSearchMonth] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'customer' | 'month'>('none');

  // View Invoice State
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [viewOrderTxns, setViewOrderTxns] = useState<Transaction[]>([]);

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

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PAID: return 'bg-green-100 text-green-700 border-green-200';
      case OrderStatus.PARTIAL: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case OrderStatus.PENDING: return 'bg-red-100 text-red-700 border-red-200';
      case OrderStatus.RETURNED: return 'bg-violet-100 text-violet-700 border-violet-200';
      case OrderStatus.CANCELLED: return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  /* --- DATA PROCESSING --- */
  
  // Lookup map for fast Customer Name access by Order ID
  const orderLookup = useMemo(() => {
    const map: Record<string, string> = {};
    orders.forEach(o => { map[o.id] = o.customerName; });
    return map;
  }, [orders]);

  /* --- VIEW ORDER LOGIC --- */
  const handleViewOrder = (order: Order) => {
    // Fetch transactions for this order
    const related = transactions
        .filter(t => t.referenceId === order.id && t.type === TransactionType.PAYMENT_RECEIVED)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setViewOrderTxns(related);
    setViewOrder(order);
  };

  /* --- PAYMENT LOGIC --- */
  const openPaymentModal = (order: Order) => {
    setSelectedOrderForPayment(order);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPaymentSubmitting(false);
    setEditingPaymentTxnId(null); // Ensure we are in Create mode
    
    // Fetch History
    const history = transactions
      .filter(t => t.referenceId === order.id && t.type === TransactionType.PAYMENT_RECEIVED)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setSelectedOrderHistory(history);

    const initItems = order.items.map((item, idx) => ({
      index: idx,
      payQty: Math.max(0, item.quantity - (item.paidQuantity || 0)),
      selected: (item.quantity - (item.paidQuantity || 0)) > 0
    }));

    // Detect Inconsistency: If Balance exists, but items say fully paid.
    const remainingBalance = order.totalAmount - order.paidAmount;
    const totalItemRemainingValue = initItems.reduce((sum, state) => {
        const item = order.items[state.index];
        const price = item.quantity > 0 ? item.subtotal / item.quantity : 0;
        return sum + (state.payQty * price);
    }, 0);

    // Tolerance of 1 EGP
    const isInconsistent = remainingBalance > 1 && totalItemRemainingValue < 1;
    setIsItemDataInconsistent(isInconsistent);

    if (isInconsistent) {
       setPaymentItems([]);
       setActualCollectedAmount(remainingBalance.toFixed(2));
    } else {
       setPaymentItems(initItems);
       const suggested = calculateSuggestedAmount(order, initItems);
       setActualCollectedAmount(suggested.toFixed(2));
    }
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

  const distributeAmountToItems = (amount: number) => {
      if (!selectedOrderForPayment || isItemDataInconsistent) return;

      let remaining = amount;
      const newItems = paymentItems.map(state => {
          const item = selectedOrderForPayment.items[state.index];
          const itemPrice = item.quantity > 0 ? item.subtotal / item.quantity : 0;
          // When editing, available maxQty might be higher because we reversed the current txn
          const maxQty = Math.max(0, item.quantity - (item.paidQuantity || 0));
          
          if (remaining <= 0.01 || maxQty <= 0 || itemPrice <= 0) {
              return { ...state, payQty: 0, selected: false };
          }

          const costForMax = maxQty * itemPrice;

          if (remaining >= costForMax - 0.01) {
              remaining -= costForMax;
              return { ...state, payQty: maxQty, selected: true };
          } else {
              // Partial
              const affordableQty = Math.floor(remaining / itemPrice);
              // Ensure we pay at least 1 if affordable, or fraction if we support it. 
              // Assuming integer quantities for now.
              const actualPay = affordableQty;
              const cost = actualPay * itemPrice;
              remaining -= cost;
              return { ...state, payQty: actualPay, selected: actualPay > 0 };
          }
      });
      setPaymentItems(newItems);
  };

  const handleAmountChange = (val: string) => {
      setActualCollectedAmount(val);
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0 && !isItemDataInconsistent) {
          distributeAmountToItems(num);
      }
  };

  const handlePaymentItemChange = (index: number, field: 'selected' | 'payQty', value: any) => {
    const newItems = [...paymentItems];
    const itemState = newItems.find(i => i.index === index);
    if (!itemState) return;

    if (field === 'selected') {
      itemState.selected = value;
      // If selected and payQty is 0, default to max
      if (value && itemState.payQty === 0 && selectedOrderForPayment) {
          const item = selectedOrderForPayment.items[index];
          itemState.payQty = Math.max(0, item.quantity - (item.paidQuantity || 0));
      }
    } else if (field === 'payQty') {
      itemState.payQty = Number(value);
      itemState.selected = Number(value) > 0;
    }

    setPaymentItems(newItems);
    if (selectedOrderForPayment) {
      const suggested = calculateSuggestedAmount(selectedOrderForPayment, newItems);
      // Update amount without triggering distribution
      setActualCollectedAmount(suggested.toFixed(2));
    }
  };

  const handleSavePayment = async () => {
    if (!selectedOrderForPayment) return;
    if (isPaymentSubmitting) return;

    const amount = parseFloat(actualCollectedAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setIsPaymentSubmitting(true);

    try {
        const newPaidAmount = (selectedOrderForPayment.paidAmount || 0) + amount;
        
        let newStatus = selectedOrderForPayment.status;
        // Use tolerance for float comparison
        if (newPaidAmount >= selectedOrderForPayment.totalAmount - 0.5) {
            newStatus = OrderStatus.PAID;
        } else if (newPaidAmount > 0) {
            newStatus = OrderStatus.PARTIAL;
        }

        const updatedItems = [...selectedOrderForPayment.items];
        const paidItemsMetadata: { productId: string, quantity: number }[] = [];
        const paidDetails: string[] = [];

        // Only update items if data is consistent
        if (!isItemDataInconsistent) {
            paymentItems.forEach(state => {
                if (state.selected && state.payQty > 0) {
                    const item = updatedItems[state.index];
                    const newPaidQty = (item.paidQuantity || 0) + state.payQty;
                    updatedItems[state.index] = { ...item, paidQuantity: newPaidQty };
                    paidDetails.push(`${state.payQty}x ${item.productName}`);
                    paidItemsMetadata.push({ productId: item.productId, quantity: state.payQty });
                }
            });
        } else {
            paidDetails.push("Lump Sum (Balance Correction)");
        }

        // Apply Final State to Order
        await updateOrderPaidStatus({
            ...selectedOrderForPayment,
            paidAmount: newPaidAmount,
            status: newStatus,
            items: updatedItems
        });

        const description = paidDetails.length > 0 ? `Payment for: ${paidDetails.join(', ')}` : `Payment of ${formatCurrency(amount)}`;

        const txnData = {
          id: editingPaymentTxnId || `TXN-${Date.now()}`,
          type: TransactionType.PAYMENT_RECEIVED,
          amount: amount,
          date: paymentDate,
          referenceId: selectedOrderForPayment.id,
          description: description,
          metadata: { 
             paidItems: paidItemsMetadata,
             skipOrderUpdate: true // IMPORTANT: We handled order update manually above
          }
        };

        if (editingPaymentTxnId) {
            await updateTransaction(txnData);
        } else {
            await addTransaction(txnData);
        }

        setSelectedOrderForPayment(null);
        setEditingPaymentTxnId(null);
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
      
      if (transferSource === 'CASH') {
         let availableCash = stats.repCashOnHand;
         if (editingDeposit && (!editingDeposit.paymentMethod || editingDeposit.paymentMethod === PaymentMethod.CASH)) {
             availableCash += editingDeposit.amount;
         }
         
         if (amount > availableCash) {
            alert("Invalid transfer amount. Cannot exceed Cash on Hand.");
            return;
         }
      }

      const method = transferSource === 'CASH' ? PaymentMethod.CASH : PaymentMethod.BANK_TRANSFER;
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
  
  const handleEditHistoryPayment = (txn: Transaction) => {
    const order = orders.find(o => o.id === txn.referenceId);
    if (!order) {
      alert("Associated order not found.");
      return;
    }

    // Determine what was paid in this transaction to reverse it (in memory only)
    let paidItemsMap: Record<string, number> = {};
    
    if (txn.metadata?.paidItems) {
       (txn.metadata.paidItems as any[]).forEach((pi: any) => {
          paidItemsMap[pi.productId] = pi.quantity;
       });
    } else if (txn.description.startsWith('Payment for:')) {
       // Legacy parsing
       const details = txn.description.replace('Payment for: ', '');
       const parts = details.split(', ');
       parts.forEach(part => {
           const match = part.match(/^(\d+)x (.+)$/);
           if (match) {
               const qty = parseInt(match[1]);
               const name = match[2];
               const item = order.items.find(i => i.productName === name);
               if (item) paidItemsMap[item.productId] = qty;
           }
       });
    }

    // Create Pre-Transaction Order State (Revert effects of this payment)
    const reducedItems = order.items.map(item => {
        const paidInTxn = paidItemsMap[item.productId] || 0;
        return {
            ...item,
            paidQuantity: Math.max(0, (item.paidQuantity || 0) - paidInTxn)
        };
    });
    
    const preTxnPaidAmount = Math.max(0, order.paidAmount - txn.amount);
    
    const preTxnOrder = {
        ...order,
        paidAmount: preTxnPaidAmount,
        items: reducedItems,
        // Approximate status for the modal view
        status: preTxnPaidAmount > 0 ? OrderStatus.PARTIAL : OrderStatus.PENDING 
    };

    // Open Modal with Pre-State
    setSelectedOrderForPayment(preTxnOrder);
    setPaymentDate(new Date(txn.date).toISOString().split('T')[0]);
    setActualCollectedAmount(txn.amount.toString());
    setEditingPaymentTxnId(txn.id);
    setIsPaymentSubmitting(false);

    // Setup Items State for Modal
    const initItems = preTxnOrder.items.map((item, idx) => {
       const txQty = paidItemsMap[item.productId] || 0;
       return {
         index: idx,
         payQty: txQty, // Pre-fill with what was paid in this txn
         selected: txQty > 0
       };
    });
    setPaymentItems(initItems);

    // Check Consistency on Pre-State
    const remainingBalance = preTxnOrder.totalAmount - preTxnOrder.paidAmount;
    const totalItemRemainingValue = initItems.reduce((sum, state) => {
        const item = preTxnOrder.items[state.index];
        const remainingQty = item.quantity - (item.paidQuantity || 0); // "Available"
        const price = item.quantity > 0 ? item.subtotal / item.quantity : 0;
        return sum + (remainingQty * price);
    }, 0);
    
    const isInconsistent = remainingBalance > 1 && Math.abs(remainingBalance - totalItemRemainingValue) > 1;
    setIsItemDataInconsistent(isInconsistent);
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
    const updated = await getProviders();
    setProviders(updated);
    setExpenseProvider(newProvider.id);
    setShowProviderModal(false);
  }

  /* --- DATA FILTERS & CALCULATIONS --- */
  const unpaidOrders = orders
    .filter(o => !o.isDraft && o.status !== OrderStatus.DRAFT)
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
    return groups;
  }, [unpaidOrders, groupBy]);

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
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return b.id.localeCompare(a.id);
    });

  const depositHistory = transactions.filter(t => t.type === TransactionType.DEPOSIT_TO_HQ)
    .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return b.id.localeCompare(a.id);
    });
  
  const allTxnsForStatement = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let statementTxns = allTxnsForStatement;
  let openingBalance = 0;

  // Helper to normalize date boundaries
  const getStartOfDay = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  
  const getEndOfDay = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  };

  if (statementStart) {
    const start = getStartOfDay(statementStart);
    const preTxns = allTxnsForStatement.filter(t => new Date(t.date).getTime() < start);
    
    preTxns.forEach(t => {
      if (statementAccount === 'CASH' || statementAccount === 'ALL') {
          if (t.type === TransactionType.PAYMENT_RECEIVED) openingBalance += t.amount;
          if (t.type === TransactionType.DEPOSIT_TO_HQ && (!t.paymentMethod || t.paymentMethod === PaymentMethod.CASH)) openingBalance -= t.amount;
          if (t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CASH) openingBalance -= t.amount;
      } else if (statementAccount === 'HQ') {
          if (t.type === TransactionType.DEPOSIT_TO_HQ) openingBalance += t.amount;
          if (t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.BANK_TRANSFER) openingBalance -= t.amount;
      }
    });

    statementTxns = allTxnsForStatement.filter(t => {
       const d = new Date(t.date).getTime();
       let matchEnd = true;
       // Strict end of day comparison
       if (statementEnd) matchEnd = d <= getEndOfDay(statementEnd);
       return d >= start && matchEnd;
    });
  } else if (statementEnd) {
     statementTxns = allTxnsForStatement.filter(t => new Date(t.date).getTime() <= getEndOfDay(statementEnd));
  }

  let runningBalance = openingBalance;
  let summaryTotalCredit = 0;
  let summaryTotalDebit = 0;

  let filteredStatementData = statementTxns.filter(t => {
     if (statementAccount === 'CASH') {
        const isCollection = t.type === TransactionType.PAYMENT_RECEIVED;
        const isCashDeposit = t.type === TransactionType.DEPOSIT_TO_HQ && (!t.paymentMethod || t.paymentMethod === PaymentMethod.CASH);
        const isCashExpense = t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CASH;
        return isCollection || isCashDeposit || isCashExpense;
     } else if (statementAccount === 'HQ') {
        const isDeposit = t.type === TransactionType.DEPOSIT_TO_HQ;
        const isHQExpense = t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.BANK_TRANSFER;
        return isDeposit || isHQExpense;
     }
     return true;
  }).map(txn => {
    let amount = txn.amount;
    let isCredit = false;
    let isDebit = false;

    if (statementAccount === 'CASH') {
        if (txn.type === TransactionType.PAYMENT_RECEIVED) isCredit = true;
        else isDebit = true;
    } else if (statementAccount === 'HQ') {
        if (txn.type === TransactionType.DEPOSIT_TO_HQ) isCredit = true;
        else if (txn.type === TransactionType.EXPENSE) isDebit = true;
    } else {
        if (txn.type === TransactionType.PAYMENT_RECEIVED) isCredit = true;
        else isDebit = true;
    }
    
    if (isCredit) summaryTotalCredit += amount;
    else if (isDebit) summaryTotalDebit += amount;

    if (isCredit) runningBalance += amount;
    else if (isDebit) runningBalance -= amount;

    let mainLabel = '';
    let subLabel = txn.description;
    
    if (txn.type === TransactionType.PAYMENT_RECEIVED) {
      mainLabel = txn.referenceId && orderLookup[txn.referenceId] ? orderLookup[txn.referenceId] : 'Customer Payment';
      // Clean up description
      let details = txn.description.replace(/^Payment for:\s*/i, '').replace(/^Payment for\s*/i, '');
      // Format details with emojis
      if (details.includes(',')) {
          subLabel = details.split(',').map(s => `🔹 ${s.trim()}`).join('  ');
      } else {
          subLabel = `🔹 ${details}`;
      }
    } else if (txn.type === TransactionType.EXPENSE) {
      if (txn.metadata?.quantity && txn.metadata?.productId) {
         mainLabel = txn.providerName || 'Stock Purchase';
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
      if (statementFilterType === 'CREDIT' && !txn.isCredit) return false;
      if (statementFilterType === 'DEBIT' && !txn.isDebit) return false;
      
      const search = searchStatement.toLowerCase();
      return (
        txn.mainLabel.toLowerCase().includes(search) ||
        txn.description.toLowerCase().includes(search) ||
        txn.amount.toString().includes(search) ||
        formatDate(txn.date).includes(search)
      );
  });
  
  filteredStatementData = filteredStatementData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const closingBalance = openingBalance + summaryTotalCredit - summaryTotalDebit;

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
    <div className="p-4 md:p-6 pb-20 print:p-0 print:w-full">
      {/* Top Header & Report (Hidden on print for better layout) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">{t('collectionsTitle')}</h2>
          <p className="text-slate-500 text-xs md:text-sm">{t('collectionsSubtitle')}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
           <button 
             onClick={() => setShowCalculator(true)}
             className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs md:text-sm shadow-sm"
             title="Calculator"
           >
              <Calculator size={16}/>
           </button>
           <button 
             onClick={() => setShowExpenseModal(true)}
             className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 flex items-center gap-2 text-xs md:text-sm"
           >
              <Plus size={16}/> {t('addExpense')}
           </button>
           
           <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
              <div className="bg-amber-100 p-2 rounded-full text-amber-600"><Wallet size={18}/></div>
              <div>
                <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">{t('cashOnHand')}</p>
                <p className="text-lg font-bold text-amber-900">{formatCurrency(stats.repCashOnHand)}</p>
              </div>
           </div>

           <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Landmark size={18}/></div>
              <div>
                <p className="text-[10px] text-blue-800 font-bold uppercase tracking-wider">{t('hqBalance')}</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(stats.transferredToHQ)}</p>
              </div>
           </div>
        </div>
      </div>

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
                    <th className="p-3 font-medium text-slate-600">{t('status')}</th>
                    <th className="p-3 font-medium text-slate-600 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unpaidOrders.length === 0 ? (
                     <tr><td colSpan={9} className="p-6 text-center text-slate-400">All invoices paid or no matches!</td></tr>
                  ) : (
                    Object.entries(groupedUnpaidOrders).map(([groupKey, groupOrders]) => (
                      <React.Fragment key={groupKey}>
                        {groupBy !== 'none' && (
                          <tr className="bg-slate-100 border-b border-slate-200">
                            <td colSpan={9} className="p-3 font-bold text-slate-700 text-xs">
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
                              <td className="p-3 align-top">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${getStatusColor(order.status)}`}>
                                   {order.status}
                                </span>
                              </td>
                              <td className="p-3 text-right align-top">
                                <div className="flex justify-end gap-2 items-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleViewOrder(order); }}
                                        className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                        title={t('viewDetails')} // Note: Ensure key exists or fallback
                                    >
                                        <Eye size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/new-order?id=${order.id}`); }}
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title={t('edit')}
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button onClick={() => openPaymentModal(order)} className="text-[10px] bg-primary text-white px-2 py-1 rounded hover:bg-teal-800 shadow-sm">
                                      {t('pay')}
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

      {/* History, Deposits, Statement Tabs */}
      {activeTab === 'history' && (
         <div className="space-y-4">
           {/* ... search bars ... */}
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
                                     onClick={() => handleEditHistoryPayment(txn)}
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
           
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                   <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                         <th className="p-3 font-medium text-slate-600">{t('date')}</th>
                         <th className="p-3 font-medium text-slate-600">{t('description')}</th>
                         <th className="p-3 font-medium text-slate-600 text-center">{t('paymentMethod')}</th>
                         <th className="p-3 font-medium text-slate-600 text-right">{t('amount')}</th>
                         <th className="p-3 font-medium text-slate-600 text-right">{t('actions')}</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {depositHistory.length === 0 ? (
                         <tr><td colSpan={5} className="p-6 text-center text-slate-400">{t('noDepositsFound')}</td></tr>
                      ) : (
                         depositHistory.map(txn => (
                            <tr key={txn.id} className="hover:bg-slate-50">
                               <td className="p-3 text-slate-600">{formatDate(txn.date)}</td>
                               <td className="p-3 font-medium text-slate-800">{txn.description}</td>
                               <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded border text-[10px] ${txn.paymentMethod === PaymentMethod.CASH ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                     {txn.paymentMethod === PaymentMethod.CASH ? t('cashFromRep') : t('hqBankTransfer')}
                                  </span>
                               </td>
                               <td className="p-3 text-right font-bold text-blue-600">{formatCurrency(txn.amount)}</td>
                               <td className="p-3 text-right">
                                  <div className="flex justify-end gap-2">
                                     <button onClick={() => openDepositModal(txn)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14}/></button>
                                     <button onClick={() => handleDeleteDeposit(txn.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                                  </div>
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

      {activeTab === 'statement' && (
         <div className="space-y-4 print:space-y-0">
             <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 print:hidden">
                {/* Filters */}
                <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
                   <select 
                     value={statementAccount}
                     onChange={(e) => setStatementAccount(e.target.value as any)}
                     className="text-sm font-bold text-slate-700 outline-none bg-transparent"
                   >
                      <option value="CASH">Cash on Hand (Rep)</option>
                      <option value="HQ">HQ Balance</option>
                      <option value="ALL">All Accounts</option>
                   </select>
                </div>
                
                <div className="flex items-center gap-2">
                   <span className="text-xs text-slate-500">{t('from')}</span>
                   <input type="date" value={statementStart} onChange={e => setStatementStart(e.target.value)} className="border border-slate-300 rounded p-1 text-xs outline-none focus:border-primary"/>
                   <span className="text-xs text-slate-500">{t('to')}</span>
                   <input type="date" value={statementEnd} onChange={e => setStatementEnd(e.target.value)} className="border border-slate-300 rounded p-1 text-xs outline-none focus:border-primary"/>
                </div>

                <div className="flex-1 relative">
                   <Search className="absolute left-3 top-2 text-slate-400" size={14} />
                   <input type="text" value={searchStatement} onChange={e => setSearchStatement(e.target.value)} placeholder={t('search')} className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-primary" />
                </div>
                
                <button 
                  onClick={() => window.print()}
                  className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-200 flex items-center gap-2 text-xs"
                >
                  <Printer size={14}/> {t('print')}
                </button>
             </div>

             {/* Print Header - Visible only in print */}
             <div className="hidden print:block mb-6 text-center pt-4">
                <h1 className="text-2xl font-bold text-slate-900">EMAD CO. PHARMACEUTICAL</h1>
                <h2 className="text-lg text-slate-700 mt-1">{t('cashStatementReport')}</h2>
                <p className="text-sm text-slate-500 mt-1">
                   {statementAccount} Account • {statementStart || 'Start'} to {statementEnd || 'Present'}
                </p>
             </div>

             {/* Summary Box for Screen and Print */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 print:grid-cols-4 print:gap-2 print:mb-6">
                <div className="p-3 bg-slate-50 rounded border border-slate-200 print:border-slate-300 print:bg-white">
                   <p className="text-xs text-slate-500 uppercase font-bold">{t('openingBalance')}</p>
                   <p className="text-lg font-bold text-slate-700">{formatCurrency(openingBalance)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded border border-green-100 print:bg-white print:border-slate-300">
                   <p className="text-xs text-green-700 uppercase font-bold">{t('totalCredits')}</p>
                   <p className="text-lg font-bold text-green-700">{formatCurrency(summaryTotalCredit)}</p>
                </div>
                <div className="p-3 bg-red-50 rounded border border-red-100 print:bg-white print:border-slate-300">
                   <p className="text-xs text-red-700 uppercase font-bold">{t('totalDebits')}</p>
                   <p className="text-lg font-bold text-red-700">{formatCurrency(summaryTotalDebit)}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded border border-slate-200 print:bg-white print:border-black print:border-2">
                   <p className="text-xs text-slate-800 uppercase font-bold">{t('closingBalance')}</p>
                   <p className={`text-lg font-bold ${closingBalance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>{formatCurrency(closingBalance)}</p>
                </div>
             </div>

             {/* Statement Table */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none print:w-full">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center print:hidden">
                   <div>
                      <h3 className="font-bold text-lg text-slate-800">{t('cashStatementReport')}</h3>
                      <p className="text-xs text-slate-500">{statementAccount} Account • {statementStart || 'Start'} to {statementEnd || 'Present'}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase">{t('closingBalance')}</p>
                      <p className={`text-xl font-bold ${closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(closingBalance)}</p>
                   </div>
                </div>
                <div className="overflow-x-auto print:overflow-visible">
                   <table className="w-full text-left text-xs print:text-[10px] print:w-full">
                      <thead className="bg-slate-50 border-b border-slate-200 print:bg-white print:border-black print:border-b-2">
                         <tr>
                            <th className="p-3 font-medium text-slate-600">{t('date')}</th>
                            <th className="p-3 font-medium text-slate-600">{t('refId')}</th>
                            <th className="p-3 font-medium text-slate-600">{t('description')}</th>
                            <th className="p-3 font-medium text-slate-600 text-right text-green-700">{t('creditIn')}</th>
                            <th className="p-3 font-medium text-slate-600 text-right text-red-700">{t('debitOut')}</th>
                            <th className="p-3 font-medium text-slate-600 text-right">{t('balance')}</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                         {/* Opening Balance Row */}
                         <tr className="bg-slate-50/50 italic print:bg-transparent">
                            <td className="p-3 text-slate-500">{statementStart}</td>
                            <td className="p-3 text-slate-500">-</td>
                            <td className="p-3 text-slate-500">{t('openingBalance')}</td>
                            <td className="p-3 text-right text-slate-400">-</td>
                            <td className="p-3 text-right text-slate-400">-</td>
                            <td className="p-3 text-right font-bold text-slate-600">{formatCurrency(openingBalance)}</td>
                         </tr>
                         {filteredStatementData.length === 0 && (
                            <tr><td colSpan={6} className="p-6 text-center text-slate-400">{t('noTransactionsFound')}</td></tr>
                         )}
                         {filteredStatementData.map((txn, idx) => (
                            <tr key={txn.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                               <td className="p-3 text-slate-600 whitespace-nowrap">{formatDate(txn.date)}</td>
                               <td className="p-3 font-mono text-[10px] text-slate-500">{txn.referenceId || '-'}</td>
                               <td className="p-3">
                                  <div className="font-medium text-slate-800">{txn.mainLabel}</div>
                                  <div className="text-[10px] text-slate-500 print:text-slate-600">{txn.subLabel}</div>
                               </td>
                               <td className="p-3 text-right font-medium text-green-600">
                                  {txn.isCredit ? formatCurrency(txn.amount) : '-'}
                               </td>
                               <td className="p-3 text-right font-medium text-red-500">
                                  {txn.isDebit ? formatCurrency(txn.amount) : '-'}
                               </td>
                               <td className="p-3 text-right font-bold text-slate-700">
                                  {formatCurrency(txn.balanceSnapshot)}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
         </div>
      )}

      {/* MODALS */}
      
      {/* Transfer/Deposit Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl">
              <h3 className="text-lg font-bold mb-4">{editingDeposit ? t('editDeposit') : t('depositCashToHQ')}</h3>
              <form onSubmit={handleDepositToHQ} className="space-y-4">
                 <div>
                    <label className="block text-xs font-medium mb-1">{t('amountToTransfer')}</label>
                    <input type="number" required min="0" step="any" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                 </div>
                 <div>
                    <label className="block text-xs font-medium mb-1">{t('date')}</label>
                    <input type="date" required value={transferDate} onChange={e => setTransferDate(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                 </div>
                 <div>
                    <label className="block text-xs font-medium mb-1">{t('description')}</label>
                    <input type="text" value={transferDesc} onChange={e => setTransferDesc(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="Description" />
                 </div>
                 <div>
                    <label className="block text-xs font-medium mb-1">{t('type')}</label>
                    <div className="flex gap-2">
                       <button type="button" onClick={() => setTransferSource('CASH')} className={`flex-1 py-2 text-xs rounded-lg border ${transferSource === 'CASH' ? 'bg-amber-50 border-amber-500 text-amber-700 font-bold' : 'border-slate-200 text-slate-500'}`}>
                          {t('cashFromRep')}
                       </button>
                       <button type="button" onClick={() => setTransferSource('EXTERNAL')} className={`flex-1 py-2 text-xs rounded-lg border ${transferSource === 'EXTERNAL' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-slate-200 text-slate-500'}`}>
                          {t('hqBankTransfer')}
                       </button>
                    </div>
                    {transferSource === 'CASH' && stats && (
                       <p className="text-[10px] text-amber-600 mt-1">{t('available')}: {formatCurrency(stats.repCashOnHand)}</p>
                    )}
                 </div>
                 <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowTransferModal(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">{t('cancel')}</button>
                    <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-teal-800 text-sm">{t('confirmDeposit')}</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedOrderForPayment && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                  <div>
                     <h3 className="text-lg font-bold text-slate-800">{t('recordPayment')}</h3>
                     <p className="text-xs text-slate-500">Order #{selectedOrderForPayment.id} • {selectedOrderForPayment.customerName}</p>
                  </div>
                  <button onClick={() => setSelectedOrderForPayment(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
               </div>
               
               <div className="p-4 overflow-y-auto flex-1">
                  <div className="flex justify-between items-center mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                     <div className="text-center">
                        <p className="text-[10px] uppercase text-blue-500 font-bold">{t('total')}</p>
                        <p className="font-bold text-slate-800">{formatCurrency(selectedOrderForPayment.totalAmount)}</p>
                     </div>
                     <div className="text-center">
                        <p className="text-[10px] uppercase text-green-600 font-bold">{t('paid')}</p>
                        <p className="font-bold text-green-600">{formatCurrency(selectedOrderForPayment.paidAmount)}</p>
                     </div>
                     <div className="text-center">
                        <p className="text-[10px] uppercase text-red-500 font-bold">{t('remaining')}</p>
                        <p className="font-bold text-red-500">{formatCurrency(selectedOrderForPayment.totalAmount - selectedOrderForPayment.paidAmount)}</p>
                     </div>
                  </div>

                  {isItemDataInconsistent && (
                     <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
                        <div>
                           <p className="font-bold">Data Inconsistency Detected</p>
                           <p>The remaining cash balance does not match the sum of remaining items. This usually happens if a previous payment was made as a "Lump Sum" or data was corrupted.</p>
                           <p className="mt-1">You can only pay a <strong>Lump Sum</strong> for this order.</p>
                        </div>
                     </div>
                  )}

                  {!isItemDataInconsistent && (
                     <div className="mb-4">
                        <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase">{t('selectItemsPaid')}</h4>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                           <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                 <tr>
                                    <th className="p-2 w-8"></th>
                                    <th className="p-2">{t('product')}</th>
                                    <th className="p-2 text-center">{t('quantity')}</th>
                                    <th className="p-2 text-center">{t('price')}</th>
                                    <th className="p-2 text-right">{t('total')}</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                 {paymentItems.map(state => {
                                    const item = selectedOrderForPayment.items[state.index];
                                    const price = item.quantity > 0 ? item.subtotal / item.quantity : 0;
                                    const maxQty = Math.max(0, item.quantity - (item.paidQuantity || 0)); // Available to pay
                                    
                                    // If item is fully paid, skip rendering or show disabled
                                    if (maxQty === 0 && state.payQty === 0) return null;

                                    return (
                                       <tr key={state.index} className={state.selected ? 'bg-blue-50/50' : ''}>
                                          <td className="p-2 text-center">
                                             <input 
                                                type="checkbox" 
                                                checked={state.selected} 
                                                onChange={(e) => handlePaymentItemChange(state.index, 'selected', e.target.checked)}
                                                className="rounded border-slate-300 text-primary focus:ring-primary"
                                             />
                                          </td>
                                          <td className="p-2 font-medium text-slate-700">{item.productName}</td>
                                          <td className="p-2 text-center">
                                             <div className="flex items-center justify-center gap-1">
                                                <input 
                                                   type="number" 
                                                   min="0" 
                                                   max={maxQty} 
                                                   value={state.payQty}
                                                   onChange={(e) => handlePaymentItemChange(state.index, 'payQty', e.target.value)}
                                                   className="w-12 p-1 text-center border rounded border-slate-300 text-xs"
                                                   disabled={!state.selected}
                                                />
                                                <span className="text-slate-400">/ {maxQty}</span>
                                             </div>
                                          </td>
                                          <td className="p-2 text-center text-slate-500">{formatCurrency(price)}</td>
                                          <td className="p-2 text-right font-medium">
                                             {formatCurrency(price * state.payQty)}
                                          </td>
                                       </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  )}

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <label className="block text-xs font-bold text-slate-600 mb-1">{t('collectedAmount')}</label>
                     <div className="flex gap-2 items-center">
                        <input 
                           type="number" 
                           value={actualCollectedAmount} 
                           onChange={(e) => handleAmountChange(e.target.value)}
                           className="flex-1 p-2 text-lg font-bold text-green-700 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                           placeholder="0.00"
                           autoFocus
                        />
                        <input 
                           type="date"
                           value={paymentDate}
                           onChange={(e) => setPaymentDate(e.target.value)}
                           className="w-32 p-2 border border-slate-300 rounded-lg text-sm outline-none"
                        />
                     </div>
                  </div>
               </div>
               
               <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
                  <button onClick={() => setSelectedOrderForPayment(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium">{t('cancel')}</button>
                  <button 
                     onClick={handleSavePayment} 
                     disabled={isPaymentSubmitting}
                     className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                  >
                     {isPaymentSubmitting && <Loader2 className="animate-spin" size={16}/>}
                     {t('confirmPayment')}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl">
              <h3 className="text-lg font-bold mb-2">{t('addGeneralExpense')}</h3>
              <p className="text-xs text-slate-500 mb-4">{t('expenseSubtitle')}</p>
              
              <form onSubmit={handleSaveExpense} className="space-y-3">
                 <div>
                    <label className="block text-xs font-medium mb-1">{t('description')}</label>
                    <input type="text" required value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} placeholder="e.g. Electricity Bill" className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                 </div>
                 <div>
                    <label className="block text-xs font-medium mb-1">{t('amount')}</label>
                    <input type="number" required min="0" step="any" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium">{t('providerOptional')}</label>
                      <button type="button" onClick={() => setShowProviderModal(true)} className="text-[10px] text-primary hover:underline flex items-center gap-1"><Plus size={10}/> {t('new')}</button>
                    </div>
                    <select value={expenseProvider} onChange={e => setExpenseProvider(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white outline-none">
                       <option value="">{t('noneGeneral')}</option>
                       {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-medium mb-1">{t('paymentMethod')}</label>
                    <select value={expenseMethod} onChange={e => setExpenseMethod(e.target.value as PaymentMethod)} className="w-full p-2 border rounded-lg text-sm bg-white outline-none">
                       <option value={PaymentMethod.CASH}>{t('cashFromRep')}</option>
                       <option value={PaymentMethod.BANK_TRANSFER}>{t('hqBankTransfer')}</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-medium mb-1">{t('date')}</label>
                    <input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none" />
                 </div>
                 <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowExpenseModal(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">{t('cancel')}</button>
                    <button type="submit" className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">{t('recordExpense')}</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Provider Modal Reuse */}
      <ProviderModal 
        isOpen={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        onSave={handleSaveNewProvider}
      />
      
      {/* Calculator Modal */}
      <CalculatorModal 
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />

      {/* View Order Details Modal (Read Only) */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-2">
                 <div>
                    <h3 className="text-lg font-bold text-slate-800">Invoice #{viewOrder.id}</h3>
                    <p className="text-xs text-slate-500">{viewOrder.customerName} • {formatDate(viewOrder.date)}</p>
                 </div>
                 <button onClick={() => setViewOrder(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              
              <div className="space-y-4">
                 <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Items</h4>
                    <table className="w-full text-xs text-left">
                       <thead className="bg-slate-50">
                          <tr>
                             <th className="p-2">Product</th>
                             <th className="p-2 text-center">Qty</th>
                             <th className="p-2 text-right">Price</th>
                             <th className="p-2 text-right">Total</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {viewOrder.items.map((item, idx) => (
                             <tr key={idx}>
                                <td className="p-2">{item.productName}</td>
                                <td className="p-2 text-center">{item.quantity} {item.bonusQuantity > 0 && <span className="text-orange-600">+{item.bonusQuantity}</span>}</td>
                                <td className="p-2 text-right">{item.unitPrice}</td>
                                <td className="p-2 text-right font-bold">{item.subtotal.toFixed(2)}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                    <div className="text-right mt-2 font-bold text-sm">
                       Total: {formatCurrency(viewOrder.totalAmount)}
                    </div>
                 </div>

                 <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Payment History</h4>
                    {viewOrderTxns.length === 0 ? <p className="text-xs text-slate-400 italic">No payments recorded.</p> : (
                       <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50">
                             <tr>
                                <th className="p-2">Date</th>
                                <th className="p-2">Ref</th>
                                <th className="p-2 text-right">Amount</th>
                             </tr>
                          </thead>
                          <tbody>
                             {viewOrderTxns.map(t => (
                                <tr key={t.id}>
                                   <td className="p-2">{formatDate(t.date)}</td>
                                   <td className="p-2">{t.id}</td>
                                   <td className="p-2 text-right font-bold text-green-600">{formatCurrency(t.amount)}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    )}
                 </div>
                 
                 <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center text-sm font-bold">
                    <span>Balance Due:</span>
                    <span className={(viewOrder.totalAmount - viewOrder.paidAmount) > 0 ? "text-red-500" : "text-green-500"}>
                       {formatCurrency(viewOrder.totalAmount - viewOrder.paidAmount)}
                    </span>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Collections;