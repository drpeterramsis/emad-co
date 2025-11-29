
import React, { useState, useEffect } from 'react';
import { getCustomers, getProducts, saveOrder } from '../utils/storage';
import { Customer, Product, OrderItem, OrderStatus } from '../types';
import { Plus, Trash2, Save, Calculator, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NewOrder = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [custData, prodData] = await Promise.all([
        getCustomers(),
        getProducts()
      ]);
      setCustomers(custData);
      setProducts(prodData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const getCustomerDefaultDiscount = () => {
    const c = customers.find(x => x.id === selectedCustomer);
    return c?.defaultDiscount || 0;
  };

  const addProductToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Auto-calculate discount if customer has a default percentage
    const defaultDiscountPercent = getCustomerDefaultDiscount();
    const discountAmount = defaultDiscountPercent > 0 
      ? Math.round(product.basePrice * (defaultDiscountPercent / 100)) 
      : 0;
    
    const subtotal = product.basePrice - discountAmount;

    setCart(prev => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.basePrice,
        discount: discountAmount,
        subtotal: subtotal
      }
    ]);
  };

  const updateCartItem = (index: number, field: keyof OrderItem, value: any) => {
    const newCart = [...cart];
    const item = newCart[index];
    
    // Type safety for dynamic update
    (item as any)[field] = value;

    // Recalculate subtotal
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
      const price = Number(item.unitPrice);
      const qty = Number(item.quantity);
      const discount = Number(item.discount);
      item.subtotal = (price * qty) - discount;
    }
    setCart(newCart);
  };

  const removeCartItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const customer = customers.find(c => c.id === selectedCustomer);
      
      const newOrder = {
        id: `ORD-${Date.now()}`,
        customerId: selectedCustomer,
        customerName: customer?.name || 'Unknown',
        date: orderDate,
        items: cart,
        totalAmount: calculateTotal(),
        paidAmount: 0,
        status: OrderStatus.PENDING,
        notes: ''
      };

      await saveOrder(newOrder);
      navigate('/invoices');
    } catch (error) {
      console.error("Failed to save order", error);
      alert("Failed to save order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">New Sales Order</h2>
          <p className="text-slate-500">Record a transaction for a customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Details */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Customer</label>
            <select
              required
              className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">Select Customer...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                   {c.name} ({c.type}) {c.defaultDiscount ? `- ${c.defaultDiscount}% Disc` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Order Date</label>
            <input 
              type="date"
              required
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full rounded-lg border-slate-300 border p-2.5 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Product Selection */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Order Items</h3>
            <div className="flex gap-2">
               <select 
                 className="rounded-lg border-slate-300 border p-2 text-sm w-64"
                 onChange={(e) => {
                   if(e.target.value) {
                     addProductToCart(e.target.value);
                     e.target.value = ''; // Reset
                   }
                 }}
               >
                 <option value="">+ Add Product...</option>
                 {products.map(p => (
                   <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                     {p.name} (Stock: {p.stock}) - EGP {p.basePrice}
                   </option>
                 ))}
               </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-medium text-slate-600">Product</th>
                  <th className="p-3 font-medium text-slate-600 w-24">Price</th>
                  <th className="p-3 font-medium text-slate-600 w-24">Qty</th>
                  <th className="p-3 font-medium text-slate-600 w-24">Discount</th>
                  <th className="p-3 font-medium text-slate-600 w-24">Subtotal</th>
                  <th className="p-3 font-medium text-slate-600 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No items added yet.
                    </td>
                  </tr>
                ) : (
                  cart.map((item, index) => (
                    <tr key={index}>
                      <td className="p-3 font-medium text-slate-800">{item.productName}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateCartItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-20 rounded border border-slate-300 p-1"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateCartItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20 rounded border border-slate-300 p-1"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={item.discount}
                          onChange={(e) => updateCartItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-20 rounded border border-slate-300 p-1"
                        />
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        EGP {item.subtotal.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeCartItem(index)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end items-center gap-4 border-t border-slate-100 pt-4">
             <div className="text-right">
               <p className="text-sm text-slate-500">Total Amount</p>
               <p className="text-3xl font-bold text-primary">EGP {calculateTotal().toFixed(2)}</p>
             </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={cart.length === 0 || isSubmitting}
            className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-teal-800 font-medium shadow-lg shadow-teal-700/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
            {isSubmitting ? 'Saving...' : 'Complete Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewOrder;
