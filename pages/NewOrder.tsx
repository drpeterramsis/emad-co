import React, { useState, useEffect, useRef } from 'react';
import { getCustomers, getProducts, saveOrder, getOrder, updateOrder, addCustomer } from '../utils/storage';
import { Customer, Product, OrderItem, OrderStatus, CustomerType } from '../types';
import { Trash2, Save, Loader2, Search, X, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingOverlay from '../components/LoadingOverlay';

const NewOrder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editOrderId = searchParams.get('id');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Product Search State
  const [productSearch, setProductSearch] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // New Customer Modal State
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerType, setNewCustomerType] = useState<CustomerType>(CustomerType.PHARMACY);
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerBrick, setNewCustomerBrick] = useState('');
  const [newCustomerDiscount, setNewCustomerDiscount] = useState('0');

  useEffect(() => {
    const fetchData = async () => {
      const [custData, prodData] = await Promise.all([
        getCustomers(),
        getProducts()
      ]);
      setCustomers(custData);
      setProducts(prodData);
      
      // If editing, fetch order data
      if (editOrderId) {
        setLoadingOrder(true);
        const order = await getOrder(editOrderId);
        if (order) {
          setSelectedCustomer(order.customerId);
          setOrderDate(new Date(order.date).toISOString().split('T')[0]);
          setCart(order.items);
        }
        setLoadingOrder(false);
      }
      
      setLoading(false);
    };
    fetchData();

    // Click outside handler for search dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowProductList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editOrderId]);

  const getCustomerDefaultDiscount = () => {
    const c = customers.find(x => x.id === selectedCustomer);
    return c?.defaultDiscount || 0;
  };

  const addProductToCart = (product: Product) => {
    // Auto-calculate discount if customer has a default percentage
    const defaultDiscountPercent = getCustomerDefaultDiscount();
    const discountAmount = defaultDiscountPercent > 0 
      ? (product.basePrice * (defaultDiscountPercent / 100)) 
      : 0;
    
    const subtotal = product.basePrice - discountAmount;

    setCart(prev => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        bonusQuantity: 0,
        unitPrice: product.basePrice,
        discount: discountAmount,
        discountPercent: defaultDiscountPercent,
        subtotal: subtotal
      }
    ]);
    
    setProductSearch('');
    setShowProductList(false);
  };

  const updateCartItem = (index: number, field: keyof OrderItem | 'discountPercent', value: any) => {
    const newCart = [...cart];
    const item = newCart[index];
    
    // Type safety update
    (item as any)[field] = value;

    const price = Number(item.unitPrice);
    const qty = Number(item.quantity);

    // Recalculate Logic
    if (field === 'quantity' || field === 'unitPrice') {
      // Keep percentage fixed, update discount amount
      const percent = Number(item.discountPercent || 0);
      const gross = price * qty;
      const newDiscount = (gross * percent) / 100;
      item.discount = Number(newDiscount.toFixed(2));
      item.subtotal = gross - item.discount;
    } else if (field === 'discountPercent') {
      // Update discount amount based on new percentage
      const percent = Number(value);
      const gross = price * qty;
      const newDiscount = (gross * percent) / 100;
      item.discount = Number(newDiscount.toFixed(2));
      item.subtotal = gross - item.discount;
    } else if (field === 'discount') {
      // Update percentage based on new fixed amount
      const discountVal = Number(value);
      const gross = price * qty;
      item.subtotal = gross - discountVal;
      // Reverse calculate percentage
      item.discountPercent = gross > 0 ? Number(((discountVal / gross) * 100).toFixed(2)) : 0;
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
      
      const orderData = {
        customerId: selectedCustomer,
        customerName: customer?.name || 'Unknown',
        date: orderDate,
        items: cart,
        totalAmount: calculateTotal(),
        status: OrderStatus.PENDING,
        notes: ''
      };

      if (editOrderId) {
        await updateOrder({ ...orderData, id: editOrderId, paidAmount: 0 } as any);
      } else {
        await saveOrder({ ...orderData, id: `ORD-${Date.now()}`, paidAmount: 0 } as any);
      }
      navigate('/invoices');
    } catch (error) {
      console.error("Failed to save order", error);
      alert("Failed to save order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAddCustomer = async () => {
    if (!newCustomerName) return;
    setIsSubmitting(true); // Reusing loading state
    try {
      const newId = `CUST-${Date.now()}`;
      const newCust: Customer = {
        id: newId,
        name: newCustomerName,
        type: newCustomerType,
        address: newCustomerAddress,
        brick: newCustomerBrick,
        defaultDiscount: parseFloat(newCustomerDiscount) || 0
      };
      await addCustomer(newCust);
      
      // Refresh customer list
      const updatedCustomers = await getCustomers();
      setCustomers(updatedCustomers);
      setSelectedCustomer(newId); // Auto select
      
      setShowNewCustomerModal(false);
      setNewCustomerName('');
      setNewCustomerAddress('');
      setNewCustomerBrick('');
      setNewCustomerDiscount('0');
    } catch (e) {
      console.error("Error adding customer", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.basePrice.toString().includes(productSearch)
  );

  if (loading || loadingOrder) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      {isSubmitting && <LoadingOverlay />}
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">
            {editOrderId ? 'Edit Sales Order' : 'New Sales Order'}
          </h2>
          <p className="text-slate-500">
            {editOrderId ? 'Modify transaction details' : 'Record a transaction for a customer'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Details */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Customer</label>
            <div className="flex gap-2">
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
              <button 
                type="button"
                onClick={() => setShowNewCustomerModal(true)}
                className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200"
                title="Add New Customer"
              >
                <Plus size={20} />
              </button>
            </div>
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
            {/* Helper for date format preference */}
            <p className="text-[10px] text-slate-400 mt-1 text-right">DD/MM/YYYY</p>
          </div>
        </div>

        {/* Product Selection */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-lg font-semibold">Order Items</h3>
            
            {/* Searchable Product Input */}
            <div className="relative w-full md:w-96" ref={searchContainerRef}>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search products by name or price..."
                  value={productSearch}
                  onFocus={() => setShowProductList(true)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductList(true);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
                {productSearch && (
                  <button 
                    type="button"
                    onClick={() => {
                      setProductSearch('');
                      setShowProductList(false);
                    }}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Dropdown Results */}
              {showProductList && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 max-h-60 overflow-y-auto z-10">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">No products found</div>
                  ) : (
                    filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProductToCart(p)}
                        disabled={p.stock <= 0}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div>
                          <p className="font-medium text-slate-800 group-hover:text-primary transition-colors">{p.name}</p>
                          <p className="text-xs text-slate-500">Stock: {p.stock}</p>
                        </div>
                        <p className="font-bold text-slate-700">EGP {p.basePrice}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-medium text-slate-600">Product</th>
                  <th className="p-3 font-medium text-slate-600 w-24">Price</th>
                  <th className="p-3 font-medium text-slate-600 w-20">Qty</th>
                  <th className="p-3 font-medium text-slate-600 w-20 text-orange-600">Bounce</th>
                  <th className="p-3 font-medium text-slate-600 w-32">Discount %</th>
                  <th className="p-3 font-medium text-slate-600 w-28">Disc. Amt</th>
                  <th className="p-3 font-medium text-slate-600 w-32 text-right">Subtotal</th>
                  <th className="p-3 font-medium text-slate-600 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No items added yet. Search above to add products.
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
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => updateCartItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-20 rounded border border-slate-300 p-1 text-center"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateCartItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-16 rounded border border-slate-300 p-1 text-center font-bold"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={item.bonusQuantity}
                          onChange={(e) => updateCartItem(index, 'bonusQuantity', parseInt(e.target.value) || 0)}
                          className="w-16 rounded border border-orange-200 p-1 bg-orange-50 text-orange-800 text-center"
                        />
                      </td>
                      <td className="p-3">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={item.discountPercent || 0}
                            onChange={(e) => updateCartItem(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                            className="w-20 rounded border border-slate-300 p-1 pr-6 text-center"
                          />
                          <span className="absolute right-2 top-1.5 text-slate-400 text-xs">%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.discount}
                          onChange={(e) => updateCartItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-24 rounded border border-slate-300 p-1 text-center"
                        />
                      </td>
                      <td className="p-3 font-bold text-slate-800 text-right">
                        EGP {item.subtotal.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeCartItem(index)}
                          className="text-red-400 hover:text-red-600 transition-colors"
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

        <div className="flex justify-end gap-3 sticky bottom-6 z-10">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-6 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={cart.length === 0 || isSubmitting}
            className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-teal-800 font-medium shadow-lg shadow-teal-700/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
            {isSubmitting ? 'Saving...' : (editOrderId ? 'Update Order' : 'Complete Order')}
          </button>
        </div>
      </form>

      {/* Quick Add Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Quick Add Customer</h3>
              <button onClick={() => setShowNewCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input 
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g. Hope Pharmacy"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                   <select 
                     value={newCustomerType}
                     onChange={(e) => setNewCustomerType(e.target.value as CustomerType)}
                     className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none bg-white"
                   >
                     {Object.values(CustomerType).map(t => (
                       <option key={t} value={t}>{t}</option>
                     ))}
                   </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Discount (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={newCustomerDiscount}
                    onChange={(e) => setNewCustomerDiscount(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Brick / Area</label>
                <input 
                  type="text"
                  value={newCustomerBrick}
                  onChange={(e) => setNewCustomerBrick(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g. Downtown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input 
                  type="text"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Area / Street"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleQuickAddCustomer}
                  disabled={!newCustomerName}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-800 disabled:opacity-50"
                >
                  Add Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewOrder;