import React, { useState, useEffect, useRef } from 'react';
import { getCustomers, getProducts, saveOrder } from '../utils/storage';
import { Customer, Product, OrderItem, OrderStatus } from '../types';
import { Trash2, Save, Loader2, Search, X, User, ChevronDown, RotateCcw, AlertOctagon, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingOverlay from '../components/LoadingOverlay';
import { useLanguage } from '../contexts/LanguageContext';

const Returns = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer Search State
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const customerSearchContainerRef = useRef<HTMLDivElement>(null);

  // Product Search State
  const [productSearch, setProductSearch] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowProductList(false);
      }
      if (customerSearchContainerRef.current && !customerSearchContainerRef.current.contains(event.target as Node)) {
        setShowCustomerList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addProductToCart = (product: Product) => {
    setCart(prev => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity: 0,
        bonusQuantity: 0,
        unitPrice: product.basePrice,
        discount: 0,
        discountPercent: 0,
        subtotal: 0,
        condition: 'EXPIRED' // Default to expired for returns as it's common
      }
    ]);
    setProductSearch('');
    setShowProductList(false);
  };

  const updateCartItem = (index: number, field: keyof OrderItem | 'discountPercent', value: any) => {
    const newCart = [...cart];
    const item = newCart[index];
    
    (item as any)[field] = value;

    // Recalculate Subtotal
    // For returns, we keep positive numbers in UI but logic handles them as credits
    const price = Number(item.unitPrice);
    const qty = Number(item.quantity);
    const gross = price * qty;
    // We assume no discount on return unless manually entered? Or maybe we are reversing a discounted price.
    // Let's keep discount logic available.
    if (field === 'discountPercent') {
        const percent = Number(value);
        item.discount = (gross * percent) / 100;
    } else if (field === 'discount') {
        // fixed discount amount
    } else if (field === 'quantity' || field === 'unitPrice') {
         // recalc discount if percent exists
         if (item.discountPercent) {
             item.discount = (gross * item.discountPercent) / 100;
         }
    }
    
    item.subtotal = gross - (item.discount || 0);
    setCart(newCart);
  };

  const removeCartItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // UI shows positive total, logic saves negative
  const calculateTotal = () => cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const customer = customers.find(c => c.id === selectedCustomer);
      const positiveTotal = calculateTotal();
      
      // Convert items to negative values for storage
      const returnItems = cart.map(item => ({
        ...item,
        unitPrice: -Math.abs(item.unitPrice), // Make negative
        subtotal: -Math.abs(item.subtotal),   // Make negative
        discount: -Math.abs(item.discount || 0) // Discount reduces the negative (credit), technically... 
        // Wait. Sales: Price 100. Total 100.
        // Return: Credit 100. Total -100.
        // If Sales had discount 10. Total 90.
        // Return should be -90.
        // So: -(Price * Qty) + Discount? 
        // Let's simplify: Just invert the final subtotal.
      }));

      const orderData = {
        customerId: selectedCustomer,
        customerName: customer?.name || 'Unknown',
        date: orderDate,
        items: cart.map(item => ({
             ...item,
             // Store positive quantities, but negative financial values
             // But subtotal is the source of truth for stats
             unitPrice: item.unitPrice, 
             subtotal: -Math.abs(item.subtotal),
             discount: -Math.abs(item.discount || 0)
        })),
        totalAmount: -Math.abs(positiveTotal), // Negative total for Credit
        status: OrderStatus.RETURNED,
        isReturn: true,
        notes: 'Customer Return'
      };

      await saveOrder({ ...orderData, id: `RET-${Date.now()}`, paidAmount: 0 } as any);
      navigate('/invoices');
    } catch (error) {
      console.error("Failed to save return", error);
      alert("Failed to save return.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer.id);
    setCustomerSearch(customer.name);
    setShowCustomerList(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.basePrice.toString().includes(productSearch)
  ).sort((a, b) => b.stock - a.stock);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin text-primary" size={24}/></div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-20">
      {isSubmitting && <LoadingOverlay />}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-amber-700 flex items-center gap-2">
            <RotateCcw size={28}/> {t('customerReturn')}
          </h2>
          <p className="text-slate-500 text-xs">{t('returnSubtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header Details */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t('customer')}</label>
            <div className="relative w-full" ref={customerSearchContainerRef}>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  required
                  placeholder={t('searchCustomerPlaceholder')}
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setSelectedCustomer('');
                    setShowCustomerList(true);
                  }}
                  onFocus={() => setShowCustomerList(true)}
                  className={`w-full pl-9 pr-8 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none ${!selectedCustomer && customerSearch ? 'border-orange-300' : 'border-slate-300'}`}
                />
                {customerSearch || selectedCustomer ? (
                   <button
                     type="button"
                     onClick={() => {
                       setCustomerSearch('');
                       setSelectedCustomer('');
                       setShowCustomerList(false);
                     }}
                     className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 z-10"
                   >
                     <X size={14} />
                   </button>
                ) : (
                  <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                     <ChevronDown size={14} />
                  </div>
                )}
              </div>
              
              {showCustomerList && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-20">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-xs">{t('noCustomersFound')}</div>
                  ) : (
                    filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                      >
                        <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                        <p className="text-[10px] text-slate-500">{c.type}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t('returnDate')}</label>
            <input 
              type="date"
              required
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full rounded-lg border-slate-300 border p-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Product Selection */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <h3 className="text-base font-semibold text-slate-800">{t('returnItems')}</h3>
            
            <div className="relative w-full md:w-80" ref={searchContainerRef}>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder={t('searchProductPlaceholder')}
                  value={productSearch}
                  onFocus={() => setShowProductList(true)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductList(true);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
                {productSearch && (
                  <button 
                    type="button"
                    onClick={() => { setProductSearch(''); setShowProductList(false); }}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {showProductList && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-10">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProductToCart(p)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center"
                    >
                      <span className="font-medium text-slate-800 text-sm">{p.name}</span>
                      <span className="font-bold text-slate-700 text-xs">EGP {p.basePrice}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto min-h-[200px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-amber-50 border-b border-amber-200">
                <tr>
                  <th className="p-2 font-medium text-amber-900 min-w-[150px]">{t('product')}</th>
                  <th className="p-2 font-medium text-amber-900 w-24">{t('condition')}</th>
                  <th className="p-2 font-medium text-amber-900 w-20">{t('price')}</th>
                  <th className="p-2 font-medium text-amber-900 w-16">{t('quantity')}</th>
                  <th className="p-2 font-medium text-amber-900 w-28 text-right">{t('creditAmt')}</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-sm">{t('noItemsAdded')}</td></tr>
                ) : (
                  cart.map((item, index) => (
                    <tr key={index}>
                      <td className="p-2 font-medium text-slate-800 text-xs md:text-sm">{item.productName}</td>
                      <td className="p-2">
                         <select 
                           value={item.condition}
                           onChange={(e) => updateCartItem(index, 'condition', e.target.value)}
                           className={`text-xs p-1 rounded border outline-none font-medium ${item.condition === 'EXPIRED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}
                         >
                            <option value="EXPIRED">{t('expiredDamaged')}</option>
                            <option value="GOOD">{t('goodStock')}</option>
                         </select>
                         {item.condition === 'EXPIRED' && (
                             <div className="text-[9px] text-red-500 mt-0.5 flex items-center gap-1">
                                <AlertOctagon size={10}/> {t('discardInventory')}
                             </div>
                         )}
                         {item.condition === 'GOOD' && (
                             <div className="text-[9px] text-green-600 mt-0.5 flex items-center gap-1">
                                <FileCheck size={10}/> {t('returnToStock')}
                             </div>
                         )}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateCartItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-20 rounded border border-slate-300 p-1 text-center text-xs outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateCartItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-16 rounded border border-slate-300 p-1 text-center font-bold text-xs outline-none"
                        />
                      </td>
                      <td className="p-2 font-bold text-red-600 text-right text-xs">
                         - {item.subtotal.toFixed(2)}
                      </td>
                      <td className="p-2 text-right">
                        <button onClick={() => removeCartItem(index)} className="text-slate-400 hover:text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end items-center gap-4 border-t border-slate-100 pt-3">
             <div className="text-right">
               <p className="text-xs text-slate-500">{t('totalCredit')}</p>
               <p className="text-2xl font-bold text-red-600">- {calculateTotal().toFixed(2)}</p>
             </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 sticky bottom-4 z-10">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium text-sm"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={cart.length === 0 || isSubmitting || !selectedCustomer}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 font-medium shadow-lg flex items-center gap-2 disabled:opacity-50 text-sm"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />}
            {t('processReturn')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Returns;