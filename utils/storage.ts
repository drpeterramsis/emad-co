import { Product, Customer, Order, Transaction, OrderStatus, TransactionType } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS } from '../constants';
import { supabase, isSupabaseEnabled } from '../services/supabaseClient';

const STORAGE_KEYS = {
  PRODUCTS: 'emad_products',
  CUSTOMERS: 'emad_customers',
  ORDERS: 'emad_orders',
  TRANSACTIONS: 'emad_transactions',
};

// Initialize Storage (Seed Supabase or Local Storage if empty)
export const initStorage = async () => {
  if (isSupabaseEnabled && supabase) {
    try {
      // Check if products exist in DB
      const { count: productCount, error: pError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (!pError && productCount === 0) {
        console.log("Seeding Supabase Products...");
        const dbProducts = INITIAL_PRODUCTS.map(p => ({
          id: p.id,
          name: p.name,
          base_price: p.basePrice,
          stock: p.stock
        }));
        await supabase.from('products').insert(dbProducts);
      }

      // Check if customers exist in DB
      const { count: customerCount, error: cError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      if (!cError && customerCount === 0) {
        console.log("Seeding Supabase Customers...");
        const dbCustomers = INITIAL_CUSTOMERS.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          address: c.address,
          brick: c.brick,
          default_discount: c.defaultDiscount
        }));
        await supabase.from('customers').insert(dbCustomers);
      }
    } catch (err) {
      console.error("Error seeding Supabase:", err);
    }
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
      customerId: o.customer_id
    })) || [];
  }
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
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
      customerId: data.customer_id
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
      referenceId: t.reference_id
    })) || [];
  }
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
};

// --- ACTIONS ---

export const saveOrder = async (order: Order) => {
  if (isSupabaseEnabled && supabase) {
    // Map to DB columns
    const dbOrder = {
      id: order.id,
      customer_id: order.customerId,
      customer_name: order.customerName,
      date: order.date,
      items: order.items, // Stored as JSONB
      total_amount: order.totalAmount,
      paid_amount: order.paidAmount,
      status: order.status,
      notes: order.notes
    };
    
    // Upsert Order
    const { error } = await supabase.from('orders').upsert(dbOrder);
    if (error) throw error;

    // Decrease Stock (Quantity + Bonus)
    for (const item of order.items) {
       const totalQty = item.quantity + (item.bonusQuantity || 0);
       const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
       if (prod) {
         await supabase.from('products').update({ stock: prod.stock - totalQty }).eq('id', item.productId);
       }
    }

  } else {
    // Local Storage Fallback
    const orders = await getOrders();
    orders.push(order);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    
    // Update stock
    const products = await getProducts();
    order.items.forEach(item => {
      const pIndex = products.findIndex(p => p.id === item.productId);
      if (pIndex >= 0) {
        // Decrease stock by Sold Qty + Bonus Qty
        products[pIndex].stock -= (item.quantity + (item.bonusQuantity || 0));
      }
    });
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }
};

export const updateOrder = async (order: Order) => {
  if (isSupabaseEnabled && supabase) {
    // 1. Fetch old order to restore stock
    const { data: oldOrder } = await supabase.from('orders').select('*').eq('id', order.id).single();
    
    if (oldOrder && oldOrder.items) {
      // Restore stock from old items
      const oldItems = oldOrder.items as any[];
      for (const item of oldItems) {
         const qtyToRestore = item.quantity + (item.bonusQuantity || 0);
         const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
         if (prod) {
           await supabase.from('products').update({ stock: prod.stock + qtyToRestore }).eq('id', item.productId);
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
      status: order.status
    };
    
    const { error } = await supabase.from('orders').update(dbOrder).eq('id', order.id);
    if (error) throw error;

    // 3. Deduct stock for new items
    for (const item of order.items) {
       const totalQty = item.quantity + (item.bonusQuantity || 0);
       const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
       if (prod) {
         await supabase.from('products').update({ stock: prod.stock - totalQty }).eq('id', item.productId);
       }
    }

  } else {
    // Local Storage Fallback
    const orders = await getOrders();
    const index = orders.findIndex(o => o.id === order.id);
    
    if (index === -1) throw new Error("Order not found");

    const oldOrder = orders[index];
    let products = await getProducts();

    // Restore old stock (qty + bonus)
    oldOrder.items.forEach(item => {
      const pIndex = products.findIndex(p => p.id === item.productId);
      if (pIndex >= 0) products[pIndex].stock += (item.quantity + (item.bonusQuantity || 0));
    });

    // Update order
    orders[index] = { ...oldOrder, ...order };

    // Deduct new stock (qty + bonus)
    order.items.forEach(item => {
      const pIndex = products.findIndex(p => p.id === item.productId);
      if (pIndex >= 0) products[pIndex].stock -= (item.quantity + (item.bonusQuantity || 0));
    });

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }
};

export const deleteOrder = async (orderId: string) => {
  if (isSupabaseEnabled && supabase) {
    // 1. Fetch order to restore stock
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    
    if (order && order.items) {
      // Restore stock
      const items = order.items as any[];
      for (const item of items) {
         const qtyToRestore = item.quantity + (item.bonusQuantity || 0);
         const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
         if (prod) {
           await supabase.from('products').update({ stock: prod.stock + qtyToRestore }).eq('id', item.productId);
         }
      }
    }

    // 2. Delete related transactions
    await supabase.from('transactions').delete().eq('reference_id', orderId);

    // 3. Delete order
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) throw error;

  } else {
    // Local Storage Fallback
    let orders = await getOrders();
    const orderToDelete = orders.find(o => o.id === orderId);
    
    if (orderToDelete) {
      let products = await getProducts();
      // Restore stock
      orderToDelete.items.forEach(item => {
        const pIndex = products.findIndex(p => p.id === item.productId);
        if (pIndex >= 0) products[pIndex].stock += (item.quantity + (item.bonusQuantity || 0));
      });
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }

    // Delete transactions
    let transactions = await getTransactions();
    transactions = transactions.filter(t => t.referenceId !== orderId);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));

    // Delete order
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
       description: transaction.description
     };
     
     const { error } = await supabase.from('transactions').insert(dbTxn);
     if (error) throw error;

     if (transaction.type === TransactionType.PAYMENT_RECEIVED && transaction.referenceId) {
        // Fetch current order to update status
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
    // Local Storage Fallback
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
    // Simple update for details, complex logic not implemented for changing amounts affecting orders deeply
    // This is primarily for Deposit updates
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
      // Revert Order Amount
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
    // Local Storage
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
    if (error) {
      console.error("Supabase Add Customer Error:", error);
      throw error;
    }
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
    const { error } = await supabase
      .from('customers')
      .update(dbCustomer)
      .eq('id', customer.id);
      
    if (error) {
      console.error("Supabase Update Customer Error:", error);
      throw error;
    }
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
    // 1. Get all order IDs for this customer
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', customerId);

    if (orderError) throw orderError;
    
    const orderIds = orders?.map(o => o.id) || [];

    // 2. Delete transactions associated with those orders
    if (orderIds.length > 0) {
      const { error: txnError } = await supabase
        .from('transactions')
        .delete()
        .in('reference_id', orderIds);
      if (txnError) throw txnError;
      
      // 3. Delete orders
      const { error: delOrderError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);
      if (delOrderError) throw delOrderError;
    }

    // 4. Delete customer
    const { error: delCustomerError } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);
    
    if (delCustomerError) throw delCustomerError;

  } else {
    // Local Storage
    let orders = await getOrders();
    const customerOrders = orders.filter(o => o.customerId === customerId);
    const customerOrderIds = customerOrders.map(o => o.id);

    // Delete transactions for these orders
    let transactions = await getTransactions();
    transactions = transactions.filter(t => !t.referenceId || !customerOrderIds.includes(t.referenceId));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));

    // Delete orders
    orders = orders.filter(o => o.customerId !== customerId);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    // Delete customer
    let customers = await getCustomers();
    customers = customers.filter(c => c.id !== customerId);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }
};

export const getFinancialStats = async () => {
  const transactions = await getTransactions();
  let repCashOnHand = 0;
  let transferredToHQ = 0;
  let totalCollected = 0;

  transactions.forEach(t => {
    if (t.type === TransactionType.PAYMENT_RECEIVED) {
      repCashOnHand += t.amount;
      totalCollected += t.amount;
    } else if (t.type === TransactionType.DEPOSIT_TO_HQ) {
      repCashOnHand -= t.amount;
      transferredToHQ += t.amount;
    }
  });

  const orders = await getOrders();
  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return { repCashOnHand, transferredToHQ, totalCollected, totalSales };
};