

import React, { useState, useEffect, useRef } from 'react';
import { getCustomers, getProducts, saveOrder, getOrder, updateOrder, addCustomer } from '../utils/storage';
import { Customer, Product, OrderItem, OrderStatus, CustomerType } from '../types';
import { Trash2, Save, Loader2, Search, X, Plus, MapPin, Map, User, AlertTriangle, ChevronDown, FileText } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingOverlay from '../components/LoadingOverlay';
import { useLanguage } from '../contexts/LanguageContext';

const NewOrder = () => {
  const { t } = useLanguage();
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
  const [existingPaidAmount, setExistingPaidAmount] = useState(0);

  // Customer Search State
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const customerSearchContainerRef = useRef<HTMLDivElement>(null);

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
          setCustomerSearch(order.customerName);
          setOrderDate(new Date(order.date).toISOString().split('T')[0]);
          setCart(order.items);
          setExistingPaidAmount(order.paidAmount);
        }
        setLoadingOrder(false);
      }
      
      setLoading(false);
    };
    fetchData();

    // Click outside handler for search dropdowns
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
  }, [editOrderId]);

  const getCustomerDefaultDiscount = () => {
    const c = customers.find(x => x.id === selectedCustomer);
    return c?.defaultDiscount || 0;
  };

  const getProductStock = (productId: string) => {
    const p = products.find(x => x.id === productId);
    return p?.stock || 0;
  };

  const addProductToCart = (product: Product) => {
    // Auto-calculate discount if customer has a default percentage
    const defaultDiscountPercent = getCustomerDefaultDiscount();
    
    // Initialise with 0 quantity so no cost is added yet
    // Discount percent is kept for calculation when quantity is added
    
    setCart(prev => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity: 0,
        bonusQuantity: 0,
        unitPrice: product.basePrice,
        discount: 0,
        discountPercent: defaultDiscountPercent,
        subtotal: 0
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
        // Use existing paidAmount to prevent reset
        await updateOrder({ ...orderData, id: editOrderId, paidAmount: existingPaidAmount } as any);
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
      setCustomerSearch(newCust.name); // Set Search Text
      
      setShowNewCustomerModal(false);
      // Reset form
      setNewCustomerName('');
      setNewCustomerAddress('');
      setNewCustomerBrick('');
      setNewCustomerDiscount('0');
      setNewCustomerType(CustomerType.PHARMACY);
    } catch (e) {
      console.error("Error adding customer", e);
      alert("Failed to add customer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer.id);
    setCustomerSearch(customer.name);
    setShowCustomerList(false);
  };

  // Filter Logic - Updated to sort by stock DESC (ZA order)
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.basePrice.toString().includes(productSearch)
  ).sort((a, b) => {
    // Primary sort: Stock High to Low
    const stockDiff = b.stock - a.stock;
    if (stockDiff !== 0) return stockDiff;
    // Secondary sort: Name A-Z
    return a.name.localeCompare(b.name);
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  if (loading || loadingOrder) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-20">
      {isSubmitting && <LoadingOverlay />}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">
            {editOrderId ? t('editSalesOrder') : t('newSalesOrder')}
          </h2>
          <p className="text-slate-500 text-xs">
            {editOrderId ? t('editOrderSubtitle') : t('newOrderSubtitle')}
          </p>
        </div>
        
        {/* Invoice Shortcut */}
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium shadow-sm transition-colors"
          title={t('invoices')}
        >
          <FileText size={16} /> <span className="hidden md:inline">{t('invoices')}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header Details */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t('customer')}</label>
            <div className="flex gap-2" ref={customerSearchContainerRef}>
              <div className="relative w-full">
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    required
                    placeholder={t('searchCustomerPlaceholder')}
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setSelectedCustomer(''); // Clear ID on change to force selection
                      setShowCustomerList(true);
                    }}
                    onFocus={() => setShowCustomerList(true)}
                    className={`w-full pl-9 pr-8 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none ${!selectedCustomer && customerSearch ? 'border-orange-300' : 'border-slate-300'}`}
                  />
                  {/* Clear or Dropdown Indicator */}
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
                
                {/* Suggestions Dropdown */}
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
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="bg-slate-100 px-1.5 rounded">{c.type}</span>
                            {c.brick && <span>{c.brick}</span>}
                            {c.defaultDiscount > 0 && <span className="text-green-600 font-bold">{c.defaultDiscount}% Disc</span>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
                
                {/* Warning if typed but not selected */}
                {!selectedCustomer && customerSearch && !showCustomerList && (
                   <p className="text-[10px] text-orange-500 mt-1 absolute -bottom-5 left-0">{t('selectCustomerWarning')}</p>
                )}
              </div>

              <button 
                type="button"
                onClick={() => setShowNewCustomerModal(true)}
                className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200 flex-shrink-0 h-10 w-10 flex items-center justify-center"
                title={t('addNewCustomer')}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t('orderDate')}</label>
            <input 
              type="date"
              required
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full rounded-lg border-slate-300 border p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[10px] text-slate-400 mt-0.5 text-right">DD/MM/YYYY</p>
          </div>
        </div>

        {/* Product Selection */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <h3 className="text-base font-semibold">{t('orderItems')}</h3>
            
            {/* Searchable Product Input */}
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
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
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
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Dropdown Results */}
              {showProductList && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-10">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-xs">{t('noProductsFound')}</div>
                  ) : (
                    filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProductToCart(p)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center group"
                      >
                        <div>
                          <p className="font-medium text-slate-800 text-sm group-hover:text-primary transition-colors">{p.name}</p>
                          <p className={`text-[10px] ${p.stock <= 0 ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                            {t('stock')}: {p.stock} {p.stock <= 0 && `(${t('negativeStockWarning')})`}
                          </p>
                        </div>
                        <p className="font-bold text-slate-700 text-xs">EGP {p.basePrice}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto min-h-[250px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-2 font-medium text-slate-600 min-w-[150px]">{t('product')}</th>
                  <th className="p-2 font-medium text-slate-600 w-20">{t('price')}</th>
                  <th className="p-2 font-medium text-slate-600 w-16">{t('quantity')}</th>
                  <th className="p-2 font-medium text-slate-600 w-16 text-orange-600">{t('bonus')}</th>
                  <th className="p-2 font-medium text-slate-600 w-24">{t('discountPercent')}</th>
                  <th className="p-2 font-medium text-slate-600 w-20">{t('discountAmt')}</th>
                  <th className="p-2 font-medium text-slate-600 w-28 text-right">{t('subtotal')}</th>
                  <th className="p-2 font-medium text-slate-600 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-sm">
                      {t('noItemsAdded')}
                    </td>
                  </tr>
                ) : (
                  cart.map((item, index) => {
                    const stock = getProductStock(item.productId);
                    const totalQty = item.quantity + (item.bonusQuantity || 0);
                    const isOverselling = totalQty > stock;
                    
                    return (
                      <tr key={index}>
                        <td className="p-2 font-medium text-slate-800 text-xs md:text-sm">
                          {item.productName}
                          {isOverselling && (
                            <div className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5 font-normal">
                               <AlertTriangle size={10} /> {t('stock')}: {stock}
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateCartItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-16 rounded border border-slate-300 p-1 text-center text-xs focus:ring-1 focus:ring-primary outline-none"
                          />
                        </td>
                        <td className="p-2 relative">
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateCartItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className={`w-14 rounded border p-1 text-center font-bold text-xs focus:ring-1 focus:ring-primary outline-none ${isOverselling ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300'}`}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            value={item.bonusQuantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateCartItem(index, 'bonusQuantity', parseInt(e.target.value) || 0)}
                            className={`w-14 rounded border p-1 text-center text-xs focus:ring-1 focus:ring-primary outline-none ${isOverselling ? 'border-red-300 bg-red-50 text-red-700' : 'border-orange-200 bg-orange-50 text-orange-800'}`}
                          />
                        </td>
                        <td className="p-2">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              value={item.discountPercent || 0}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateCartItem(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                              className="w-20 rounded border border-slate-300 p-1 pr-5 text-center text-xs focus:ring-1 focus:ring-primary outline-none"
                            />
                            <span className="absolute right-2 top-1.5 text-slate-400 text-[10px]">%</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.discount}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateCartItem(index, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-20 rounded border border-slate-300 p-1 text-center text-xs focus:ring-1 focus:ring-primary outline-none"
                          />
                        </td>
                        <td className="p-2 font-bold text-slate-800 text-right text-xs">
                          EGP {item.subtotal.toFixed(2)}
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeCartItem(index)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end items-center gap-4 border-t border-slate-100 pt-3">
             <div className="text-right">
               <p className="text-xs text-slate-500">{t('totalAmount')}</p>
               <p className="text-2xl font-bold text-primary">EGP {calculateTotal().toFixed(2)}</p>
             </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 sticky bottom-4 z-10">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium shadow-sm text-sm"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={cart.length === 0 || isSubmitting || !selectedCustomer}
            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-teal-800 font-medium shadow-lg shadow-teal-700/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />}
            {isSubmitting ? t('saving') : (editOrderId ? t('updateOrder') : t('completeOrder'))}
          </button>
        </div>
      </form>

      {/* Quick Add Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
             <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
               <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                 <User size={18} className="text-primary"/> {t('quickAddCustomer')}
               </h3>
               <button onClick={() => setShowNewCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                 <X size={18} />
               </button>
            </div>
            
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t('customerNameLabel')}</label>
                <input 
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g. Hope Pharmacy"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="block text-xs font-medium text-slate-700 mb-1">{t('type')}</label>
                   <select 
                     value={newCustomerType}
                     onChange={(e) => setNewCustomerType(e.target.value as CustomerType)}
                     className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-white"
                   >
                     {Object.values(CustomerType).map(t => (
                       <option key={t} value={t}>{t}</option>
                     ))}
                   </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t('defaultDiscount')}</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    step="any"
                    value={newCustomerDiscount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewCustomerDiscount(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <Map size={12}/> {t('brickAreaLabel')}</label>
                <input 
                  type="text"
                  value={newCustomerBrick}
                  onChange={(e) => setNewCustomerBrick(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g. Downtown"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin size={12}/> {t('addressLabel')}</label>
                <input 
                  type="text"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Area / Street Details"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="button" 
                  onClick={handleQuickAddCustomer}
                  disabled={!newCustomerName}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 font-medium shadow-md text-sm"
                >
                  {t('addCustomer')}
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
