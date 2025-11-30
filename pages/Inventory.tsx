import React, { useEffect, useState } from 'react';
import { getProducts, getProviders, addProduct, updateProduct, restockProduct, addProvider, getTransactions } from '../utils/storage';
import { Product, Provider, PaymentMethod, Transaction, TransactionType } from '../types';
import { Package, AlertTriangle, Loader2, Plus, Edit2, ShoppingBag, Truck, Building2, Calendar, DollarSign, History } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/helpers';
import LoadingOverlay from '../components/LoadingOverlay';
import ProviderModal from '../components/ProviderModal';

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
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-500 text-xs md:text-sm">Stock, Purchasing & Providers</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('products')} 
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'products' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            >
              Products
            </button>
            <button 
              onClick={() => setActiveTab('purchases')} 
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'purchases' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            >
              Purchases History
            </button>
            <button 
              onClick={() => setActiveTab('providers')} 
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'providers' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            >
              Providers
            </button>
        </div>
      </div>

      {activeTab === 'products' && (
        <>
          <div className="flex justify-end mb-4">
             <button 
               onClick={() => handleOpenProductModal()}
               className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 text-sm"
             >
               <Plus size={16} /> Add New Product
             </button>
          </div>
          
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
                        <AlertTriangle size={10} /> Low Stock
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1 leading-tight h-10">{product.name}</h3>
                  <div className="flex justify-between items-end mt-3 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Price</p>
                      <p className="text-base font-semibold text-primary">EGP {product.basePrice}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Stock</p>
                      <p className={`text-lg font-bold ${isLowStock ? 'text-red-500' : 'text-slate-700'}`}>
                        {product.stock}
                      </p>
                    </div>
                  </div>
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-x-0 bottom-0 bg-white/95 border-t border-slate-100 p-2 flex justify-between items-center md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-b-xl">
                      <button 
                        onClick={() => handleOpenProductModal(product)}
                        className="text-slate-500 hover:text-blue-600 text-xs font-medium flex items-center gap-1 px-2 py-1"
                      >
                         <Edit2 size={12} /> Edit
                      </button>
                      <button 
                         onClick={() => handleOpenRestock(product)}
                         className="bg-primary text-white text-xs px-2 py-1 rounded hover:bg-teal-800 flex items-center gap-1"
                      >
                         <ShoppingBag size={12} /> Restock
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
          <div className="flex justify-end mb-4">
             <button 
               onClick={() => setShowProviderModal(true)}
               className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 text-sm"
             >
               <Plus size={16} /> Add Provider
             </button>
          </div>
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
                No providers added yet. Add a supplier to track expenses.
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'purchases' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                 <thead className="bg-slate-50 border-b border-slate-200">
                   <tr>
                     <th className="p-3 font-medium text-slate-600">Date</th>
                     <th className="p-3 font-medium text-slate-600">Description</th>
                     <th className="p-3 font-medium text-slate-600">Provider</th>
                     <th className="p-3 font-medium text-slate-600">Method</th>
                     <th className="p-3 font-medium text-slate-600 text-right">Cost</th>
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
                               {txn.paymentMethod === PaymentMethod.CASH ? 'Cash from Rep' : 'HQ Bank Transfer'}
                            </span>
                         </td>
                         <td className="p-3 text-right font-bold text-red-600">{formatCurrency(txn.amount)}</td>
                      </tr>
                    ))}
                    {purchases.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-slate-400">No purchase history found.</td></tr>
                    )}
                 </tbody>
              </table>
            </div>
         </div>
      )}

      {/* MODALS */}
      
      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl">
              <h3 className="text-lg font-bold mb-4">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
              <form onSubmit={handleSaveProduct} className="space-y-3">
                 <div>
                    <label className="block text-xs font-medium mb-1">Product Name</label>
                    <input type="text" required value={prodName} onChange={e => setProdName(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"/>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="block text-xs font-medium mb-1">Base Price</label>
                       <input type="number" step="any" required value={prodPrice} onChange={e => setProdPrice(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"/>
                    </div>
                    <div>
                       <label className="block text-xs font-medium mb-1">Stock</label>
                       <input type="number" required value={prodStock} onChange={e => setProdStock(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"/>
                    </div>
                 </div>
                 <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setShowProductModal(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-teal-800 text-sm">Save</button>
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
              <h3 className="text-lg font-bold mb-2">Restock Product</h3>
              <p className="text-xs text-slate-500 mb-4">Purchase inventory and record expense</p>
              
              <form onSubmit={handleRestock} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Quantity</label>
                      <input type="number" required value={restockQty} onChange={e => setRestockQty(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Total Cost (EGP)</label>
                      <input type="number" required value={restockCost} onChange={e => setRestockCost(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"/>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium">Provider</label>
                      <button 
                        type="button" 
                        onClick={() => setShowProviderModal(true)}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus size={10}/> New
                      </button>
                    </div>
                    <select required value={restockProvider} onChange={e => setRestockProvider(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white text-sm">
                      <option value="">Select Provider...</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {providers.length === 0 && <p className="text-[10px] text-red-500 mt-1">Please add a provider.</p>}
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1">Payment Method</label>
                    <select required value={restockMethod} onChange={e => setRestockMethod(e.target.value as PaymentMethod)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white text-sm">
                      <option value={PaymentMethod.BANK_TRANSFER}>HQ Bank Transfer</option>
                      <option value={PaymentMethod.CASH}>Cash from Rep (Deduct from Cash on Hand)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1">Date</label>
                    <input type="date" required value={restockDate} onChange={e => setRestockDate(e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"/>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setShowRestockModal(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                    <button type="submit" disabled={providers.length === 0} className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 text-sm">Confirm Purchase</button>
                </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;