
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
      // Robust check for draft status: use column if exists, otherwise fallback to status string
      isDraft: o.is_draft || o.status === OrderStatus.DRAFT,
      draftMetadata: o.draft_metadata
    })) || [];
  }
  
  const localOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
  // Ensure consistency for LocalStorage
  return localOrders.map((o: any) => ({
    ...o,
    isDraft: o.isDraft || o.status === OrderStatus.DRAFT
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
      isDraft: data.is_draft || data.status === OrderStatus.DRAFT,
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
      providerName: t.provider_name
    })) || [];
  }
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
};

// --- ACTIONS ---

export const saveOrder = async (order: Order) => {
  if (isSupabaseEnabled && supabase) {
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
      // Ensure we attempt to write draft fields. 
      // NOTE: User must run SQL migration to add 'is_draft' and 'draft_metadata' columns for this to work.
      is_draft: order.isDraft || false,
      draft_metadata: order.draftMetadata
    };
    
    // For Drafts, if customerId is a placeholder, try to avoid FK constraint issues if possible
    // This assumes the DB might have strict constraints. If so, user should ensure a valid customer ID or nullable column.
    
    const { error } = await supabase.from('orders').upsert(dbOrder);
    if (error) throw error;

    // Only update stock if NOT a draft
    if (!order.isDraft) {
      for (const item of order.items) {
         const totalQty = item.quantity + (item.bonusQuantity || 0);
         const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
         if (prod) {
           await supabase.from('products').update({ stock: prod.stock - totalQty }).eq('id', item.productId);
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
    
    // Only update stock if NOT a draft and it's a new order
    if (!order.isDraft && existingIndex === -1) {
      const products = await getProducts();
      order.items.forEach(item => {
        const pIndex = products.findIndex(p => p.id === item.productId);
        if (pIndex >= 0) {
          products[pIndex].stock -= (item.quantity + (item.bonusQuantity || 0));
        }
      });
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }
  }
};

export const updateOrder = async (order: Order) => {
  if (isSupabaseEnabled && supabase) {
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
      draft_metadata: order.draftMetadata
    };
    const { error } = await supabase.from('orders').update(dbOrder).eq('id', order.id);
    if (error) throw error;
  } else {
    const orders = await getOrders();
    const index = orders.findIndex(o => o.id === order.id);
    
    if (index === -1) throw new Error("Order not found");
    
    orders[index] = { ...orders[index], ...order };
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }
};

export const deleteOrder = async (orderId: string) => {
  if (isSupabaseEnabled && supabase) {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (order) {
      // Only restore stock if it wasn't a draft
      // We check both column and status to be safe if column missing
      const isDraft = order.is_draft || order.status === OrderStatus.DRAFT;
      if (!isDraft && order.items) {
        const items = order.items as any[];
        for (const item of items) {
           const qtyToRestore = item.quantity + (item.bonusQuantity || 0);
           const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
           if (prod) {
             await supabase.from('products').update({ stock: prod.stock + qtyToRestore }).eq('id', item.productId);
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
      // Only restore stock if it wasn't a draft
      if (!orderToDelete.isDraft) {
        let products = await getProducts();
        orderToDelete.items.forEach(item => {
          const pIndex = products.findIndex(p => p.id === item.productId);
          if (pIndex >= 0) products[pIndex].stock += (item.quantity + (item.bonusQuantity || 0));
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

// ... existing transactions, providers, product management ...

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
       provider_id: transaction.providerId,
       provider_name: transaction.providerName
     };
     const { error } = await supabase.from('transactions').insert(dbTxn);
     if (error) throw error;
     if (transaction.type === TransactionType.PAYMENT_RECEIVED && transaction.referenceId) {
        const { data: order } = await supabase.from('orders').select('*').eq('id', transaction.referenceId).single();
        if (order) {
           const newPaid = (Number(order.paid_amount) || 0) + transaction.amount;
           let newStatus = order.status;
           if (newPaid >= Number(order.total_amount)) newStatus = OrderStatus.PAID;
           else if (newPaid > 0) newStatus = OrderStatus.PARTIAL;
           await supabase.from('orders').update({ paid_amount: newPaid, status: newStatus }).eq('id', transaction.referenceId);
        }
     }
  } else {
    const transactions = await getTransactions();
    transactions.push(transaction);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    if (transaction.type === TransactionType.PAYMENT_RECEIVED && transaction.referenceId) {
      const orders = await getOrders();
      const orderIndex = orders.findIndex(o => o.id === transaction.referenceId);
      if (orderIndex >= 0) {
        const order = orders[orderIndex];
        order.paidAmount += transaction.amount;
        if (order.paidAmount >= order.totalAmount) {
          order.status = OrderStatus.PAID;
        } else if (order.paidAmount > 0) {
          order.status = OrderStatus.PARTIAL;
        }
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      }
    }
  }
};

export const updateTransaction = async (transaction: Transaction) => {
  if (isSupabaseEnabled && supabase) {
    const dbTxn = {
      amount: transaction.amount,
      date: transaction.date,
      description: transaction.description
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
  if (isSupabaseEnabled && supabase) {
    const { data: txn } = await supabase.from('transactions').select('*').eq('id', transactionId).single();
    if (!txn) return;
    if (txn.type === TransactionType.PAYMENT_RECEIVED && txn.reference_id) {
      const { data: order } = await supabase.from('orders').select('*').eq('id', txn.reference_id).single();
      if (order) {
        const newPaid = Math.max(0, (Number(order.paid_amount) || 0) - Number(txn.amount));
        let newStatus = OrderStatus.PENDING;
        if (newPaid >= Number(order.total_amount)) newStatus = OrderStatus.PAID;
        else if (newPaid > 0) newStatus = OrderStatus.PARTIAL;
        await supabase.from('orders').update({ paid_amount: newPaid, status: newStatus }).eq('id', txn.reference_id);
      }
    }
    const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (error) throw error;
  } else {
    let transactions = await getTransactions();
    const txn = transactions.find(t => t.id === transactionId);
    if (txn && txn.type === TransactionType.PAYMENT_RECEIVED && txn.referenceId) {
      const orders = await getOrders();
      const orderIndex = orders.findIndex(o => o.id === txn.referenceId);
      if (orderIndex >= 0) {
        orders[orderIndex].paidAmount = Math.max(0, orders[orderIndex].paidAmount - txn.amount);
        if (orders[orderIndex].paidAmount >= orders[orderIndex].totalAmount) {
          orders[orderIndex].status = OrderStatus.PAID;
        } else if (orders[orderIndex].paidAmount > 0) {
          orders[orderIndex].status = OrderStatus.PARTIAL;
        } else {
          orders[orderIndex].status = OrderStatus.PENDING;
        }
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      }
    }
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

export const restockProduct = async (productId: string, quantity: number, cost: number, providerId: string, providerName: string, method: PaymentMethod, date: string) => {
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
    description: `Stock Purchase: ${quantity}x ${product.name}`,
    paymentMethod: method,
    providerId: providerId,
    providerName: providerName
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
      repCashOnHand -= t.amount;
      transferredToHQ += t.amount;
    } else if (t.type === TransactionType.EXPENSE) {
       totalExpenses += t.amount;
       if (t.paymentMethod === PaymentMethod.CASH) {
          repCashOnHand -= t.amount;
       }
    }
  });

  const orders = await getOrders();
  // Filter out drafts from sales stats
  // Check using status as well, in case isDraft is undefined due to missing schema
  const activeOrders = orders.filter(o => !o.isDraft && o.status !== OrderStatus.DRAFT);
  const totalSales = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return { repCashOnHand, transferredToHQ, totalCollected, totalSales, totalExpenses };
};
