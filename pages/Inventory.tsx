
import React, { useEffect, useState } from 'react';
import { getProducts, getProviders, addProduct, updateProduct, restockProduct, addProvider, getTransactions } from '../utils/storage';
import { Product, Provider, PaymentMethod, Transaction, TransactionType } from '../types';
import { Package, AlertTriangle, Loader2, Plus, Edit2, ShoppingBag, Truck, Building2, Calendar, DollarSign, History, Settings, Coins, Layers } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({ factoryPercent: 60, customerPercent: 100 });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);

  // Form States
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');

  const [restockProdId, setRestockProdId] = useState('');
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockProvider, setRestockProvider] = useState('');
  const [restockMethod, setRestockMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [restockDate, setRestockDate] = useState(new Date().toISOString().split('T')[0]);

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
    const [p, prov, txns] = await Promise.all([getProducts(), getProviders(), getTransactions()]);
    
    // Sort products by stock descending (ZA)
    const sortedProducts = p.sort((a, b) => b.stock - a.stock);
    setProducts(sortedProducts);
    
    setProviders(prov);
    setPurchases(txns.filter(t => t.type === TransactionType.EXPENSE).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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
    await addProvider(provider);
    // If we are in restock modal (indirectly checking if restockProdId is set), auto-select
    if (showRestockModal) {
      setRestockProvider(provider.id);
    }
    await fetchData();
    setShowProviderModal(false);
  };

  const handleOpenRestock = (product: Product) => {
    setRestockProdId(product.id);
    setRestockQty('');
    setRestockCost('');
    setRestockProvider('');
    setRestockMethod(PaymentMethod.BANK_TRANSFER);
    setRestockDate(new Date().toISOString().split('T')[0]);
    setShowRestockModal(true);
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const provider = providers.find(p => p.id === restockProvider);
      await restockProduct(
        restockProdId, 
        parseInt(restockQty), 
        parseFloat(restockCost), 
        restockProvider, 
        provider?.name || 'Unknown', 
        restockMethod, 
        restockDate
      );
      await fetchData();
      setShowRestockModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to process restock');
    } finally {
      setProcessing(false);
    }
  };

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
                 onClick={() => setShowProviderModal(true)}
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
              return (
                <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group">
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
              <div key={prov.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                 <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Truck size={20}/></div>
                    <h3 className="font-bold text-base text-slate-800">{prov.name}</h3>
                 </div>
                 <div className="space-y-1.5 text-xs text-slate-600">
                   <p className="flex items-center gap-2"><Building2 size={12} className="text-slate-400"/> {prov.contactInfo || 'No contact info'}</p>
                   <p className="flex items-center gap-2"><DollarSign size={12} className="text-slate-400"/> {prov.bankDetails || 'No bank details'}</p>
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
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {purchases.map(txn => (
                      <tr key={txn.id} className="hover:bg-slate-50">
                         <td className="p-3 text-slate-600">{formatDate(txn.date)}</td>
                         <td className="p-3 font-medium text-slate-800">{txn.description}</td>
                         <td className="p-3 text-slate-600">{txn.providerName || '-'}</td>
                         <td className="p-3 text-[10px]">
                            <span className={`px-2 py-0.5 rounded border ${txn.paymentMethod === PaymentMethod.CASH ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                               {txn.paymentMethod === PaymentMethod.CASH ? t('cashFromRep') : t('hqBankTransfer')}
                            </span>
                         </td>
                         <td className="p-3 text-right font-bold text-red-600">{formatCurrency(txn.amount)}</td>
                      </tr>
                    ))}
                    {purchases.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-slate-400">{t('noPurchases')}</td></tr>
                    )}
                 </tbody>
              </table>
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
                        onClick={() => setShowProviderModal(true)}
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

                <div>
                    <label className="block text-xs font-medium mb-1">{t('paymentMethod')}</label>
                    <select required value={restockMethod} onChange={e => setRestockMethod(e.target.value as PaymentMethod)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white text-sm">
                      <option value={PaymentMethod.BANK_TRANSFER}>{t('hqBankTransfer')}</option>
                      <option value={PaymentMethod.CASH}>{t('cashFromRepDeduct')}</option>
                    </select>
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

    </div>
  );
};

export default Inventory;
