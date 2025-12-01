import { Product, Customer, Order, Transaction, OrderStatus, TransactionType, Provider, PaymentMethod } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS } from '../constants';
import { supabase, isSupabaseEnabled } from '../services/supabaseClient';

const STORAGE_KEYS = {
  PRODUCTS: 'emad_products',
  CUSTOMERS: 'emad_customers',
  ORDERS: 'emad_orders',
  TRANSACTIONS: 'emad_transactions',
  PROVIDERS: 'emad_providers',
};

// Initialize Storage
export const initStorage = async () => {
  if (isSupabaseEnabled && supabase) {
    // Supabase initialization logic
  } else {
    // Local Storage Fallback
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROVIDERS)) {
      localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify([]));
    }
  }
};

// --- DATA ACCESS LAYER ---

export const getProducts = async (): Promise<Product[]> => {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
      console.error('Supabase error fetching products:', error);
      return [];
    }
    return (data as any[])?.map(p => ({
      id: p.id,
      name: p.name,
      basePrice: Number(p.base_price),
      stock: p.stock
    })) || [];
  }
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
};

export const getCustomers = async (): Promise<Customer[]> => {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) {
      console.error('Supabase error fetching customers:', error);
      return [];
    }
    return (data as any[])?.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      address: c.address,
      brick: c.brick,
      defaultDiscount: Number(c.default_discount || 0)
    })) || [];
  }
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
};

export const getProviders = async (): Promise<Provider[]> => {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.from('providers').select('*');
    if (error) return [];
    return (data as any[])?.map(p => ({
      id: p.id,
      name: p.name,
      contactInfo: p.contact_info,
      bankDetails: p.bank_details
    })) || [];
  }
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROVIDERS) || '[]');
};

export const getOrders = async (): Promise<Order[]> => {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) {
      console.error('Supabase error fetching orders:', error);
      return [];
    }
    return (data as any[])?.map(o => ({
      ...o,
      totalAmount: Number(o.total_amount), 
      paidAmount: Number(o.paid_amount),
      customerName: o.customer_name,
      customerId: o.customer_id,
      // Check column if exists, otherwise fallback to status
      isDraft: !!(o.is_draft || o.status === OrderStatus.DRAFT),
      // Check column if exists, OR check status, OR check metadata
      isReturn: !!(o.is_return || o.status === OrderStatus.RETURNED || o.draft_metadata?.isReturn),
      draftMetadata: o.draft_metadata
    })) || [];
  }
  
  const localOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
  // Ensure consistency for LocalStorage
  return localOrders.map((o: any) => ({
    ...o,
    isDraft: !!(o.isDraft || o.status === OrderStatus.DRAFT),
    isReturn: !!o.isReturn
  }));
};

export const getOrder = async (orderId: string): Promise<Order | null> => {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (error || !data) return null;
    return {
      ...data,
      totalAmount: Number(data.total_amount),
      paidAmount: Number(data.paid_amount),
      customerName: data.customer_name,
      customerId: data.customer_id,
      isDraft: !!(data.is_draft || data.status === OrderStatus.DRAFT),
      isReturn: !!(data.is_return || data.status === OrderStatus.RETURNED || data.draft_metadata?.isReturn),
      draftMetadata: data.draft_metadata
    };
  } else {
    const orders = await getOrders();
    return orders.find(o => o.id === orderId) || null;
  }
};

export const getTransactions = async (): Promise<Transaction[]> => {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.from('transactions').select('*');
    if (error) {
      console.error('Supabase error fetching transactions:', error);
      return [];
    }
    return (data as any[])?.map(t => ({
      ...t,
      amount: Number(t.amount),
      referenceId: t.reference_id,
      paymentMethod: t.payment_method,
      providerId: t.provider_id,
      providerName: t.provider_name,
      metadata: t.metadata
    })) || [];
  }
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
};

// --- ACTIONS ---

export const saveOrder = async (order: Order) => {
  if (isSupabaseEnabled && supabase) {
    // Construct DB object but avoid sending 'is_return' column if schema lacks it
    // We store 'isReturn' status inside 'draft_metadata' JSON as a fallback
    const dbOrder: any = {
      id: order.id,
      customer_id: order.customerId,
      customer_name: order.customerName,
      date: order.date,
      items: order.items, 
      total_amount: order.totalAmount,
      paid_amount: order.paidAmount,
      status: order.status,
      notes: order.notes,
      is_draft: order.isDraft || false,
      // Remove direct mapping to avoid schema error: 
      // is_return: order.isReturn || false, 
      draft_metadata: {
        ...order.draftMetadata,
        isReturn: order.isReturn // Persist here for safety
      }
    };
    
    const { error } = await supabase.from('orders').upsert(dbOrder);
    if (error) throw error;

    // Handle Stock Updates
    if (!order.isDraft) {
      for (const item of order.items) {
         // Force number type conversion
         const qty = Number(item.quantity) + Number(item.bonusQuantity || 0);
         let stockChange = 0;

         if (order.isReturn) {
            // If returning GOOD stock, we add it back.
            // If returning EXPIRED stock, we do not add it back (it is discarded).
            if (item.condition !== 'EXPIRED') {
              stockChange = qty; // Add back
            }
         } else {
            // Normal Sale: Reduce Stock
            stockChange = -qty;
         }

         if (stockChange !== 0) {
           const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
           if (prod) {
             const newStock = Number(prod.stock) + stockChange;
             await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
           }
         }
      }
    }

  } else {
    const orders = await getOrders();
    // Check if exists (upsert logic for local storage)
    const existingIndex = orders.findIndex(o => o.id === order.id);
    if (existingIndex >= 0) {
      orders[existingIndex] = order;
    } else {
      orders.push(order);
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    
    // Handle Stock Updates
    if (!order.isDraft && existingIndex === -1) {
      const products = await getProducts();
      order.items.forEach(item => {
        const pIndex = products.findIndex(p => p.id === item.productId);
        if (pIndex >= 0) {
          const qty = Number(item.quantity) + Number(item.bonusQuantity || 0);
          
          if (order.isReturn) {
             if (item.condition !== 'EXPIRED') {
                products[pIndex].stock += qty;
             }
          } else {
             products[pIndex].stock -= qty;
          }
        }
      });
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }
  }
};

// Specialized function to update only payment status and items paidQuantity WITHOUT triggering stock changes
export const updateOrderPaidStatus = async (order: Order) => {
  if (isSupabaseEnabled && supabase) {
    const dbOrder = {
      paid_amount: order.paidAmount,
      status: order.status,
      items: order.items // Contains updated paidQuantity
    };
    const { error } = await supabase.from('orders').update(dbOrder).eq('id', order.id);
    if (error) throw error;
  } else {
    const orders = await getOrders();
    const index = orders.findIndex(o => o.id === order.id);
    if (index !== -1) {
      orders[index].paidAmount = order.paidAmount;
      orders[index].status = order.status;
      orders[index].items = order.items;
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    }
  }
};

export const updateOrder = async (order: Order) => {
  if (isSupabaseEnabled && supabase) {
    // 1. Fetch current (old) order to handle stock reversal
    const { data: oldData } = await supabase.from('orders').select('*').eq('id', order.id).single();
    
    // Revert Stock for Old Data if it wasn't a draft
    if (oldData) {
      const oldIsDraft = oldData.is_draft || oldData.status === OrderStatus.DRAFT;
      const oldIsReturn = !!(oldData.is_return || oldData.status === OrderStatus.RETURNED || oldData.draft_metadata?.isReturn);
      
      if (!oldIsDraft && oldData.items) {
        const oldItems = oldData.items as any[];
        for (const item of oldItems) {
           const qty = Number(item.quantity) + Number(item.bonusQuantity || 0);
           let stockChange = 0;

           if (oldIsReturn) {
              // Revert Return: If it was GOOD, we added stock. Now we subtract it.
              if (item.condition !== 'EXPIRED') {
                 stockChange = -qty;
              }
           } else {
              // Revert Sale: We subtracted stock. Now we add it back.
              stockChange = qty;
           }

           if (stockChange !== 0) {
             const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
             if (prod) {
               const newStock = Number(prod.stock) + stockChange;
               await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
             }
           }
        }
      }
    }

    // 2. Update Order Record
    const dbOrder = {
      customer_id: order.customerId,
      customer_name: order.customerName,
      date: order.date,
      items: order.items,
      total_amount: order.totalAmount,
      notes: order.notes,
      paid_amount: order.paidAmount,
      status: order.status,
      is_draft: order.isDraft,
      // REMOVED: is_return: order.isReturn,
      draft_metadata: {
        ...order.draftMetadata,
        isReturn: order.isReturn
      }
    };
    const { error } = await supabase.from('orders').update(dbOrder).eq('id', order.id);
    if (error) throw error;

    // 3. Apply New Stock if not draft
    if (!order.isDraft) {
      for (const item of order.items) {
         const qty = Number(item.quantity) + Number(item.bonusQuantity || 0);
         let stockChange = 0;

         if (order.isReturn) {
            // Apply Return: Add stock if GOOD
            if (item.condition !== 'EXPIRED') {
              stockChange = qty; 
            }
         } else {
            // Apply Sale: Deduct stock
            stockChange = -qty;
         }

         if (stockChange !== 0) {
           const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
           if (prod) {
             const newStock = Number(prod.stock) + stockChange;
             await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
           }
         }
      }
    }

  } else {
    // Local Storage Logic
    const orders = await getOrders();
    const index = orders.findIndex(o => o.id === order.id);
    if (index === -1) throw new Error("Order not found");
    const oldOrder = orders[index];
    
    let products = await getProducts();

    // Revert Old Stock
    if (!oldOrder.isDraft) {
      oldOrder.items.forEach(item => {
        const pIndex = products.findIndex(p => p.id === item.productId);
        if (pIndex >= 0) {
           const qty = Number(item.quantity) + Number(item.bonusQuantity || 0);
           if (oldOrder.isReturn) {
             // Revert Return
             if (item.condition !== 'EXPIRED') {
                products[pIndex].stock -= qty;
             }
           } else {
             // Revert Sale
             products[pIndex].stock += qty;
           }
        }
      });
    }

    // Apply New Stock
    if (!order.isDraft) {
      order.items.forEach(item => {
        const pIndex = products.findIndex(p => p.id === item.productId);
        if (pIndex >= 0) {
           const qty = Number(item.quantity) + Number(item.bonusQuantity || 0);
           if (order.isReturn) {
             // Apply Return
             if (item.condition !== 'EXPIRED') {
                products[pIndex].stock += qty;
             }
           } else {
             // Apply Sale
             products[pIndex].stock -= qty;
           }
        }
      });
    }

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    orders[index] = { ...orders[index], ...order };
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }
};

export const deleteOrder = async (orderId: string) => {
  if (isSupabaseEnabled && supabase) {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (order) {
      // Restore/Adjust stock logic
      const isDraft = order.is_draft || order.status === OrderStatus.DRAFT;
      const isReturn = !!(order.is_return || order.status === OrderStatus.RETURNED || order.draft_metadata?.isReturn);

      if (!isDraft && order.items) {
        const items = order.items as any[];
        for (const item of items) {
           const qty = Number(item.quantity) + Number(item.bonusQuantity || 0);
           let stockChange = 0;

           if (isReturn) {
              // If we are deleting a return, we must REVERSE the action.
              // If it was GOOD, we added stock. So now we subtract it.
              // If it was EXPIRED, we did nothing. So now we do nothing.
              if (item.condition !== 'EXPIRED') {
                 stockChange = -qty;
              }
           } else {
              // If deleting a sale, we put stock back.
              stockChange = qty;
           }

           if (stockChange !== 0) {
              const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
              if (prod) {
                const newStock = Number(prod.stock) + stockChange;
                await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
              }
           }
        }
      }
    }
    await supabase.from('transactions').delete().eq('reference_id', orderId);
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) throw error;
  } else {
    let orders = await getOrders();
    const orderToDelete = orders.find(o => o.id === orderId);
    
    if (orderToDelete) {
      // Stock Adjustment
      if (!orderToDelete.isDraft) {
        let products = await getProducts();
        orderToDelete.items.forEach(item => {
          const pIndex = products.findIndex(p => p.id === item.productId);
          if (pIndex >= 0) {
             const qty = Number(item.quantity) + Number(item.bonusQuantity || 0);
             if (orderToDelete.isReturn) {
               // Reverse return: Take back stock if it was good
               if (item.condition !== 'EXPIRED') {
                  products[pIndex].stock -= qty;
               }
             } else {
               // Reverse sale: Add back stock
               products[pIndex].stock += qty;
             }
          }
        });
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      }
    }
    let transactions = await getTransactions();
    transactions = transactions.filter(t => t.referenceId !== orderId);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    orders = orders.filter(o => o.id !== orderId);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }
};

export const addTransaction = async (transaction: Transaction) => {
  if (isSupabaseEnabled && supabase) {
     const dbTxn = {
       id: transaction.id,
       type: transaction.type,
       amount: transaction.amount,
       date: transaction.date,
       reference_id: transaction.referenceId,
       description: transaction.description,
       payment_method: transaction.paymentMethod,
       provider_id: transaction.providerId || null,
       provider_name: transaction.providerName,
       // REMOVED metadata to fix error if column missing in DB schema.
       // The 'skipOrderUpdate' logic below uses the function argument 'transaction', not dbTxn, so it still works.
     };
     const { error } = await supabase.from('transactions').insert(dbTxn);
     if (error) throw error;

     // Check if we should skip updating order status (handled externally)
     const shouldUpdateOrder = !transaction.metadata?.skipOrderUpdate;

     if (shouldUpdateOrder && transaction.type === TransactionType.PAYMENT_RECEIVED && transaction.referenceId) {
        const { data: order } = await supabase.from('orders').select('*').eq('id', transaction.referenceId).single();
        if (order) {
           const newPaid = (Number(order.paid_amount) || 0) + transaction.amount;
           let newStatus = order.status;
           
           const isReturn = !!(order.is_return || order.status === OrderStatus.RETURNED || order.draft_metadata?.isReturn);

           if (!isReturn) {
             if (newPaid >= Number(order.total_amount)) newStatus = OrderStatus.PAID;
             else if (newPaid > 0) newStatus = OrderStatus.PARTIAL;
           }
           await supabase.from('orders').update({ paid_amount: newPaid, status: newStatus }).eq('id', transaction.referenceId);
        }
     }
  } else {
    const transactions = await getTransactions();
    transactions.push(transaction);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    
    // Check if we should skip updating order status
    const shouldUpdateOrder = !transaction.metadata?.skipOrderUpdate;

    if (shouldUpdateOrder && transaction.type === TransactionType.PAYMENT_RECEIVED && transaction.referenceId) {
      const orders = await getOrders();
      const orderIndex = orders.findIndex(o => o.id === transaction.referenceId);
      if (orderIndex >= 0) {
        const order = orders[orderIndex];
        order.paidAmount += transaction.amount;
        if (!order.isReturn) {
          if (order.paidAmount >= order.totalAmount) {
            order.status = OrderStatus.PAID;
          } else if (order.paidAmount > 0) {
            order.status = OrderStatus.PARTIAL;
          }
        }
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      }
    }
  }
};

export const updateTransaction = async (transaction: Transaction) => {
  // Logic to handle potential stock updates if the transaction is an inventory purchase being edited
  const oldTransactions = await getTransactions();
  const oldTxn = oldTransactions.find(t => t.id === transaction.id);
  
  // If editing an Expense that has metadata (Stock purchase), check if quantity changed
  if (oldTxn && oldTxn.type === TransactionType.EXPENSE && oldTxn.metadata?.quantity !== undefined && transaction.metadata?.quantity !== undefined && oldTxn.referenceId === transaction.referenceId) {
     const oldQty = Number(oldTxn.metadata.quantity);
     const newQty = Number(transaction.metadata.quantity);
     const diff = newQty - oldQty;
     
     if (diff !== 0) {
        const products = await getProducts();
        const product = products.find(p => p.id === transaction.referenceId);
        if (product) {
           product.stock += diff; // Add diff (e.g. 5 to 7 = +2)
           await updateProduct(product);
        }
     }
  }

  // Handle Payment RECEIVED Updates (Affects Order Balance)
  if (oldTxn && oldTxn.type === TransactionType.PAYMENT_RECEIVED && oldTxn.referenceId && oldTxn.amount !== transaction.amount) {
     const orders = await getOrders();
     const order = orders.find(o => o.id === oldTxn.referenceId);
     if (order) {
        const diff = transaction.amount - oldTxn.amount;
        const newPaid = (order.paidAmount || 0) + diff;
        
        // Recalculate status
        let newStatus = order.status;
        if (!order.isReturn) {
             if (newPaid >= order.totalAmount) newStatus = OrderStatus.PAID;
             else if (newPaid > 0) newStatus = OrderStatus.PARTIAL;
             else newStatus = OrderStatus.PENDING;
        }

        if (isSupabaseEnabled && supabase) {
            await supabase.from('orders').update({ paid_amount: newPaid, status: newStatus }).eq('id', order.id);
        } else {
             const idx = orders.findIndex(o => o.id === order.id);
             if (idx >= 0) {
                 orders[idx].paidAmount = newPaid;
                 orders[idx].status = newStatus;
                 localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
             }
        }
     }
  }

  if (isSupabaseEnabled && supabase) {
    const dbTxn = {
      amount: transaction.amount,
      date: transaction.date,
      description: transaction.description,
      payment_method: transaction.paymentMethod,
      provider_id: transaction.providerId,
      provider_name: transaction.providerName,
      // REMOVED metadata to prevent error
    };
    const { error } = await supabase.from('transactions').update(dbTxn).eq('id', transaction.id);
    if(error) throw error;
  } else {
    const transactions = await getTransactions();
    const index = transactions.findIndex(t => t.id === transaction.id);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...transaction };
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    }
  }
}

export const deleteTransaction = async (transactionId: string) => {
  // Fetch transaction details first to handle logic
  const allTxns = await getTransactions();
  const txn = allTxns.find(t => t.id === transactionId);

  if (!txn) return; // Transaction not found

  // Special Logic for Inventory Purchase Reversal (Delete Stock)
  if (txn.type === TransactionType.EXPENSE && txn.referenceId) {
     const products = await getProducts();
     const product = products.find(p => p.id === txn.referenceId);
     
     if (product) {
       let qty = 0;
       if (txn.metadata && txn.metadata.quantity) {
          qty = Number(txn.metadata.quantity);
       } else {
          // Fallback: try to parse legacy description "Stock Purchase: 10x Product Name"
          const match = txn.description.match(/Stock Purchase: (\d+)x/);
          if (match && match[1]) {
             qty = parseInt(match[1]);
          }
       }
       
       if (qty > 0) {
          // Revert stock (subtract what was bought)
          product.stock -= qty;
          await updateProduct(product);
       }
     }
  }

  // Handle Payment Reversal for Orders
  if (txn.type === TransactionType.PAYMENT_RECEIVED && txn.referenceId) {
     const orders = await getOrders();
     // Use local find because getOrders handles data mapping
     const order = orders.find(o => o.id === txn.referenceId);
     
     if (order) {
        const newPaid = (order.paidAmount || 0) - txn.amount;
        let newStatus = order.status;
        if (!order.isReturn) {
           newStatus = OrderStatus.PENDING;
           if (newPaid >= order.totalAmount) newStatus = OrderStatus.PAID;
           else if (newPaid > 0) newStatus = OrderStatus.PARTIAL;
        }

        // Revert paid quantities on items (Critical Fix)
        let itemsChanged = false;
        if (order.items && order.items.length > 0) {
            // Strategy 1: Metadata (New way)
            if (txn.metadata && txn.metadata.paidItems) {
                const paidItems = txn.metadata.paidItems as { productId: string, quantity: number }[];
                paidItems.forEach(pItem => {
                   const itemIndex = order.items.findIndex(i => i.productId === pItem.productId);
                   if (itemIndex >= 0) {
                       const currentPaid = order.items[itemIndex].paidQuantity || 0;
                       order.items[itemIndex].paidQuantity = Math.max(0, currentPaid - pItem.quantity);
                       itemsChanged = true;
                   }
                });
            } 
            // Strategy 2: Description Parsing (Legacy way)
            else if (txn.description.startsWith('Payment for:')) {
                 const details = txn.description.replace('Payment for: ', '');
                 const parts = details.split(', ');
                 parts.forEach(part => {
                     // Regex to match "5x Product Name" or "10x Some Product"
                     const match = part.match(/^(\d+)x (.+)$/);
                     if (match) {
                         const qty = parseInt(match[1]);
                         const name = match[2];
                         // Find by name (Best effort for legacy data)
                         const itemIndex = order.items.findIndex(i => i.productName === name);
                         if (itemIndex >= 0) {
                             const currentPaid = order.items[itemIndex].paidQuantity || 0;
                             order.items[itemIndex].paidQuantity = Math.max(0, currentPaid - qty);
                             itemsChanged = true;
                         }
                     }
                 });
            }
        }
        
        // Use updateOrderPaidStatus equivalent logic to update DB
        // We modify the order object locally above (order.items changed in place)
        const updatedOrder = {
          ...order,
          paidAmount: newPaid,
          status: newStatus
          // items are already modified
        };
        await updateOrderPaidStatus(updatedOrder);
     }
  }

  // Finally delete the transaction record
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (error) throw error;
  } else {
    let transactions = await getTransactions();
    transactions = transactions.filter(t => t.id !== transactionId);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }
};

export const addProvider = async (provider: Provider) => {
  if (isSupabaseEnabled && supabase) {
    const dbProv = {
      id: provider.id,
      name: provider.name,
      contact_info: provider.contactInfo,
      bank_details: provider.bankDetails
    };
    const { error } = await supabase.from('providers').insert(dbProv);
    if (error) throw error;
  } else {
    const providers = await getProviders();
    providers.push(provider);
    localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));
  }
};

export const updateProvider = async (provider: Provider) => {
  if (isSupabaseEnabled && supabase) {
    const dbProv = {
      name: provider.name,
      contact_info: provider.contactInfo,
      bank_details: provider.bankDetails
    };
    const { error } = await supabase.from('providers').update(dbProv).eq('id', provider.id);
    if (error) throw error;
  } else {
    const providers = await getProviders();
    const index = providers.findIndex(p => p.id === provider.id);
    if (index !== -1) {
      providers[index] = provider;
      localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));
    }
  }
};

export const deleteProvider = async (providerId: string) => {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('providers').delete().eq('id', providerId);
    if (error) throw error;
  } else {
    let providers = await getProviders();
    providers = providers.filter(p => p.id !== providerId);
    localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));
  }
};

export const addProduct = async (product: Product) => {
  if (isSupabaseEnabled && supabase) {
    const dbProd = {
      id: product.id,
      name: product.name,
      base_price: product.basePrice,
      stock: product.stock
    };
    const { error } = await supabase.from('products').insert(dbProd);
    if (error) throw error;
  } else {
    const products = await getProducts();
    products.push(product);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }
};

export const updateProduct = async (product: Product) => {
  if (isSupabaseEnabled && supabase) {
     const dbProd = {
      name: product.name,
      base_price: product.basePrice,
      stock: product.stock
    };
    const { error } = await supabase.from('products').update(dbProd).eq('id', product.id);
    if (error) throw error;
  } else {
    const products = await getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      products[index] = product;
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }
  }
};

export const restockProduct = async (
  productId: string, 
  quantity: number, 
  cost: number, 
  providerId: string, 
  providerName: string, 
  method: PaymentMethod, 
  date: string,
  description?: string
) => {
  const products = await getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) throw new Error("Product not found");

  product.stock += quantity;
  await updateProduct(product);

  const expense: Transaction = {
    id: `TXN-${Date.now()}`,
    type: TransactionType.EXPENSE,
    amount: cost,
    date: date,
    referenceId: productId,
    description: description || `Stock Purchase: ${quantity}x ${product.name}`,
    paymentMethod: method,
    providerId: providerId,
    providerName: providerName,
    // Add metadata to easily track quantity for deletion/editing later
    metadata: {
       quantity: quantity,
       productId: productId
    }
  };

  await addTransaction(expense);
};

export const addCustomer = async (customer: Customer) => {
  if (isSupabaseEnabled && supabase) {
    const dbCustomer = {
      id: customer.id,
      name: customer.name,
      type: customer.type,
      address: customer.address || null, 
      brick: customer.brick || null,     
      default_discount: customer.defaultDiscount || 0
    };
    const { error } = await supabase.from('customers').insert(dbCustomer);
    if (error) throw error;
  } else {
    const customers = await getCustomers();
    customers.push(customer);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }
};

export const updateCustomer = async (customer: Customer) => {
  if (isSupabaseEnabled && supabase) {
    const dbCustomer = {
      name: customer.name,
      type: customer.type,
      address: customer.address || null,
      brick: customer.brick || null,
      default_discount: customer.defaultDiscount || 0
    };
    const { error } = await supabase.from('customers').update(dbCustomer).eq('id', customer.id);
    if (error) throw error;
  } else {
    const customers = await getCustomers();
    const index = customers.findIndex(c => c.id === customer.id);
    if (index !== -1) {
      customers[index] = customer;
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    } else {
      throw new Error("Customer not found locally");
    }
  }
};

export const deleteCustomer = async (customerId: string) => {
  if (isSupabaseEnabled && supabase) {
    const { data: orders, error: orderError } = await supabase.from('orders').select('id').eq('customer_id', customerId);
    if (orderError) throw orderError;
    const orderIds = orders?.map(o => o.id) || [];
    if (orderIds.length > 0) {
      await supabase.from('transactions').delete().in('reference_id', orderIds);
      await supabase.from('orders').delete().in('id', orderIds);
    }
    const { error: delCustomerError } = await supabase.from('customers').delete().eq('id', customerId);
    if (delCustomerError) throw delCustomerError;
  } else {
    let orders = await getOrders();
    const customerOrders = orders.filter(o => o.customerId === customerId);
    const customerOrderIds = customerOrders.map(o => o.id);

    let transactions = await getTransactions();
    transactions = transactions.filter(t => !t.referenceId || !customerOrderIds.includes(t.referenceId));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));

    orders = orders.filter(o => o.customerId !== customerId);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    let customers = await getCustomers();
    customers = customers.filter(c => c.id !== customerId);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }
};

// --- STATS ---

export const getFinancialStats = async () => {
  const transactions = await getTransactions();
  let repCashOnHand = 0;
  let transferredToHQ = 0;
  let totalCollected = 0;
  let totalExpenses = 0;

  transactions.forEach(t => {
    if (t.type === TransactionType.PAYMENT_RECEIVED) {
      repCashOnHand += t.amount;
      totalCollected += t.amount;
    } else if (t.type === TransactionType.DEPOSIT_TO_HQ) {
      if (!t.paymentMethod || t.paymentMethod === PaymentMethod.CASH) {
        repCashOnHand -= t.amount;
      }
      transferredToHQ += t.amount;
    } else if (t.type === TransactionType.EXPENSE) {
       totalExpenses += t.amount;
       if (t.paymentMethod === PaymentMethod.CASH) {
          repCashOnHand -= t.amount;
       } else if (t.paymentMethod === PaymentMethod.BANK_TRANSFER) {
          transferredToHQ -= t.amount; // Use HQ funds for expense
       }
    }
  });

  const orders = await getOrders();
  const activeOrders = orders.filter(o => !o.isDraft && o.status !== OrderStatus.DRAFT);
  const totalSales = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return { repCashOnHand, transferredToHQ, totalCollected, totalSales, totalExpenses };
};