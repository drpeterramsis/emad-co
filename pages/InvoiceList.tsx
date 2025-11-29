
import React, { useEffect, useState } from 'react';
import { getOrders, deleteOrder } from '../utils/storage';
import { Order, OrderStatus } from '../types';
import { Search, Loader2, Edit, Trash2, Filter, Eye, X } from 'lucide-react';
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

  // Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const data = await getOrders();
    setOrders(data);
    setLoading(false);
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
      <div className="flex flex-col gap-6 mb-8">
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-medium text-slate-600">Date</th>
              <th className="p-4 font-medium text-slate-600">Invoice #</th>
              <th className="p-4 font-medium text-slate-600">Customer</th>
              <th className="p-4 font-medium text-slate-600 text-center">Summary</th>
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
                const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
                const totalBonus = order.items.reduce((s, i) => s + (i.bonusQuantity || 0), 0);
                const totalDiscount = order.items.reduce((s, i) => s + (i.discount || 0), 0);
                
                return (
                  <tr 
                    key={order.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="p-4 text-slate-600 font-medium">{formatDate(order.date)}</td>
                    <td className="p-4 font-mono text-xs">{order.id}</td>
                    <td className="p-4 font-medium text-slate-800">{order.customerName}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-xs">
                         <span className="text-slate-600">Qty: <b className="text-slate-800">{totalQty}</b></span>
                         {totalBonus > 0 && <span className="text-orange-600">Bonus: <b>{totalBonus}</b></span>}
                         {totalDiscount > 0 && <span className="text-blue-600">Disc: <b>{totalDiscount.toFixed(2)}</b></span>}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{formatCurrency(order.totalAmount)}</td>
                    <td className="p-4 text-slate-600">{formatCurrency(order.paidAmount)}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                           onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Invoice Details</h3>
                <p className="text-slate-500 text-sm">#{selectedOrder.id} • {formatDate(selectedOrder.date)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
                <div>
                   <p className="text-sm text-slate-500">Customer</p>
                   <p className="font-bold text-lg text-slate-800">{selectedOrder.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Total Amount</p>
                  <p className="font-bold text-2xl text-primary">{formatCurrency(selectedOrder.totalAmount)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-800 mb-3">Order Items</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-3 text-slate-600">Product</th>
                        <th className="p-3 text-slate-600 text-right">Unit Price</th>
                        <th className="p-3 text-slate-600 text-center">Qty</th>
                        <th className="p-3 text-slate-600 text-center">Bonus</th>
                        <th className="p-3 text-slate-600 text-center">Disc.</th>
                        <th className="p-3 text-slate-600 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-medium text-slate-800">{item.productName}</td>
                          <td className="p-3 text-right">{item.unitPrice}</td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-center text-orange-600">{item.bonusQuantity > 0 ? item.bonusQuantity : '-'}</td>
                          <td className="p-3 text-center text-blue-600">
                            {item.discount > 0 ? `${item.discount.toFixed(2)} (${item.discountPercent}%)` : '-'}
                          </td>
                          <td className="p-3 text-right font-bold">{item.subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between text-sm text-slate-600 pt-4 border-t border-slate-100">
                <span>Paid: {formatCurrency(selectedOrder.paidAmount)}</span>
                <span className={selectedOrder.status === OrderStatus.PAID ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                  {selectedOrder.status.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
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