import React, { useEffect, useState } from 'react';
import { getOrders, deleteOrder, updateOrder, getCustomers } from '../utils/storage';
import { Order, OrderStatus, CustomerType } from '../types';
import { Search, Loader2, Edit, Trash2, Filter, Eye, X, Printer, Save, FileText, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatCurrency } from '../utils/helpers';

const InvoiceList = () => {
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

  // Modal & Print State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
    setOrders(ordersData);

    // Create lookup map for customer types
    const map: Record<string, string> = {};
    customersData.forEach(c => map[c.id] = c.type);
    setCustomerTypes(map);

    setLoading(false);
  };

  const openModal = (order: Order) => {
    setSelectedOrder(order);
    setPrintCustomerName(order.customerName);
    setOrderNotes(order.notes || '');
  }

  const saveNotes = async () => {
    if (!selectedOrder) return;
    try {
      const updated = { ...selectedOrder, notes: orderNotes };
      await updateOrder(updated);
      await fetchOrders(); // Refresh list
      setSelectedOrder(updated); // Update modal state
      alert('Notes saved successfully!');
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
  const filteredOrders = orders.filter(o => {
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
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
     return (
       <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex flex-col gap-6 mb-8 print:hidden">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Invoices</h2>
          <p className="text-slate-500">History of all sales orders</p>
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

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter by Product..." 
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none w-full"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
             <select 
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
               className="px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-600 bg-white"
            >
               <option value="All">All Status</option>
               <option value={OrderStatus.PAID}>Paid</option>
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
               className="px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-600 bg-white"
            >
               <option value="All">All Types</option>
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
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-600"
            />
          </div>

           <button 
             onClick={() => { setSearchCustomer(''); setSearchProduct(''); setSearchMonth(''); setFilterType('All'); setFilterStatus('All'); }}
             className="text-sm text-slate-500 hover:text-red-500 underline"
           >
             Clear
           </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-medium text-slate-600">Date</th>
              <th className="p-4 font-medium text-slate-600">Invoice #</th>
              <th className="p-4 font-medium text-slate-600">Customer</th>
              <th className="p-4 font-medium text-slate-600 text-center w-1/3">Summary</th>
              <th className="p-4 font-medium text-slate-600">Total</th>
              <th className="p-4 font-medium text-slate-600">Paid</th>
              <th className="p-4 font-medium text-slate-600">Status</th>
              <th className="p-4 font-medium text-slate-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-slate-400">No invoices found matching filters.</td></tr>
            ) : (
              filteredOrders.map(order => {
                const totalDiscount = order.items.reduce((s, i) => s + (i.discount || 0), 0);
                const grossTotal = order.totalAmount + totalDiscount;
                const effectiveDiscountPercent = grossTotal > 0 ? (totalDiscount / grossTotal) * 100 : 0;
                
                return (
                  <tr 
                    key={order.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => openModal(order)}
                  >
                    <td className="p-4 text-slate-600 font-medium align-top">{formatDate(order.date)}</td>
                    <td className="p-4 font-mono text-xs align-top">{order.id}</td>
                    <td className="p-4 font-medium text-slate-800 align-top">
                      <div>{order.customerName}</div>
                      {customerTypes[order.customerId] && (
                        <div className="inline-block mt-1">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                            {customerTypes[order.customerId]}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex flex-col gap-1 text-xs max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                         {order.items.map((item, i) => (
                           <div key={i} className="flex justify-between gap-4 border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                             <span className="font-medium text-slate-700 truncate max-w-[150px]" title={item.productName}>{item.productName}</span>
                             <div className="flex gap-2 text-slate-500 whitespace-nowrap">
                                <span>{item.quantity} u</span>
                                {item.bonusQuantity > 0 && <span className="text-orange-600 font-bold">+{item.bonusQuantity} b</span>}
                             </div>
                           </div>
                         ))}
                         {totalDiscount > 0 && (
                           <div className="mt-2 pt-1 border-t border-slate-200 text-blue-600 font-medium flex justify-between bg-blue-50 px-2 py-1 rounded">
                              <span>Disc:</span>
                              <span>{formatCurrency(totalDiscount)} ({effectiveDiscountPercent.toFixed(1)}%)</span>
                           </div>
                         )}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-800 align-top">{formatCurrency(order.totalAmount)}</td>
                    <td className="p-4 text-slate-600 align-top">{formatCurrency(order.paidAmount)}</td>
                    <td className="p-4 align-top">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-right align-top">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                           onClick={(e) => { e.stopPropagation(); openModal(order); }}
                           className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                           title="View Details"
                         >
                           <Eye size={16} />
                         </button>
                         <button 
                           onClick={(e) => handleEdit(e, order.id)}
                           className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                           title="Edit Invoice"
                         >
                           <Edit size={16} />
                         </button>
                         <button 
                           onClick={(e) => handleDelete(e, order.id)}
                           className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                           title="Delete Invoice"
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:absolute print:inset-0">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none print:h-auto print:max-h-none print:rounded-none">
            
            {/* Modal Actions (Hidden on Print) */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-start print:hidden">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Invoice Details</h3>
                <p className="text-slate-500 text-sm">#{selectedOrder.id}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowPrintSettings(!showPrintSettings)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                  title="Print Settings"
                >
                  <Edit size={20} />
                </button>
                <button 
                  onClick={handlePrint}
                  className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-2"
                >
                  <Printer size={20} /> Print
                </button>
                <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Print Settings (Visible when toggled, Hidden on Print) */}
            {show