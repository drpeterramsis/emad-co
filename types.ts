export enum CustomerType {
  PHARMACY = 'Pharmacy',
  STORE = 'Store',
  DIRECT = 'Direct Customer'
}

export enum OrderStatus {
  PENDING = 'Pending',
  PARTIAL = 'Partial',
  PAID = 'Paid',
  CANCELLED = 'Cancelled'
}

export enum TransactionType {
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED', // Customer pays Rep
  DEPOSIT_TO_HQ = 'DEPOSIT_TO_HQ' // Rep transfers to Company
}

export interface Product {
  id: string;
  name: string;
  basePrice: number;
  stock: number;
}

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  email?: string;
  address?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // Can be overridden
  discount: number; // Percentage or flat amount logic handled in component, stored as final deduction
  subtotal: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  date: string; // ISO date
  items: OrderItem[];
  totalAmount: number;
  paidAmount: number; // How much has been collected so far
  status: OrderStatus;
  notes?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  referenceId?: string; // Order ID if payment received
  description: string;
}

export interface DashboardStats {
  totalSales: number;
  totalCollected: number;
  repCashOnHand: number;
  transferredToHQ: number;
}