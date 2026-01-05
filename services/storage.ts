
import { Sender, Product, Client, Invoice } from '../types';

const KEYS = {
  SENDERS: 'factumovil_senders',
  PRODUCTS: 'factumovil_products',
  CLIENTS: 'factumovil_clients',
  INVOICES: 'factumovil_invoices',
  ACTIVE_SENDER_ID: 'factumovil_active_sender'
};

const get = <T,>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const set = <T,>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const StorageService = {
  getSenders: () => get<Sender[]>(KEYS.SENDERS, []),
  setSenders: (data: Sender[]) => set(KEYS.SENDERS, data),
  
  getProducts: () => get<Product[]>(KEYS.PRODUCTS, []),
  setProducts: (data: Product[]) => set(KEYS.PRODUCTS, data),
  
  getClients: () => get<Client[]>(KEYS.CLIENTS, []),
  setClients: (data: Client[]) => set(KEYS.CLIENTS, data),
  
  getInvoices: () => get<Invoice[]>(KEYS.INVOICES, []),
  setInvoices: (data: Invoice[]) => set(KEYS.INVOICES, data),

  getActiveSenderId: () => localStorage.getItem(KEYS.ACTIVE_SENDER_ID),
  setActiveSenderId: (id: string) => localStorage.setItem(KEYS.ACTIVE_SENDER_ID, id),
};
