import React, { useEffect, useState } from 'react';
import { getOrders, deleteOrder, updateOrder } from '../utils/storage';
import { Order, OrderStatus } from '../types';
import { Search, Loader2, Edit, Trash2, Filter, Eye, X, Printer, Save, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatCurrency } from '../utils/helpers';

const InvoiceList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchMonth, setSearchMonth] = useState('');

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
    const data = await getOrders();
    setOrders(data);
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

    return matchesCustomer && matchesProduct && matchesMonth;
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
                    <td className="p-4 font-medium text-slate-800 align-top">{order.customerName}</td>
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
            {showPrintSettings && (
              <div className="p-4 bg-slate-50 border-b border-slate-200 print:hidden">
                <h4 className="font-bold text-sm text-slate-700 mb-2">Print Settings</h4>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <input 
                    type="text" 
                    value={invoiceHeader}
                    onChange={(e) => setInvoiceHeader(e.target.value)}
                    placeholder="Invoice Heading (e.g. Company Name)"
                    className="p-2 border border-slate-300 rounded text-sm"
                  />
                  <input 
                    type="text" 
                    value={invoiceSubheader}
                    onChange={(e) => setInvoiceSubheader(e.target.value)}
                    placeholder="Subheading (e.g. Sales Dept)"
                    className="p-2 border border-slate-300 rounded text-sm"
                  />
                </div>
                <button 
                  onClick={savePrintSettings} 
                  className="text-xs bg-slate-800 text-white px-3 py-1 rounded flex items-center gap-1"
                >
                  <Save size={12} /> Save Settings
                </button>
              </div>
            )}
            
            {/* Invoice Content */}
            <div className="p-8 space-y-6 print:p-8">
              
              {/* Print Header (Only visible heavily on print/preview) */}
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-8">
                 <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-wide">{invoiceHeader}</h1>
                 <p className="text-slate-500 font-medium">{invoiceSubheader}</p>
              </div>

              <div className="flex justify-between items-start">
                <div>
                   <p className="text-xs text-slate-500 uppercase font-bold mb-1">Bill To:</p>
                   {/* Editable "Bill To" for Printing */}
                   <input 
                     type="text" 
                     value={printCustomerName}
                     onChange={(e) => setPrintCustomerName(e.target.value)}
                     className="font-bold text-xl text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-primary outline-none bg-transparent w-full print:border-none p-0"
                   />
                   <p className="text-sm text-slate-600">ID: {selectedOrder.customerId}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs text-slate-500 uppercase font-bold">Invoice #</p>
                   <p className="font-mono text-lg text-slate-800">{selectedOrder.id}</p>
                   <p className="text-sm text-slate-600 mt-1">Date: {formatDate(selectedOrder.date)}</p>
                </div>
              </div>

              <div>
                <table className="w-full text-left text-sm mt-4">
                  <thead className="bg-slate-100 border-b-2 border-slate-300 print:bg-slate-50">
                    <tr>
                      <th className="p-3 text-slate-800 font-bold">Item</th>
                      <th className="p-3 text-slate-800 font-bold text-right">Price</th>
                      <th className="p-3 text-slate-800 font-bold text-center">Qty</th>
                      <th className="p-3 text-slate-800 font-bold text-center">Bonus</th>
                      <th className="p-3 text-slate-800 font-bold text-center">Disc %</th>
                      <th className="p-3 text-slate-800 font-bold text-center">Disc Amt</th>
                      <th className="p-3 text-slate-800 font-bold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedOrder.items.map((item, idx) => {
                      const gross = item.unitPrice * item.quantity;
                      const percent = item.discountPercent || (gross > 0 ? (item.discount / gross) * 100 : 0);
                      
                      return (
                      <tr key={idx}>
                        <td className="p-3 font-medium text-slate-800">{item.productName}</td>
                        <td className="p-3 text-right">{item.unitPrice}</td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-center">{item.bonusQuantity > 0 ? item.bonusQuantity : '-'}</td>
                        <td className="p-3 text-center text-slate-600">
                          {percent > 0.01 ? percent.toFixed(2) + '%' : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {item.discount > 0 ? item.discount.toFixed(2) : '-'}
                        </td>
                        <td className="p-3 text-right font-bold">{item.subtotal.toFixed(2)}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col items-end pt-4 border-t border-slate-300 gap-1">
                {(() => {
                   const subTotal = selectedOrder.items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
                   const totalDiscount = selectedOrder.items.reduce((s, i) => s + (i.discount || 0), 0);
                   const totalPercent = subTotal > 0 ? (totalDiscount / subTotal) * 100 : 0;
                   
                   return (
                   <>
                     <div className="w-64 flex justify-between text-sm">
                       <span className="text-slate-600">Subtotal:</span>
                       <span className="font-medium">
                         {formatCurrency(subTotal)}
                       </span>
                     </div>
                     <div className="w-64 flex justify-between text-sm">
                       <span className="text-slate-600">Discount:</span>
                       <span className="text-red-500 font-medium flex items-center gap-2">
                         {totalDiscount > 0 && <span className="text-xs text-slate-500">({totalPercent.toFixed(2)}%)</span>}
                         <span>- {formatCurrency(totalDiscount)}</span>
                       </span>
                     </div>
                     <div className="w-64 flex justify-between text-lg font-bold border-t border-slate-300 pt-2 mt-2">
                       <span>Total:</span>
                       <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                     </div>
                     <div className="w-64 flex justify-between text-sm pt-1">
                       <span className="text-slate-500">Paid:</span>
                       <span className="text-green-600 font-medium">{formatCurrency(selectedOrder.paidAmount)}</span>
                     </div>
                     <div className="w-64 flex justify-between text-sm pt-1">
                       <span className="text-slate-500">Balance:</span>
                       <span className="text-red-600 font-bold">{formatCurrency(selectedOrder.totalAmount - selectedOrder.paidAmount)}</span>
                     </div>
                   </>
                   );
                })()}
              </div>

              {/* Notes Section */}
              <div className="pt-6 mt-4 border-t border-slate-100">
                 <div className="flex justify-between items-center mb-2 print:hidden">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><FileText size={16}/> Notes</h4>
                    <button onClick={saveNotes} className="text-xs text-primary hover:underline font-medium">Save Note</button>
                 </div>
                 <textarea 
                   value={orderNotes}
                   onChange={(e) => setOrderNotes(e.target.value)}
                   className="w-full text-sm p-3 bg-slate-50 rounded border border-slate-200 focus:ring-1 focus:ring-primary outline-none resize-none h-24 print:bg-transparent print:border-none print:p-0 print:h-auto print:resize-none"
                   placeholder="Add notes to this invoice..."
                 />
              </div>

              {/* Print Footer */}
              <div className="hidden print:block fixed bottom-4 left-0 w-full text-center text-xs text-slate-400">
                Printed on {new Date().toLocaleDateString()}
              </div>
            </div>
            
            {/* Modal Close Footer (Hidden on Print) */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right print:hidden">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;