
import React, { useEffect, useState, useMemo } from 'react';
import { getOrders, deleteOrder, updateOrder, getCustomers, getTransactions } from '../utils/storage';
import { Order, OrderStatus, CustomerType, Transaction, TransactionType, OrderItem } from '../types';
import { Search, Loader2, Edit, Trash2, Filter, Eye, X, Printer, Save, FileText, CheckCircle, AlertTriangle, ArrowUpDown, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatCurrency } from '../utils/helpers';
import { useLanguage } from '../contexts/LanguageContext';

const InvoiceList = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerTypes, setCustomerTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchMonth, setSearchMonth] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Grouping & Sorting
  const [groupBy, setGroupBy] = useState<'none' | 'customer' | 'month' | 'product'>('none');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal & Print State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderTxns, setSelectedOrderTxns] = useState<Transaction[]>([]);
  const [printCustomerName, setPrintCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Print Settings
  const [invoiceHeader, setInvoiceHeader] = useState(() => localStorage.getItem('invoice_header') || 'EMAD CO. PHARMACEUTICAL');
  const [invoiceSubheader, setInvoiceSubheader] = useState(() => localStorage.getItem('invoice_subheader') || 'Sales & Distribution');
  const [showPrintSettings, setShowPrintSettings] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const [ordersData, customersData] = await Promise.all([
      getOrders(),
      getCustomers()
    ]);
    
    // Filter OUT drafts
    const realOrders = ordersData.filter(o => !o.isDraft);
    
    setOrders(realOrders);

    // Create lookup map for customer types
    const map: Record<string, string> = {};
    customersData.forEach(c => map[c.id] = c.type);
    setCustomerTypes(map);

    setLoading(false);
  };

  const openModal = async (order: Order) => {
    setSelectedOrder(order);
    setPrintCustomerName(order.customerName);
    setOrderNotes(order.notes || '');
    
    // Fetch associated transactions
    const allTxns = await getTransactions();
    const related = allTxns
      .filter(t => t.referenceId === order.id && t.type === TransactionType.PAYMENT_RECEIVED)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setSelectedOrderTxns(related);
  }

  const saveNotes = async () => {
    if (!selectedOrder) return;
    try {
      const updated = { ...selectedOrder, notes: orderNotes };
      await updateOrder(updated);
      await fetchOrders(); // Refresh list
      setSelectedOrder(updated); // Update modal state
      alert(t('saveNote') + ' successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save notes.');
    }
  }

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!selectedOrder) return;
    if (newStatus === selectedOrder.status) return;

    if (window.confirm(`Are you sure you want to change the status to ${newStatus}?`)) {
      try {
        const updated = { ...selectedOrder, status: newStatus };
        await updateOrder(updated);
        await fetchOrders();
        setSelectedOrder(updated);
      } catch (e) {
        console.error("Failed to update status", e);
        alert("Failed to update status.");
      }
    }
  };

  const savePrintSettings = () => {
    localStorage.setItem('invoice_header', invoiceHeader);
    localStorage.setItem('invoice_subheader', invoiceSubheader);
    setShowPrintSettings(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PAID: return 'bg-green-100 text-green-700 border-green-200';
      case OrderStatus.PARTIAL: return 'bg-amber-100 text-amber-700 border-amber-200';
      case OrderStatus.PENDING: return 'bg-slate-100 text-slate-600 border-slate-200';
      case OrderStatus.RETURNED: return 'bg-rose-100 text-rose-700 border-rose-200';
      case OrderStatus.CANCELLED: return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getCustomerTypeColor = (typeString: string) => {
    // Note: This relies on string matching since we store type as string in map
    // Types: Pharmacy, Store, HCP, Direct Sale
    const type = typeString as CustomerType;
    if (typeString === CustomerType.PHARMACY) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (typeString === CustomerType.STORE) return 'bg-red-100 text-red-700 border-red-200';
    if (typeString === CustomerType.HCP) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (typeString === CustomerType.DIRECT) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  const handleDelete = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      if (window.confirm("WARNING: Deleting this invoice will also remove all associated payment records and RESTORE the items to inventory. This cannot be undone. Proceed?")) {
        setLoading(true);
        try {
          await deleteOrder(orderId);
          await fetchOrders();
        } catch (error) {
          console.error("Error deleting order:", error);
          alert("Failed to delete order.");
          setLoading(false);
        }
      }
    }
  };

  const handleEdit = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    navigate(`/new-order?id=${orderId}`);
  };

  // Filter Logic
  const filteredOrders = useMemo<Order[]>(() => orders.filter(o => {
    const matchesCustomer = o.customerName.toLowerCase().includes(searchCustomer.toLowerCase()) || 
                            o.id.toLowerCase().includes(searchCustomer.toLowerCase());
    
    // Check if ANY item in the order matches the product search
    const matchesProduct = searchProduct === '' || o.items.some(item => 
      item.productName.toLowerCase().includes(searchProduct.toLowerCase())
    );

    const matchesMonth = searchMonth === '' || o.date.startsWith(searchMonth);

    const type = customerTypes[o.customerId];
    const matchesType = filterType === 'All' || type === filterType;

    const matchesStatus = filterStatus === 'All' || o.status === filterStatus;

    return matchesCustomer && matchesProduct && matchesMonth && matchesType && matchesStatus;
  }), [orders, searchCustomer, searchProduct, searchMonth, filterType, filterStatus, customerTypes]);

  // Sort
  const sortedOrders = useMemo<Order[]>(() => {
    return [...filteredOrders].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredOrders, sortOrder]);

  // Group
  const groupedOrders = useMemo<Record<string, Order[]>>(() => {
    if (groupBy === 'none') return { 'All': sortedOrders };

    const groups: Record<string, Order[]> = {};

    if (groupBy === 'customer') {
      sortedOrders.forEach(order => {
        const key = order.customerName || 'Unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(order);
      });
    } else if (groupBy === 'month') {
      sortedOrders.forEach(order => {
        const key = order.date.substring(0, 7); // YYYY-MM
        if (!groups[key]) groups[key] = [];
        groups[key].push(order);
      });
    } else if (groupBy === 'product') {
       sortedOrders.forEach(order => {
          order.items.forEach(item => {
             // Basic product grouping - an order appears in multiple groups if it has multiple products
             const key = item.productName;
             if (!groups[key]) groups[key] = [];
             // Avoid adding same order multiple times to same product group (if data error)
             if (!groups[key].find(o => o.id === order.id)) {
               groups[key].push(order);
             }
          });
       });
    }

    return groups;
  }, [sortedOrders, groupBy]);

  if (loading) {
     return (
       <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col gap-4 mb-4 print:hidden shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">
            {t('invoices')} <span className="text-sm font-normal text-slate-500">({filteredOrders.length})</span>
          </h2>
          <p className="text-slate-500 text-xs md:text-sm">{t('invoiceHistory')}</p>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-3 sticky top-0 z-30">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            <div className="flex items-center gap-2 text-slate-500 mr-1">
              <Filter size={18} />
              <span className="font-medium text-xs hidden sm:inline">{t('filters')}:</span>
            </div>
            
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder={t('searchCustomerInvoice')}
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none w-full"
              />
            </div>

            <div className="relative flex-1 min-w-[120px]">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder={t('filterByProduct')}
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none w-full"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
               <select 
                 value={filterStatus}
                 onChange={(e) => setFilterStatus(e.target.value)}
                 className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-600 bg-white"
              >
                 <option value="All">{t('allStatus')}</option>
                 <option value={OrderStatus.PAID}>{t('paid')}</option>
                 <option value={OrderStatus.PARTIAL}>Partial</option>
                 <option value={OrderStatus.PENDING}>Pending</option>
                 <option value={OrderStatus.RETURNED}>Returned</option>
                 <option value={OrderStatus.CANCELLED}>Cancelled</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="relative">
               <select 
                 value={filterType}
                 onChange={(e) => setFilterType(e.target.value)}
                 className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-600 bg-white"
              >
                 <option value="All">{t('allTypes')}</option>
                 {Object.values(CustomerType).map(t => (
                    <option key={t} value={t}>{t}</option>
                 ))}
              </select>
            </div>

            <div className="relative">
               <input 
                type="month"
                value={searchMonth}
                onChange={(e) => setSearchMonth(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-600"
              />
            </div>
          </div>
          
          <div className="h-px xl:h-auto xl:w-px bg-slate-200"></div>

          {/* View Options */}
          <div className="flex gap-3 items-center">
             <div className="flex items-center gap-2">
                <Layers size={16} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-600">{t('groupBy')}:</span>
                <select 
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as any)}
                  className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
                >
                  <option value="none">{t('none')}</option>
                  <option value="customer">{t('customer')}</option>
                  <option value="month">{t('month')}</option>
                  <option value="product">{t('product')}</option>
                </select>
             </div>
             
             <button 
               onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
               className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-sm font-medium"
               title={t('sort')}
             >
                <ArrowUpDown size={14} className="text-slate-500" />
                <span>{sortOrder === 'desc' ? t('newestFirst') : t('oldestFirst')}</span>
             </button>

             <button 
               onClick={() => { 
                 setSearchCustomer(''); setSearchProduct(''); setSearchMonth(''); setFilterType('All'); setFilterStatus('All'); 
                 setGroupBy('none'); setSortOrder('desc');
               }}
               className="text-xs text-slate-500 hover:text-red-500 underline whitespace-nowrap"
             >
               {t('clear')}
             </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0 flex-1 print:hidden">
        <div className="overflow-auto flex-1 rounded-xl">
          <table className="w-full text-left text-xs md:text-sm relative">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="p-3 font-medium text-slate-600 bg-slate-50">{t('date')}</th>
                <th className="p-3 font-medium text-slate-600 bg-slate-50">{t('invoiceId')}</th>
                <th className="p-3 font-medium text-slate-600 bg-slate-50">{t('customer')}</th>
                <th className="p-3 font-medium text-slate-600 text-center w-1/3 min-w-[200px] bg-slate-50">{t('summary')}</th>
                <th className="p-3 font-medium text-slate-600 bg-slate-50">{t('total')}</th>
                <th className="p-3 font-medium text-slate-600 bg-slate-50">{t('paid')}</th>
                <th className="p-3 font-medium text-slate-600 bg-slate-50">{t('status')}</th>
                <th className="p-3 font-medium text-slate-600 text-right bg-slate-50">{t('actions')}</th>
              </tr>
            </thead>
            {filteredOrders.length === 0 ? (
               <tbody><tr><td colSpan={8} className="p-6 text-center text-slate-400">{t('noInvoicesFound')}</td></tr></tbody>
            ) : (
              Object.entries(groupedOrders).map(([groupName, groupOrders]) => {
                const orders = groupOrders as Order[];
                return (
                <React.Fragment key={groupName}>
                  {groupBy !== 'none' && (
                    <tbody>
                       <tr className="bg-yellow-100 border-b border-yellow-200 sticky top-10 z-10">
                         <td colSpan={8} className="p-3 font-bold text-amber-900 bg-yellow-100">
                           {groupBy === 'month' ? formatDate(groupName + '-01').substring(3) : groupName} 
                           <span className="text-amber-700 font-normal text-xs ml-2">({orders.length})</span>
                         </td>
                       </tr>
                    </tbody>
                  )}
                  <tbody className="divide-y divide-slate-100">
                    {orders.map(order => {
                      const totalDiscount = order.items.reduce((s, i) => s + (i.discount || 0), 0);
                      const grossTotal = order.totalAmount + totalDiscount;
                      const effectiveDiscountPercent = grossTotal > 0 ? (totalDiscount / grossTotal) * 100 : 0;
                      const custType = customerTypes[order.customerId];
                      
                      return (
                        <tr 
                          key={`${order.id}-${groupName}`} // Ensure unique key when grouping by product (duplicates allowed)
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          onClick={() => openModal(order)}
                        >
                          <td className="p-3 text-slate-600 font-medium align-top whitespace-nowrap">{formatDate(order.date)}</td>
                          <td className="p-3 font-mono text-[10px] align-top whitespace-nowrap">{order.id}</td>
                          <td className="p-3 font-medium text-slate-800 align-top min-w-[150px]">
                            <div>{order.customerName}</div>
                            {custType && (
                              <div className="inline-block mt-0.5">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getCustomerTypeColor(custType)}`}>
                                  {custType}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 align-top">
                            <div className="flex flex-col gap-1 text-[10px] md:text-xs max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                               {(order.items as OrderItem[]).map((item, i) => (
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
                          <td className="p-3 font-bold text-slate-800 align-top whitespace-nowrap">{formatCurrency(order.totalAmount)}</td>
                          <td className="p-3 text-slate-600 align-top whitespace-nowrap">{formatCurrency(order.paidAmount)}</td>
                          <td className="p-3 align-top">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="p-3 text-right align-top">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                 onClick={(e) => { e.stopPropagation(); openModal(order); }}
                                 className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                 title="View Details"
                               >
                                 <Eye size={14} />
                               </button>
                               <button 
                                 onClick={(e) => handleEdit(e, order.id)}
                                 className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                 title="Edit Invoice"
                               >
                                 <Edit size={14} />
                               </button>
                               <button 
                                 onClick={(e) => handleDelete(e, order.id)}
                                 className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                 title="Delete Invoice"
                               >
                                 <Trash2 size={14} />
                               </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </React.Fragment>
              );})
            )}
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:absolute print:inset-0">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none print:h-auto print:max-h-none print:rounded-none">
            
            {/* Modal Actions (Hidden on Print) */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-start print:hidden">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{t('invoiceDetails')}</h3>
                <p className="text-slate-500 text-xs">#{selectedOrder.id}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowPrintSettings(!showPrintSettings)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                  title={t('printSettings')}
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={handlePrint}
                  className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-2 text-sm"
                >
                  <Printer size={18} /> {t('print')}
                </button>
                <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Print Settings (Visible when toggled, Hidden on Print) */}
            {showPrintSettings && (
              <div className="p-4 bg-slate-50 border-b border-slate-200 print:hidden">
                <h4 className="font-bold text-xs text-slate-700 mb-2">{t('printSettings')}</h4>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <input 
                    type="text" 
                    value={invoiceHeader}
                    onChange={(e) => setInvoiceHeader(e.target.value)}
                    placeholder={t('invoiceHeading')}
                    className="p-2 border border-slate-300 rounded text-xs"
                  />
                  <input 
                    type="text" 
                    value={invoiceSubheader}
                    onChange={(e) => setInvoiceSubheader(e.target.value)}
                    placeholder={t('invoiceSubheading')}
                    className="p-2 border border-slate-300 rounded text-xs"
                  />
                </div>
                <button 
                  onClick={savePrintSettings} 
                  className="text-xs bg-slate-800 text-white px-3 py-1 rounded flex items-center gap-1"
                >
                  <Save size={12} /> {t('saveSettings')}
                </button>
              </div>
            )}
            
            {/* Invoice Content */}
            <div className="p-6 space-y-4 print:p-6">
              
              {/* Print Header (Only visible heavily on print/preview) */}
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                 <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">{invoiceHeader}</h1>
                 <p className="text-slate-500 font-medium text-sm">{invoiceSubheader}</p>
              </div>

              <div className="flex justify-between items-start">
                <div>
                   <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">{t('billTo')}:</p>
                   {/* Editable "Bill To" for Printing */}
                   <input 
                     type="text" 
                     value={printCustomerName}
                     onChange={(e) => setPrintCustomerName(e.target.value)}
                     className="font-bold text-lg text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-primary outline-none bg-transparent w-full print:border-none p-0"
                   />
                   <div className="flex gap-2 items-center">
                    <p className="text-xs text-slate-600">ID: {selectedOrder.customerId}</p>
                    {customerTypes[selectedOrder.customerId] && (
                        <span className={`text-[10px] px-1.5 py-0 rounded border font-medium ${getCustomerTypeColor(customerTypes[selectedOrder.customerId])}`}>
                          {customerTypes[selectedOrder.customerId]}
                        </span>
                    )}
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] text-slate-500 uppercase font-bold">{t('invoiceId')}</p>
                   <p className="font-mono text-base text-slate-800">{selectedOrder.id}</p>
                   <p className="text-xs text-slate-600 mt-0.5">{t('date')}: {formatDate(selectedOrder.date)}</p>
                </div>
              </div>

              <div>
                <table className="w-full text-left text-xs mt-4">
                  <thead className="bg-slate-100 border-b-2 border-slate-300 print:bg-slate-50">
                    <tr>
                      <th className="p-2 text-slate-800 font-bold">{t('product')}</th>
                      <th className="p-2 text-slate-800 font-bold text-right">{t('price')}</th>
                      <th className="p-2 text-slate-800 font-bold text-center">{t('quantity')}</th>
                      <th className="p-2 text-slate-800 font-bold text-center">{t('bonus')}</th>
                      <th className="p-2 text-slate-800 font-bold text-center">{t('discountPercent')}</th>
                      <th className="p-2 text-slate-800 font-bold text-center">{t('discountAmt')}</th>
                      <th className="p-2 text-slate-800 font-bold text-right">{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(selectedOrder.items as OrderItem[]).map((item, idx) => {
                      const gross = item.unitPrice * item.quantity;
                      const percent = item.discountPercent || (gross > 0 ? (item.discount / gross) * 100 : 0);
                      
                      return (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-slate-800">{item.productName}</td>
                        <td className="p-2 text-right">{item.unitPrice}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-center">{item.bonusQuantity > 0 ? item.bonusQuantity : '-'}</td>
                        <td className="p-2 text-center text-slate-600">
                          {percent > 0.01 ? percent.toFixed(2) + '%' : '-'}
                        </td>
                        <td className="p-2 text-center">
                          {item.discount > 0 ? item.discount.toFixed(2) : '-'}
                        </td>
                        <td className="p-2 text-right font-bold">{item.subtotal.toFixed(2)}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col items-end pt-4 border-t border-slate-300 gap-1">
                {(() => {
                   const subTotal = (selectedOrder.items as OrderItem[]).reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
                   const totalDiscount = (selectedOrder.items as OrderItem[]).reduce((s, i) => s + (i.discount || 0), 0);
                   const totalPercent = subTotal > 0 ? (totalDiscount / subTotal) * 100 : 0;
                   
                   return (
                   <>
                     <div className="w-64 flex justify-between text-xs">
                       <span className="text-slate-600">{t('subtotal')}:</span>
                       <span className="font-medium">
                         {formatCurrency(subTotal)}
                       </span>
                     </div>
                     <div className="w-64 flex justify-between text-xs">
                       <span className="text-slate-600">{t('discount')}:</span>
                       <span className="text-red-500 font-medium flex items-center gap-2">
                         {totalDiscount > 0 && <span className="text-[10px] text-slate-500">({totalPercent.toFixed(2)}%)</span>}
                         <span>- {formatCurrency(totalDiscount)}</span>
                       </span>
                     </div>
                     <div className="w-64 flex justify-between text-base font-bold border-t border-slate-300 pt-2 mt-2">
                       <span>{t('total')}:</span>
                       <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                     </div>
                     <div className="w-64 flex justify-between text-xs pt-1">
                       <span className="text-slate-500">{t('paid')}:</span>
                       <span className="text-green-600 font-medium">{formatCurrency(selectedOrder.paidAmount)}</span>
                     </div>
                     <div className="w-64 flex justify-between text-xs pt-1">
                       <span className="text-slate-500">{t('balance')}:</span>
                       <span className="text-red-600 font-bold">{formatCurrency(selectedOrder.totalAmount - selectedOrder.paidAmount)}</span>
                     </div>
                   </>
                   );
                })()}
              </div>

              {/* Payment History Section */}
              {selectedOrderTxns.length > 0 && (
                <div className="mt-6 pt-3 border-t border-slate-300 page-break-inside-avoid">
                  <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wide">{t('paymentsReceived')}</h4>
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-1.5 text-slate-600">{t('date')}</th>
                        <th className="p-1.5 text-slate-600">{t('description')}</th>
                        <th className="p-1.5 text-slate-600 text-right">{t('amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrderTxns.map((txn, i) => (
                        <tr key={i}>
                          <td className="p-1.5 text-slate-700">{formatDate(txn.date)}</td>
                          <td className="p-1.5 text-slate-500">{txn.description}</td>
                          <td className="p-1.5 text-slate-800 font-medium text-right">{formatCurrency(txn.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-right mt-1 text-xs font-bold text-green-700">
                    {t('totalPaid')}: {formatCurrency(selectedOrderTxns.reduce((sum, t) => sum + t.amount, 0))}
                  </div>
                </div>
              )}

              {/* Status Manager - Hidden on Print */}
              <div className="mt-4 pt-4 border-t border-slate-100 print:hidden">
                 <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-2"><CheckCircle size={14}/> {t('invoiceStatus')}</h4>
                 <div className="flex items-center gap-2">
                    <select 
                      value={selectedOrder.status} 
                      onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                      className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary outline-none"
                    >
                       <option value={OrderStatus.PENDING}>Pending</option>
                       <option value={OrderStatus.PARTIAL}>Partial Payment</option>
                       <option value={OrderStatus.PAID}>Paid</option>
                       <option value={OrderStatus.RETURNED}>Returned / Recalled</option>
                       <option value={OrderStatus.CANCELLED}>Cancelled</option>
                    </select>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium border ${getStatusColor(selectedOrder.status)}`}>
                       {t('current')}: {selectedOrder.status}
                    </span>
                 </div>
                 {selectedOrder.status === OrderStatus.RETURNED && (
                   <div className="flex items-center gap-2 mt-2 text-[10px] text-rose-600 bg-rose-50 p-2 rounded">
                      <AlertTriangle size={12} />
                      <span>{t('returnWarning')}</span>
                   </div>
                 )}
                 <p className="text-[10px] text-slate-400 mt-1">{t('manualUpdateWarning')}</p>
              </div>

              {/* Notes Section */}
              <div className="pt-4 mt-4 border-t border-slate-100">
                 <div className="flex justify-between items-center mb-1 print:hidden">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2"><FileText size={14}/> {t('notes')}</h4>
                    <button onClick={saveNotes} className="text-[10px] text-primary hover:underline font-medium">{t('saveNote')}</button>
                 </div>
                 <textarea 
                   value={orderNotes}
                   onChange={(e) => setOrderNotes(e.target.value)}
                   className="w-full text-xs p-2 bg-slate-50 rounded border border-slate-200 focus:ring-1 focus:ring-primary outline-none resize-none h-20 print:bg-transparent print:border-none print:p-0 print:h-auto print:resize-none"
                   placeholder={t('additionalNotes')}
                 />
              </div>

              {/* Print Footer */}
              <div className="hidden print:block fixed bottom-4 left-0 w-full text-center text-[10px] text-slate-400">
                {t('printedOn')} {new Date().toLocaleDateString()}
              </div>
            </div>
            
            {/* Modal Close Footer (Hidden on Print) */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right print:hidden">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
