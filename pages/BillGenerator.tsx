import React, { useState, useEffect } from 'react';
import { getOrders, saveOrder, deleteOrder, getProducts } from '../utils/storage';
import { Order, OrderStatus, Product, OrderItem } from '../types';
import { Trash2, Save, Printer, Plus, Edit, FileText, Loader2, ArrowLeft, Download } from 'lucide-react';
import { formatDate, formatCurrency, numberToArabicTafqeet } from '../utils/helpers';
import { useLanguage } from '../contexts/LanguageContext';

const BillGenerator = () => {
  const { t, dir, language } = useLanguage();
  const [mode, setMode] = useState<'create' | 'list'>('create');
  
  // Create/Edit State
  const [heading, setHeading] = useState('Emad Co. Pharmaceutical');
  const [subheading, setSubheading] = useState('Sales & Distribution');
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  
  // List State
  const [drafts, setDrafts] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Product Lookup
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchDrafts();
    fetchProducts();
  }, []);

  // Ensure list is fresh when switching to list mode
  useEffect(() => {
    if (mode === 'list') {
      fetchDrafts();
    }
  }, [mode]);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const allOrders = await getOrders();
      const draftOrders = allOrders
        .filter(o => o.isDraft || o.status === OrderStatus.DRAFT)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDrafts(draftOrders);
    } catch (e) {
      console.error("Error fetching drafts", e);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProducts = async () => {
    const prods = await getProducts();
    setProducts(prods);
  }

  const addNewItem = () => {
    setItems([...items, {
      productId: `TEMP-${Date.now()}`,
      productName: '',
      batchNumber: '',
      quantity: 1,
      bonusQuantity: 0,
      unitPrice: 0,
      discount: 0,
      discountPercent: 0,
      subtotal: 0
    }]);
  };

  const updateItem = (index: number, field: keyof OrderItem | 'discountPercent', value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    (item as any)[field] = value;

    // Recalculate
    const price = Number(item.unitPrice) || 0;
    const qty = Number(item.quantity) || 0;
    
    if (field === 'quantity' || field === 'unitPrice') {
       const percent = Number(item.discountPercent || 0);
       const gross = price * qty;
       item.discount = (gross * percent) / 100;
       item.subtotal = gross - item.discount;
    } else if (field === 'discountPercent') {
       const percent = Number(value);
       const gross = price * qty;
       item.discount = (gross * percent) / 100;
       item.subtotal = gross - item.discount;
    } else if (field === 'discount') {
       const distVal = Number(value);
       const gross = price * qty;
       item.subtotal = gross - distVal;
       item.discountPercent = gross > 0 ? (distVal / gross) * 100 : 0;
    }

    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => items.reduce((sum, i) => sum + i.subtotal, 0);

  const handleSaveDraft = async () => {
    if (!customerName) {
      alert('Please enter a customer name.');
      return;
    }

    const draftOrder: Order = {
      id: editingDraftId || `DRAFT-${Date.now()}`,
      customerId: 'DRAFT_CUST', // Placeholder
      customerName: customerName,
      date: date,
      items: items,
      totalAmount: calculateTotal(),
      paidAmount: 0,
      status: OrderStatus.DRAFT,
      isDraft: true,
      notes: notes,
      draftMetadata: { heading, subheading }
    };

    try {
      await saveOrder(draftOrder);
      alert(t('draftSaved'));
      await fetchDrafts();
      setMode('list');
    } catch (e) {
      console.error(e);
      alert("Failed to save draft. If using Supabase, ensure 'is_draft' column exists.");
    }
  };

  const handleEditDraft = (draft: Order) => {
    setEditingDraftId(draft.id);
    setHeading(draft.draftMetadata?.heading || 'Emad Co. Pharmaceutical');
    setSubheading(draft.draftMetadata?.subheading || 'Sales & Distribution');
    setCustomerName(draft.customerName);
    setDate(draft.date);
    setNotes(draft.notes || '');
    setItems(draft.items);
    setMode('create');
  };

  const handleDeleteDraft = async (id: string) => {
    if (window.confirm(t('confirmDelete'))) {
      await deleteOrder(id);
      fetchDrafts();
    }
  };

  const handleCreateNew = () => {
    setEditingDraftId(null);
    setCustomerName('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setItems([]);
    setMode('create');
  };

  const totalAmount = calculateTotal();
  const tafqeet = numberToArabicTafqeet(totalAmount);

  if (loading && mode === 'list') {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  }

  return (
    <div className="p-4 md:p-6" dir={dir}>
      {/* Header / Tabs */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">{t('billGenTitle')}</h2>
          <p className="text-slate-500 text-xs md:text-sm">{t('billGenDesc')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setMode('list')} 
            className={`px-3 py-1.5 rounded-lg text-sm ${mode === 'list' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
          >
            {t('savedDrafts')}
          </button>
          <button 
            onClick={handleCreateNew} 
            className={`px-3 py-1.5 rounded-lg text-sm ${mode === 'create' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
          >
            {t('createDraft')}
          </button>
        </div>
      </div>

      {mode === 'list' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           {drafts.length === 0 ? (
             <div className="p-8 text-center text-slate-500 text-sm">{t('noDrafts')}</div>
           ) : (
             <table className="w-full text-left text-xs md:text-sm">
               <thead className="bg-slate-50 border-b">
                 <tr>
                   <th className="p-3">{t('date')}</th>
                   <th className="p-3">{t('customerName')}</th>
                   <th className="p-3">{t('total')}</th>
                   <th className="p-3 text-right">{t('actions')}</th>
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {drafts.map(d => (
                   <tr key={d.id} className="hover:bg-slate-50">
                     <td className="p-3">{formatDate(d.date)}</td>
                     <td className="p-3 font-medium">{d.customerName}</td>
                     <td className="p-3 font-bold">{formatCurrency(d.totalAmount)}</td>
                     <td className="p-3 text-right flex justify-end gap-2">
                       <button onClick={() => handleEditDraft(d)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={14}/></button>
                       <button onClick={() => handleDeleteDraft(d.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl p-6 print:shadow-none print:p-0 print:w-full print:max-w-none">
          
          {/* Print specific styles */}
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #bill-content, #bill-content * { visibility: visible; }
              #bill-content { position: absolute; left: 0; top: 0; width: 100%; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div id="bill-content">
            {/* Header Form */}
            <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
              <input 
                type="text" 
                value={heading} 
                onChange={e => setHeading(e.target.value)}
                className="text-2xl font-bold text-center w-full outline-none border-none bg-transparent placeholder-slate-300"
                placeholder={t('heading')}
              />
              <input 
                type="text" 
                value={subheading} 
                onChange={e => setSubheading(e.target.value)}
                className="text-base text-slate-500 text-center w-full outline-none border-none bg-transparent placeholder-slate-300"
                placeholder={t('subheading')}
              />
            </div>

            {/* Meta Data */}
            <div className="flex justify-between items-start mb-6 gap-6">
               <div className="flex-1">
                 <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 no-print">{t('customerName')}</label>
                 <div className="flex items-center gap-2">
                   <span className="font-bold text-base hidden print:inline">{t('customerName')}:</span>
                   <input 
                    type="text" 
                    value={customerName} 
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full text-base font-bold border-b border-slate-300 focus:border-primary outline-none py-1 bg-transparent"
                    placeholder="Enter Client Name"
                   />
                 </div>
               </div>
               <div className="w-40 text-right">
                 <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 no-print">{t('date')}</label>
                 <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full text-right border-none outline-none bg-transparent font-medium text-sm"
                   />
               </div>
            </div>

            {/* Items Table */}
            <div className="min-h-[250px]">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-800">
                    <th className="py-2 text-slate-800 font-bold w-[30%]">{t('product')}</th>
                    <th className="py-2 text-slate-800 font-bold w-[15%]">{t('batchNo')}</th>
                    <th className="py-2 text-slate-800 font-bold w-[10%] text-center">{t('units')}</th>
                    <th className="py-2 text-slate-800 font-bold w-[15%] text-right">{t('price')}</th>
                    <th className="py-2 text-slate-800 font-bold w-[10%] text-center">{t('discount')}</th>
                    <th className="py-2 text-slate-800 font-bold w-[15%] text-right">{t('total')}</th>
                    <th className="py-2 w-[5%] no-print"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, index) => (
                    <tr key={index} className="group">
                      <td className="py-1.5">
                        <input 
                          type="text" 
                          value={item.productName} 
                          onChange={e => updateItem(index, 'productName', e.target.value)}
                          className="w-full outline-none bg-transparent"
                          placeholder="Item Name"
                          list="product-suggestions"
                        />
                        <datalist id="product-suggestions">
                          {products.map(p => <option key={p.id} value={p.name} />)}
                        </datalist>
                      </td>
                      <td className="py-1.5">
                        <input 
                          type="text" 
                          value={item.batchNumber || ''} 
                          onChange={e => updateItem(index, 'batchNumber', e.target.value)}
                          className="w-full outline-none bg-transparent"
                          placeholder="-"
                        />
                      </td>
                      <td className="py-1.5 text-center">
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={e => updateItem(index, 'quantity', e.target.value)}
                          className="w-full text-center outline-none bg-transparent"
                        />
                      </td>
                      <td className="py-1.5 text-right">
                        <input 
                          type="number" 
                          value={item.unitPrice} 
                          onChange={e => updateItem(index, 'unitPrice', e.target.value)}
                          className="w-full text-right outline-none bg-transparent"
                        />
                      </td>
                      <td className="py-1.5 text-center">
                        <input 
                          type="number" 
                          value={item.discountPercent} 
                          onChange={e => updateItem(index, 'discountPercent', e.target.value)}
                          className="w-full text-center outline-none bg-transparent"
                          placeholder="%"
                        />
                      </td>
                      <td className="py-1.5 text-right font-medium">
                        {item.subtotal.toFixed(2)}
                      </td>
                      <td className="py-1.5 text-right no-print">
                        <button onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Add Item Row (No Print) */}
                  <tr className="no-print">
                    <td colSpan={7} className="py-3">
                      <button onClick={addNewItem} className="flex items-center gap-2 text-primary hover:text-teal-700 font-medium text-xs">
                        <Plus size={14} /> {t('addItem')}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals & Notes */}
            <div className="mt-6 pt-4 border-t-2 border-slate-800 flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="flex-1 w-full">
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 no-print">{t('notes')}</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-50 p-2 rounded border border-slate-200 text-xs h-20 resize-none outline-none focus:border-primary print:bg-transparent print:border-none print:p-0 print:h-auto"
                  placeholder="Additional notes..."
                />
              </div>
              <div className="w-full md:w-80">
                 <div className="flex justify-between items-center text-lg font-bold border-b border-slate-300 pb-2 mb-2">
                   <span>{t('totalBill')}</span>
                   <span>{formatCurrency(totalAmount)}</span>
                 </div>
                 {language === 'ar' && (
                   <div className="text-right text-xs text-slate-600 mt-1">
                     <span className="font-bold">{t('totalInWords')}:</span> {tafqeet}
                   </div>
                 )}
              </div>
            </div>
            
            {/* Print Footer */}
            <div className="hidden print:block fixed bottom-4 left-0 w-full text-center text-[10px] text-slate-400">
               Page 1 of 1
            </div>
          </div>

          {/* Action Buttons (No Print) */}
          <div className="mt-8 flex justify-end gap-2 pt-4 border-t border-slate-100 no-print">
            <button onClick={handleSaveDraft} className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm">
               <Save size={16}/> {t('saveAsDraft')}
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-teal-800 text-sm">
               <Printer size={16}/> {t('print')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillGenerator;