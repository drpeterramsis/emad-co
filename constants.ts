
import { Product, Customer, CustomerType, UserProfile } from './types';

export const AUTHORIZED_USERS: UserProfile[] = [
  { email: 'emad@emadco.com', name: 'Dr. Emad Ibrahem', title: 'Co-Founder and CEO' },
  { email: 'admin@emadco.com', name: 'System Admin', title: 'Administrator' },
  { email: 'sales@emadco.com', name: 'Sales Representative', title: 'Sales Team' },
  { email: 'manager@emadco.com', name: 'Inventory Manager', title: 'Logistics' }
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Colitra Plus (new)Tab', basePrice: 200, stock: 1000 },
  { id: 'p2', name: 'Colitra Plus Tab (Strips) 280', basePrice: 280, stock: 500 },
  { id: 'p3', name: 'Colitra Plus Tab', basePrice: 170, stock: 800 },
  { id: 'p4', name: 'Colitra Sach', basePrice: 140, stock: 1200 },
  { id: 'p5', name: 'Rolltron Cream', basePrice: 50, stock: 300 },
  { id: 'p6', name: 'Colitra Sach (new) 170', basePrice: 170, stock: 600 },
  { id: 'p7', name: 'Rolltron Cream 55', basePrice: 55, stock: 200 },
  { id: 'p8', name: 'Rolltron Cream 60', basePrice: 60, stock: 200 },
  { id: 'p9', name: 'Rolltron Cream 65', basePrice: 65, stock: 150 },
  { id: 'p10', name: 'Rolltron Cream 75', basePrice: 75, stock: 150 },
  { id: 'p11', name: 'Trafitz Tab', basePrice: 140, stock: 900 },
  { id: 'p12', name: 'Colitra Plus Tab (Strips) 345', basePrice: 345, stock: 400 },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Al-Amal Pharmacy', type: CustomerType.PHARMACY, address: 'Downtown St.', brick: 'Downtown', defaultDiscount: 0 },
  { id: 'c2', name: 'Care Store', type: CustomerType.STORE, address: 'Market District', brick: 'Market', defaultDiscount: 0 },
  { id: 'c3', name: 'Dr. John Doe', type: CustomerType.DIRECT, address: 'Private Clinic', brick: 'Uptown', defaultDiscount: 0 },
  { id: 'c4', name: 'City Central Pharmacy', type: CustomerType.PHARMACY, address: 'Main Blvd', brick: 'Central', defaultDiscount: 5 },
];