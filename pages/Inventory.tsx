

import React, { useEffect, useState, useMemo } from 'react';
import { getProducts, getProviders, addProduct, updateProduct, restockProduct, addProvider, updateProvider, deleteProvider, getTransactions, getFinancialStats, deleteTransaction, updateTransaction } from '../utils/storage';
import { Product, Provider, PaymentMethod, Transaction, TransactionType, DashboardStats } from '../types';
import { Package, AlertTriangle, Loader2, Plus, Edit2, ShoppingBag, Truck, Building2, Calendar, DollarSign, History, Settings, Coins, Layers, Trash2, Search, Filter, ArrowUpDown } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/helpers';
import LoadingOverlay from '../components/LoadingOverlay';
import ProviderModal from '../components/ProviderModal';
import { useLanguage } from '../contexts/LanguageContext';

const Inventory = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'products' | 'purchases' | 'providers'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({ factoryPercent: 30, customerPercent: 75 });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showEditPurchaseModal, setShowEditPurchaseModal] = useState(false);

  // Form States
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');

  const [restockProdId, setRestockProdId] = useState('');
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockProvider, setRestockProvider] = useState('');
  const [restockMethod, setRestockMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [restockDate, setRestockDate] = useState(new Date().toISOString().split('T')[0]);
  const [restockDesc, setRestockDesc] = useState('');

  // Purchase Edit Form
  const [editPurchaseTxn, setEditPurchaseTxn] = useState<Transaction | null>(null);
  const [editPurchaseQty, setEditPurchaseQty] = useState('');
  const [editPurchaseCost, setEditPurchaseCost] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editPurchaseProvider, setEditPurchaseProvider] = useState('');
  const [editPurchaseMethod, setEditPurchaseMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);

  // Purchase List Filters
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [purchaseSort, setPurchaseSort] = useState<'date' | 'amount'>('date');
  const [purchaseGroup, setPurchaseGroup] = useState<'none' | 'provider' | 'month'>('none');

  useEffect(() => {
    fetchData();
    const savedSettings = localStorage.getItem('emad_inventory_settings');
    if(savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch(e) { console.error(e); }
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [p, prov, txns, finStats] = await Promise.all([
      getProducts(), 
      getProviders(), 
      getTransactions(),
      getFinancialStats()
    ]);
    
    // Sort products by stock descending (ZA)
    const sortedProducts = p.sort((a, b) => b.stock - a.stock);
    setProducts(sortedProducts);
    
    setProviders(prov);
    setPurchases(txns.filter(t => t.type === TransactionType.EXPENSE).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setStats(finStats);
    setLoading(false);
  };

  const handleSaveSettings = () => {
     localStorage.setItem('emad_inventory_settings', JSON.stringify(settings));
     setShowSettingsModal(false);
  }

  // Calculations
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  const totalCapital = products.reduce((acc, p) => acc + (p.stock * p.basePrice * (settings.factoryPercent / 100)), 0);
  const totalPharmacyVal = products.reduce((acc, p) => acc + (p.stock * p.basePrice * (settings.customerPercent / 100)), 0);

  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProdName(product.name);
      setProdPrice(product.basePrice.toString());
      setProdStock(product.stock.toString());
    } else {
      setEditingProduct(null);
      setProdName('');
      setProdPrice('');
      setProdStock('0');
    }
    setShowProductModal(true);
  };

  const handleOpenProviderModal = (provider?: Provider) => {
    if (provider) {
      setEditingProvider(provider);
    } else {
      setEditingProvider(null);
    }
    setShowProviderModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const price = parseFloat(prodPrice) || 0;
      const stock = parseInt(prodStock) || 0;
      
      if (editingProduct) {
        await updateProduct({ ...editingProduct, name: prodName, basePrice: price, stock: stock });
      } else {
        await addProduct({ id: `PROD-${Date.now()}`, name: prodName, basePrice: price, stock: stock });
      }
      await fetchData();
      setShowProductModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save product');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveProvider = async (provider: Provider) => {
    if (editingProvider) {
       await updateProvider(provider);
    } else {
       await addProvider(provider);
    }
    
    // If we are in restock modal (indirectly checking if restockProdId is set), auto-select
    if (showRestockModal) {
      setRestockProvider(provider.id);
    }
    await fetchData();
    setShowProviderModal(false);
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (window.confirm("Are you sure you want to delete this provider?")) {
      setProcessing(true);
      try {
        await deleteProvider(providerId);
        await fetchData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete provider.');
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleOpenRestock = (product: Product) => {
    setRestockProdId(product.id);
    setRestockQty('');
    setRestockCost('');
    setRestockProvider('');
    setRestockMethod(PaymentMethod.BANK_TRANSFER);
    setRestockDate(new Date().toISOString().split('T')[0]);
    setRestockDesc('');
    setShowRestockModal(true);
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const qty = parseInt(restockQty);
      const cost = parseFloat(restockCost);
      
      if (isNaN(qty) || qty < 0) throw new Error("Invalid quantity");
      if (isNaN(cost) || cost < 0) throw new Error("Invalid cost");

      // Check balance if Cash
      if (restockMethod === PaymentMethod.CASH && stats && cost > stats.repCashOnHand) {
         throw new Error("Insufficient Cash on Hand.");
      }

      const provider = providers.find(p => p.id === restockProvider);
      
      await restockProduct(
        restockProdId, 
        qty, 
        cost, 
        restockProvider, 
        provider?.name || 'Unknown', 
        restockMethod, 
        restockDate,
        restockDesc
      );
      await fetchData();
      setShowRestockModal(false);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to process restock: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeletePurchase = async (txnId: string) => {
    if (window.confirm("Are you sure? This will remove the expense record AND revert (reduce) the added stock.")) {
       setProcessing(true);
       try {
         await deleteTransaction(txnId);
         await fetchData();
       } catch (err) {
         console.error(err);
         alert("Failed to delete purchase.");
       } finally {
         setProcessing(false);
       }
    }
  };

  const handleOpenEditPurchase = (txn: Transaction) => {
    setEditPurchaseTxn(txn);
    setEditPurchaseCost(txn.amount.toString());
    setEditPurchaseDate(new Date(txn.date).toISOString().split('T')[0]);
    setEditPurchaseProvider(txn.providerId || '');
    setEditPurchaseMethod(txn.paymentMethod || PaymentMethod.BANK_TRANSFER);
    
    // Try to get quantity from metadata or description
    let qty = 0;
    if (txn.metadata && txn.metadata.quantity !== undefined) {
       qty = txn.metadata.quantity;
    } else {
       const match = txn.description.match(/Stock Purchase: (\d+)x/);
       if (match) qty = parseInt(match[1]);
    }
    setEditPurchaseQty(qty.toString());
    setShowEditPurchaseModal(true);
  };

  const handleEditPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPurchaseTxn) return;
    setProcessing(true);
    
    try {
      const newCost = parseFloat(editPurchaseCost);
      const newQty = parseInt(editPurchaseQty);
      
      if (isNaN(newCost) || isNaN(newQty) || newQty < 0) throw new Error("Invalid values");
      
      // We need to construct a new description if quantity changed, mainly for display legacy
      const productName = products.find(p => p.id === editPurchaseTxn.referenceId)?.name || 'Product';
      // Only update description if it looks like the default auto-generated one
      let newDesc = editPurchaseTxn.description;
      if (newDesc.includes('Stock Purchase:')) {
         newDesc = `Stock Purchase: ${newQty}x ${productName}`;
      }
      
      const provider = providers.find(p => p.id === editPurchaseProvider);

      await updateTransaction({
        ...editPurchaseTxn,
        amount: newCost,
        date: editPurchaseDate,
        paymentMethod: editPurchaseMethod,
        providerId: editPurchaseProvider,
        providerName: provider?.name,
        description: newDesc,
        metadata: {
           ...editPurchaseTxn.metadata,
           quantity: newQty // Important: updateTransaction logic uses this to adjust stock
        }
      });
      
      await fetchData();
      setShowEditPurchaseModal(false);
    } catch (err: any) {
      console.error(err);
      alert("Failed to update purchase.");
    } finally {
      setProcessing(false);
    }
  };

  // --- Purchase List Filtering ---
  const filteredPurchases = useMemo(() => {
     let data = purchases.filter(t => 
        t.description.toLowerCase().includes(purchaseSearch.toLowerCase()) || 
        (t.providerName && t.providerName.toLowerCase().includes(purchaseSearch.toLowerCase()))
     );
     
     if (purchaseSort === 'amount') {
        data.sort((a, b) => b.amount - a.amount);
     } else {
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
     }
     
     return data;
  }, [purchases, purchaseSearch, purchaseSort]);

  const groupedPurchases = useMemo(() => {
     if (purchaseGroup === 'none') return { 'All': filteredPurchases };
     
     const groups: Record<string, Transaction[]> = {};
     filteredPurchases.forEach(txn => {
        let key = 'Other';
        if (purchaseGroup === 'provider') key = txn.providerName || 'Unknown Provider';
        if (purchaseGroup === 'month') key = txn.date.substring(0, 7); // YYYY-MM
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(txn);
     });
     
     return groups;
  }, [filteredPurchases, purchaseGroup]);


  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="p-4 md:p-6 pb-20">
      {processing && <LoadingOverlay />}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">{t('inventoryTitle')}</h2>
          <p className="text-slate-500 text-xs md:text-sm">{t('inventorySubtitle')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
         <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
               <Package size={16} className="text-slate-500" />
               <span className="text-xs text-slate-500 font-bold uppercase">{t('totalItems')}</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{products.length}</p>
         </div>
         <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
               <Layers size={16} className="text-slate-500" />
               <span className="text-xs text-slate-500 font-bold uppercase">{t('totalStock')}</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{totalStock}</p>
         </div>
         <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
               <Coins size={16} className="text-amber-500" />
               <span className="text-xs text-slate-500 font-bold uppercase">{t('totalCapital')}</span>
            </div>
            <p className="text-lg font-bold text-amber-600 truncate" title={formatCurrency(totalCapital)}>{formatCurrency(totalCapital)}</p>
            <p className="text-[10px] text-slate-400">@ {settings.factoryPercent}% {t('factoryPercent')}</p>
         </div>
         <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
               <DollarSign size={16} className="text-emerald-500" />
               <span className="text-xs text-slate-500 font-bold uppercase">{t('pharmacyValue')}</span>
            </div>
            <p className="text-lg font-bold text-emerald-600 truncate" title={formatCurrency(totalPharmacyVal)}>{formatCurrency(totalPharmacyVal)}</p>
            <p className="text-[10px] text-slate-400">@ {settings.customerPercent}% {t('pharmacyPercent')}</p>
         </div>
      </div>

      {/* Tabs & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('products')} 
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'products' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            >
              {t('products')}
            </button>
            <button 
              onClick={() => setActiveTab('purchases')} 
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'purchases' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            >
              {t('purchasesHistory')}
            </button>
            <button 
              onClick={() => setActiveTab('providers')} 
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'providers' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            >
              {t('providers')}
            </button>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto justify-end">
            <button 
               onClick={() => setShowSettingsModal(true)}
               className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-sm"
               title={t('inventorySettings')}
             >
               <Settings size={16} /> <span className="hidden md:inline">{t('inventorySettings')}</span>
             </button>
             {activeTab === 'products' && (
               <button 
                 onClick={() => handleOpenProductModal()}
                 className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 text-sm"
               >
                 <Plus size={16} /> {t('addNewProduct')}
               </button>
             )}
             {activeTab === 'providers' && (
               <button 
                 onClick={() => handleOpenProviderModal()}
                 className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 text-sm"
               >
                 <Plus size={16} /> {t('addProvider')}
               </button>
             )}
        </div>
      </div>

      {activeTab === 'products' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(product => {
              const isLowStock = product.stock < 100;
              const isOutOfStock = product.stock === 0;

              return (
                <div key={product.id} className={`${isOutOfStock ? 'bg-red-50' : 'bg-white'} p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                      <Package size={20} />
                    </div>
                    {isLowStock && (
                      <span className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium border border-red-100">
                        <AlertTriangle size={10} /> {t('lowStock')}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1 leading-tight h-10">{product.name}</h3>
                  <div className="flex justify-between items-end mt-3 pt-3 border-t border-slate-100 relative z-0">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t('price')}</p>
                      <p className="text-base font-semibold text-primary">EGP {product.basePrice}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t('stock')}</p>
                      <p className={`text-lg font-bold ${isLowStock ? 'text-red-500' : 'text-slate-700'}`}>
                        {product.stock}
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions Bar - Simplified Mobile View: Static relative block on mobile, overlay on desktop */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center md:mt-0 md:pt-0 md:border-t-0 md:absolute md:inset-x-0 md:bottom-0 md:bg-white/95 md:p-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-b-xl z-10">
                      <button 
                        onClick={() => handleOpenProductModal(product)}
                        className="text-slate-500 hover:text-blue-600 text-xs font-medium flex items-center gap-1 px-2 py-1"
                      >
                         <Edit2 size={12} /> {t('edit')}
                      </button>
                      <button 
                         onClick={() => handleOpenRestock(product)}
                         className="bg-primary text-white text-xs px-2 py-1 rounded hover:bg-teal-800 flex items-center gap-1"
                      >
                         <ShoppingBag size={12} /> {t('restock')}
                      </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'providers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map(prov => (
              <div key={prov.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative group">
                 <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Truck size={20}/></div>
                    <h3 className="font-bold text-base text-slate-800">{prov.name}</h3>
                 </div>
                 <div className="space-y-1.5 text-xs text-slate-600">
                   <p className="flex items-center gap-2"><Building2 size={12} className="text-slate-400"/> {prov.contactInfo || 'No contact info'}</p>
                   <p className="flex items-center gap-2"><DollarSign size={12} className="text-slate-400"/> {prov.bankDetails || 'No bank details'}</p>
                 </div>
                 
                 <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenProviderModal(prov)}
                      className="p-1.5 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteProvider(prov.id)}
                      className="p-1.5 bg-slate-100 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                 </div>
              </div>
            ))}
            {providers.length === 0 && (
              <div className="col-span-full p-8 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                {t('noProviders')}
              </div>
            )}
        </div>
      )}

      {activeTab === 'purchases' && (
         <div className="space-y-4">
             {/* Toolbar */}
             <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      value={purchaseSearch}
                      onChange={(e) => setPurchaseSearch(e.target.value)}
                      placeholder={t('search')}
                      className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                 </div>
                 <div className="flex gap-2">
                    <div className="relative">
                       <select 
                         value={purchaseGroup}
                         onChange={(e) => setPurchaseGroup(e.target.value as any)}
                         className="pl-2 pr-8 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white h-full"
                       >
                         <option value="none">{t('groupBy')}: {t('none')}</option>
                         <option value="provider">{t('groupBy')}: {t('providerName')}</option>
                         <option value="month">{t('groupBy')}: {t('month')}</option>
                       </select>
                    </div>
                    <button 
                      onClick={() => setPurchaseSort(prev => prev === 'date' ? 'amount' : 'date')}
                      className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-sm font-medium"
                    >
                      <ArrowUpDown size={14} /> {purchaseSort === 'date' ? t('date') : t('amount')}
                    </button>
                 </div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200">
                       <tr>
                         <th className="p-3 font-medium text-slate-600">{t('date')}</th>
                         <th className="p-3 font-medium text-slate-600">{t('description')}</th>
                         <th className="p-3 font-medium text-slate-600">{t('providerName')}</th>
                         <th className="p-3 font-medium text-slate-600">{t('paymentMethod')}</th>
                         <th className="p-3 font-medium text-slate-600 text-right">{t('totalCost')}</th>
                         <th className="p-3 font-medium text-slate-600 text-right w-20">{t('actions')}</th>
                       </tr>
                     </thead>
                     {filteredPurchases.length === 0 ? (
                        <tbody><tr><td colSpan={6} className="p-6 text-center text-slate-400">{t('noPurchases')}</td></tr></tbody>
                     ) : (
                        Object.entries(groupedPurchases).map(([groupKey, txns]) => (
                           <React.Fragment key={groupKey}>
                              {purchaseGroup !== 'none' && (
                                <tbody>
                                  <tr className="bg-slate-100 border-b border-slate-200">
                                    <td colSpan={6} className="p-2 font-bold text-slate-700">{groupKey} ({(txns as Transaction[]).length})</td>
                                  </tr>
                                </tbody>
                              )}
                              <tbody className="divide-y divide-slate-100">
                                {(txns as Transaction[]).map(txn => (
                                  <tr key={txn.id} className="hover:bg-slate-50 group">
                                     <td className="p-3 text-slate-600">{formatDate(txn.date)}</td>
                                     <td className="p-3 font-medium text-slate-800">{txn.description}</td>
                                     <td className="p-3 text-slate-600">{txn.providerName || '-'}</td>
                                     <td className="p-3 text-[10px]">
                                        <span className={`px-2 py-0.5 rounded border ${txn.paymentMethod === PaymentMethod.CASH ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                           {txn.paymentMethod === PaymentMethod.CASH ? t('cashFromRep') : t('hqBankTransfer')}
                                        </span>
                                     </td>
                                     <td className="p-3 text-right font-bold text-red-600">{formatCurrency(txn.amount)}</td>
                                     <td className="p-3 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button 
                                             onClick={() => handleOpenEditPurchase(txn)}
                                             className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                             title={t('edit')}
                                           >
                                              <Edit2 size={14}/>
                                           </button>
                                           <button 
                                             onClick={() => handleDeletePurchase(txn.id)}
                                             className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                             title={t('delete')}
                                           >
                                              <Trash2 size={14}/>
                                           </button>
                                        </div>
                                     </td>
                                  </tr>
                                ))}
                              </tbody>
                           </React.Fragment>
                        ))
                     )}
                  </table>
                </div>
             </div>
         </div>
      )}

      {/* MODALS */}
      
      {/* Settings Modal */}
      {showSettingsModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings size={18}/> {t('inventorySettings')}</h3>
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-medium mb-1 text-slate-700">{t('factoryPercent')}</label>
                    <div className="relative">
                       <input 
                         type="number" 
                         min="0" 
                         max="100"
                         value={settings.factoryPercent} 
                         onChange={e => setSettings({...settings, factoryPercent: parseFloat(e.target.value) || 0})} 
                         className="w-full p-2 pr-8 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                       />
                       <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Calculates 'Total Capital' = Stock × BasePrice × Factory%</p>
                 </div>
                 <div>
                    <label className="block text-xs font-medium mb-1 text-slate-700">{t('pharmacyPercent')}</label>
                    <div className="relative">
                       <input 
                         type="number" 
                         min="0"
                         max="200"
                         value={settings.customerPercent} 
                         onChange={e => setSettings({...settings, customerPercent: parseFloat(e.target.value) || 0})} 
                         className="w-full p-2 pr-8 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                       />
                       <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Calculates 'Pharmacy Value' = Stock × BasePrice × Pharmacy% (e.g. 100 for full price, 80 for 20% discount)</p>
                 </div>
                 <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button onClick={() => setShowSettingsModal(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">{t('cancel')}</button>
                    <button onClick={handleSaveSettings} className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-teal-800 text-sm">{t('save')}</button>
                 </div>
              </div>
           </div>
         </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl">
              <h3 className="text-lg font-bold mb-4">{editingProduct ? t('editProduct') : t('newProduct')}</h3>
              <form onSubmit={handleSaveProduct} className="space-y-3">
                 <div>
                    <label className="block text-xs font-medium mb-1">{t('productName')}</label>
                    <input type="text" required value={prodName} onChange={e => setProdName(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"/>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="block text-xs font-medium mb-1">{t('basePrice')}</label>
                       <input type="number" step="any" required value={prodPrice} onChange={e => setProdPrice(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"/>
                    </div>
                    <div>
                       <label className="block text-xs font-medium mb-1">{t('stock')}</label>
                       <input type="number" required value={prodStock} onChange={e => setProdStock(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"/>
                    </div>
                 </div>
                 <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setShowProductModal(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">{t('cancel')}</button>
                    <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-teal-800 text-sm">{t('save')}</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Provider Modal (Shared Component) */}
      <ProviderModal 
        isOpen={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        onSave={handleSaveProvider}
        initialData={editingProvider}
      />

      {/* Restock Modal */}
      {showRestockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl">
              <h3 className="text-lg font-bold mb-2">{t('restockProduct')}</h3>
              <p className="text-xs text-slate-500 mb-4">{t('restockSubtitle')}</p>
              
              <form onSubmit={handleRestock} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">{t('quantity')}</label>
                      <input type="number" required value={restockQty} onChange={e => setRestockQty(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">{t('totalCost')}</label>
                      <input type="number" required value={restockCost} onChange={e => setRestockCost(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"/>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium">{t('providers')}</label>
                      <button 
                        type="button" 
                        onClick={() => handleOpenProviderModal()}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus size={10}/> {t('new')}
                      </button>
                    </div>
                    <select required value={restockProvider} onChange={e => setRestockProvider(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white text-sm">
                      <option value="">{t('selectProvider')}</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {providers.length === 0 && <p className="text-[10px] text-red-500 mt-1">{t('pleaseAddProvider')}</p>}
                </div>
                
                {/* Description Input */}
                <div>
                   <label className="block text-xs font-medium mb-1">{t('description')} <span className="text-slate-400 font-normal">({t('optional')})</span></label>
                   <input 
                     type="text" 
                     value={restockDesc} 
                     onChange={e => setRestockDesc(e.target.value)} 
                     className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                     placeholder={t('restockDescPlaceholder')}
                   />
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1">{t('paymentMethod')}</label>
                    <select required value={restockMethod} onChange={e => setRestockMethod(e.target.value as PaymentMethod)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white text-sm">
                      <option value={PaymentMethod.BANK_TRANSFER}>{t('hqBankTransfer')}</option>
                      <option value={PaymentMethod.CASH}>{t('cashFromRepDeduct')}</option>
                    </select>
                    {stats && restockMethod === PaymentMethod.CASH && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 font-medium">
                        <Coins size={10} /> <span>{t('available')}: {formatCurrency(stats.repCashOnHand)}</span>
                      </div>
                    )}
                    {stats && restockMethod === PaymentMethod.BANK_TRANSFER && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600 font-medium">
                        <Building2 size={10} /> <span>{t('transferredToHQ')}: {formatCurrency(stats.transferredToHQ)}</span>
                      </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1">{t('date')}</label>
                    <input type="date" required value={restockDate} onChange={e => setRestockDate(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"/>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setShowRestockModal(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">{t('cancel')}</button>
                    <button type="submit" disabled={providers.length === 0} className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 text-sm">{t('confirmPurchase')}</button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* Edit Purchase Modal */}
      {showEditPurchaseModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl">
               <h3 className="text-lg font-bold mb-4">{t('edit')} {t('restockProduct')}</h3>
               <form onSubmit={handleEditPurchase} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="block text-xs font-medium mb-1">{t('quantity')}</label>
                        <input type="number" required value={editPurchaseQty} onChange={e => setEditPurchaseQty(e.target.value)} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                     </div>
                     <div>
                        <label className="block text-xs font-medium mb-1">{t('totalCost')}</label>
                        <input type="number" required value={editPurchaseCost} onChange={e => setEditPurchaseCost(e.target.value)} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-medium mb-1">{t('providerName')}</label>
                     <select value={editPurchaseProvider} onChange={e => setEditPurchaseProvider(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white outline-none">
                        <option value="">{t('noneGeneral')}</option>
                        {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-medium mb-1">{t('paymentMethod')}</label>
                     <select value={editPurchaseMethod} onChange={e => setEditPurchaseMethod(e.target.value as PaymentMethod)} className="w-full p-2 border rounded-lg text-sm bg-white outline-none">
                        <option value={PaymentMethod.CASH}>{t('cashFromRep')}</option>
                        <option value={PaymentMethod.BANK_TRANSFER}>{t('hqBankTransfer')}</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-medium mb-1">{t('date')}</label>
                     <input type="date" required value={editPurchaseDate} onChange={e => setEditPurchaseDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none" />
                  </div>
                  <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-100">
                     <button type="button" onClick={() => setShowEditPurchaseModal(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">{t('cancel')}</button>
                     <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm">{t('saveChanges')}</button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
};

export default Inventory;
