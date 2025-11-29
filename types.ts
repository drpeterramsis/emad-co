

export enum CustomerType {
  PHARMACY = 'Pharmacy',
  STORE = 'Store',
  HCP = 'HCP',
  DIRECT = 'Direct Sale'
}

export enum OrderStatus {
  PENDING = 'Pending',
  PARTIAL = 'Partial',
  PAID = 'Paid',
  CANCELLED = 'Cancelled'
}

export enum TransactionType {
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED', // Customer pays Rep
  DEPOSIT_TO_HQ = 'DEPOSIT_TO_HQ', // Rep transfers to Company
  EXPENSE = 'EXPENSE' // Purchasing stock or other expenses
}

export enum PaymentMethod {
  CASH = 'CASH', // Cash from Rep Hand
  BANK_TRANSFER = 'BANK_TRANSFER' // Direct from HQ Bank
}

export interface UserProfile {
  email: string;
  name: string;
  title: string;
}

export interface Provider {
  id: string;
  name: string;
  contactInfo?: string;
  bankDetails?: string; // Account Number, IBAN, etc.
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
  brick?: string; // Area or Brick
  defaultDiscount?: number; // Percentage 0-100
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  bonusQuantity: number; // Bounce/Free goods
  unitPrice: number; // Can be overridden
  discount: number; // Flat amount deduction
  discountPercent?: number; // Percentage deduction
  subtotal: number;
  paidQuantity?: number; // How many units have been paid for
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
  referenceId?: string; // Order ID if payment received, or Product ID if purchase
  description: string;
  paymentMethod?: PaymentMethod;
  providerId?: string;
  providerName?: string;
}

export interface DashboardStats {
  totalSales: number;
  totalCollected: number;
  repCashOnHand: number;
  transferredToHQ: number;
  totalExpenses: number;
}