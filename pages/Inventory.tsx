import React, { useEffect, useState } from 'react';
import { getProducts, getProviders, addProduct, updateProduct, restockProduct, addProvider, getTransactions } from '../utils/storage';
import { Product, Provider, PaymentMethod, Transaction, TransactionType } from '../types';
import { Package, AlertTriangle, Loader2, Plus, Edit2, ShoppingBag, Truck, Building2, Calendar, DollarSign, History } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/helpers';
import LoadingOverlay from '../components/LoadingOverlay';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'purchases' | 'providers'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);

  // Quick Add Provider State
  const [showQuickProvider, setShowQuickProvider] = useState(false);
  const [quickProvName, setQuickProvName] = useState('');

  // Form States
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');

  const [providerName, setProviderName] = useState('');
  const [providerContact, setProviderContact] = useState('');
  const [providerBank, setProviderBank] = useState('');

  const [restockProdId, setRestockProdId] = useState('');
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockProvider, setRestockProvider] = useState('');
  const [restockMethod, setRestockMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [restockDate, setRestockDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [p, prov, txns] = await Promise.all([getProducts(), getProviders(), getTransactions()]);
    setProducts(p);
    setProviders(prov);
    setPurchases(txns.filter(t => t.type === TransactionType.EXPENSE).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setLoading(false);
  };

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

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await addProvider({
        id: `PROV-${Date.now()}`,
        name: providerName,
        contactInfo: providerContact,
        bankDetails: providerBank
      });
      await fetchData();
      setShowProviderModal(false);
      setProviderName('');
      setProviderContact('');
      setProviderBank('');
    } catch (err) {
      console.error(err);
      alert('Failed to save provider');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickAddProvider = async () => {
    if (!quickProvName) return;
    setProcessing(true);
    try {
      const newId = `PROV-${Date.now()}`;
      await addProvider({
        id: newId,
        name: quickProvName,
        contactInfo: '',
        bankDetails: ''
      });
      // Refresh providers only
      const prov = await getProviders();
      setProviders(prov);
      setRestockProvider(newId); // Select it
      setShowQuickProvider(false);
      setQuickProvName('');
    } catch (err) {
      console.error(err);
      alert('Failed to add provider');
    } finally {
      setProcessing(false);
    }
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
    <div className="p-8 pb-24">
      {processing && <LoadingOverlay />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-500">Stock, Purchasing & Providers</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('products')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            >
              Products
            </button>
            <button 
              onClick={() => setActiveTab('purchases')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'purchases' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            >
              Purchases History
            </button>
            <button 
              onClick={() => setActiveTab('providers')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'providers' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            >
              Providers
            </button>
        </div>
      </div>

      {activeTab === 'products' && (
        <>
          <div className="flex justify-end mb-6">
             <button 
               onClick={() => handleOpenProductModal()}
               className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700"
             >
               <Plus size={18} /> Add New Product
             </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => {
              const isLowStock = product.stock < 100;
              return (
                <div key={product.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                      <Package size={24} />
                    </div>
                    {isLowStock && (
                      <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium border border-red-100">
                        <AlertTriangle size={12} /> Low Stock
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1 leading-tight h-14">{product.name}</h3>
                  <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Price</p>
                      <p className="text-lg font-semibold text-primary">EGP {product.basePrice}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Stock</p>
                      <p className={`text-xl font-bold ${isLowStock ? 'text-red-500' : 'text-slate-700'}`}>
                        {product.stock}
                      </p>
                    </div>
                  </div>
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-x-0 bottom-0 bg-white/95 border-t border-slate-100 p-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl">
                      <button 
                        onClick={() => handleOpenProductModal(product)}
                        className="text-slate-500 hover:text-blue-600 text-xs font-medium flex items-center gap-1 px-2 py-1"
                      >
                         <Edit2 size={14} /> Edit
                      </button>
                      <button 
                         onClick={() => handleOpenRestock(product)}
                         className="bg-primary text-white text-xs px-3 py-1.5 rounded hover:bg-teal-800 flex items-center gap-1"
                      >
                         <ShoppingBag size={14} /> Restock
                      </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'providers' && (
        <>
          <div className="flex justify-end mb-6">
             <button 
               onClick={() => setShowProviderModal(true)}
               className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700"
             >
               <Plus size={18} /> Add Provider
             </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map(prov => (
              <div key={prov.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Truck size={24}/></div>
                    <h3 className="font-bold text-lg text-slate-800">{prov.name}</h3>
                 </div>
                 <div className="space-y-2 text-sm text-slate-600">
                   <p className="flex items-center gap-2"><Building2 size={14} className="text-slate-400"/> {prov.contactInfo || 'No contact info'}</p>
                   <p className="flex items-center gap-2"><DollarSign size={14} className="text-slate-400"/> {prov.bankDetails || 'No bank details'}</p>
                 </div>
              </div>
            ))}
            {providers.length === 0 && (
              <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                No providers added yet. Add a supplier to track expenses.
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'purchases' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
               <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                   <th className="p-4 font-medium text-slate-600">Date</th>
                   <th className="p-4 font-medium text-slate-600">Description</th>
                   <th className="p-4 font-medium text-slate-600">Provider</th>
                   <th className="p-4 font-medium text-slate-600">Method</th>
                   <th className="p-4 font-medium text-slate-600 text-right">Cost</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {purchases.map(txn => (
                    <tr key={txn.id} className="hover:bg-slate-50">
                       <td className="p-4 text-slate-600">{formatDate(txn.date)}</td>
                       <td className="p-4 font-medium text-slate-800">{txn.description}</td>
                       <td className="p-4 text-slate-600">{txn.providerName || '-'}</td>
                       <td className="p-4 text-xs">
                          <span className={`px-2 py-1 rounded border ${txn.paymentMethod === PaymentMethod.CASH ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                             {txn.paymentMethod === PaymentMethod.CASH ? 'Cash from Rep' : 'HQ Bank Transfer'}
                          </span>
                       </td>
                       <td className="p-4 text-right font-bold text-red-600">{formatCurrency(txn.amount)}</td>
                    </tr>
                  ))}
                  {purchases.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">No purchase history found.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      )}

      {/* MODALS */}
      
      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
              <h3 className="text-xl font-bold mb-4">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
              <form onSubmit={handleSaveProduct} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">Product Name</label>
                    <input type="text" required value={prodName} onChange={e => setProdName(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"/>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium mb-1">Base Price</label>
                       <input type="number" step="any" required value={prodPrice} onChange={e => setProdPrice(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"/>
                    </div>
                    <div>
                       <label className="block text-sm font-medium mb-1">Stock</label>
                       <input type="number" required value={prodStock} onChange={e => setProdStock(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"/>
                    </div>
                 </div>
                 <div className="flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowProductModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-800">Save</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Provider Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
              <h3 className="text-xl font-bold mb-4">Add Provider</h3>
              <form onSubmit={handleSaveProvider} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">Provider Name</label>
                    <input type="text" required value={providerName} onChange={e => setProviderName(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Contact Info</label>
                    <input type="text" value={providerContact} onChange={e => setProviderContact(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary" placeholder="Phone, Email, Address"/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Bank Details</label>
                    <input type="text" value={providerBank} onChange={e => setProviderBank(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary" placeholder="IBAN, Acct #"/>
                 </div>
                 <div className="flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowProviderModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-800">Save Provider</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
              <h3 className="text-xl font-bold mb-2">Restock Product</h3>
              <p className="text-sm text-slate-500 mb-4">Purchase inventory and record expense</p>
              
              {!showQuickProvider ? (
                <form onSubmit={handleRestock} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Quantity</label>
                        <input type="number" required value={restockQty} onChange={e => setRestockQty(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Total Cost (EGP)</label>
                        <input type="number" required value={restockCost} onChange={e => setRestockCost(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"/>
                      </div>
                  </div>

                  <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium">Provider</label>
                        <button 
                          type="button" 
                          onClick={() => setShowQuickProvider(true)}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Plus size={12}/> New
                        </button>
                      </div>
                      <select required value={restockProvider} onChange={e => setRestockProvider(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white">
                        <option value="">Select Provider...</option>
                        {providers.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {providers.length === 0 && <p className="text-xs text-red-500 mt-1">Please add a provider.</p>}
                  </div>

                  <div>
                      <label className="block text-sm font-medium mb-1">Payment Method</label>
                      <select required value={restockMethod} onChange={e => setRestockMethod(e.target.value as PaymentMethod)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white">
                        <option value={PaymentMethod.BANK_TRANSFER}>HQ Bank Transfer</option>
                        <option value={PaymentMethod.CASH}>Cash from Rep (Deduct from Cash on Hand)</option>
                      </select>
                  </div>

                  <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <input type="date" required value={restockDate} onChange={e => setRestockDate(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"/>
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                      <button type="button" onClick={() => setShowRestockModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                      <button type="submit" disabled={providers.length === 0} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-800 disabled:opacity-50">Confirm Purchase</button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 border border-slate-200 p-4 rounded-lg bg-slate-50">
                   <h4 className="font-bold text-slate-800">Quick Add Provider</h4>
                   <div>
                      <label className="block text-sm font-medium mb-1">Provider Name</label>
                      <input 
                        type="text" 
                        autoFocus
                        value={quickProvName}
                        onChange={(e) => setQuickProvName(e.target.value)}
                        className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      />
                   </div>
                   <div className="flex justify-end gap-3 pt-2">
                      <button type="button" onClick={() => setShowQuickProvider(false)} className="px-3 py-1.5 text-slate-600 text-sm hover:bg-slate-200 rounded">Cancel</button>
                      <button type="button" onClick={handleQuickAddProvider} className="px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-teal-800">Save & Select</button>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;