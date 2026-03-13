// src/context/AppDataContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService } from '../services/core/authService';
import { senderService } from '../services/business/senderService';
import { productService } from '../services/business/productService';
import { clientService } from '../services/business/clientService';
import { invoiceService } from '../services/business/invoiceService';
import {
  Sender,
  SenderUpsertInput,
  Product,
  Client,
  Invoice,
  InvoiceType,
  InvoiceStatus,
  CreditNoteReason,
  AuthUser,
} from '../types';

type ToastState = {
  message: string;
  type: 'success' | 'error';
} | null;

type AppDataContextValue = {
  user: AuthUser | null;
  authLoading: boolean;
  dataReady: boolean;
  toast: ToastState;
  isAdmin: boolean;

  senders: Sender[];
  activeSenderId: number | null;
  activeSender: Sender | null;

  products: Product[];
  clients: Client[];
  invoices: Invoice[];

  setToast: React.Dispatch<React.SetStateAction<ToastState>>;
  showToast: (message: string, type?: 'success' | 'error') => void;

  refreshAllData: () => Promise<void>;
  changeSender: (senderId: number) => Promise<void>;

  saveSender: (input: SenderUpsertInput) => Promise<void>;
  deleteSender: (id: number) => Promise<void>;

  saveProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;

  saveClient: (client: Client) => Promise<void>;
  deleteClient: (id: number) => Promise<void>;

  persistInvoice: (invoice: Invoice) => Promise<void>;
  emitCreditNote: (baseInvoice: Invoice, reason: CreditNoteReason) => Promise<void>;

  logout: () => void;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const [senders, setSenders] = useState<Sender[]>([]);
  const [activeSenderId, setActiveSenderId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const isAdmin = user?.role === 'admin';

  const activeSender = useMemo(
    () => senders.find((sender) => sender.id === activeSenderId) || null,
    [senders, activeSenderId]
  );

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type });
      window.setTimeout(() => setToast(null), 3000);
    },
    []
  );

  const loadSenderData = useCallback(async () => {
    const [loadedProducts, loadedClients, loadedInvoices] = await Promise.all([
      productService.getProducts(),
      clientService.getClients(),
      invoiceService.getInvoices(),
    ]);

    setProducts(loadedProducts);
    setClients(loadedClients);
    setInvoices(loadedInvoices);
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      const loadedSenders = isAdmin
        ? await senderService.getSenders()
        : await senderService.getMySender().then((sender) => (sender ? [sender] : []));

      setSenders(loadedSenders);

      if (loadedSenders.length > 0) {
        const nextActiveSenderId =
          activeSenderId && loadedSenders.some((sender) => sender.id === activeSenderId)
            ? activeSenderId
            : loadedSenders[0].id;

        setActiveSenderId(nextActiveSenderId);
        await loadSenderData();
      } else {
        setActiveSenderId(null);
        setProducts([]);
        setClients([]);
        setInvoices([]);
      }

      setDataReady(true);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setDataReady(true);
    }
  }, [activeSenderId, isAdmin, loadSenderData]);

  const changeSender = useCallback(
    async (senderId: number) => {
      setActiveSenderId(senderId);
      const senderName = senders.find((sender) => sender.id === senderId)?.name || '';
      await loadSenderData();
      showToast(`Empresa: ${senderName}`);
    },
    [loadSenderData, senders, showToast]
  );

  const saveSender = useCallback(
    async (input: SenderUpsertInput) => {
      try {
        if (activeSender) {
          await senderService.updateSender(input);
        } else {
          await senderService.createSender(input);
        }

        await refreshAllData();
        showToast('EMPRESA GUARDADA');
      } catch (error: any) {
        console.error('Error guardando sender:', error);
        showToast(error.message || 'ERROR AL GUARDAR', 'error');
      }
    },
    [activeSender, refreshAllData, showToast]
  );

  const deleteSender = useCallback(
    async (id: number) => {
      await senderService.deleteSender();
      await refreshAllData();
      showToast('EMPRESA ELIMINADA');
    },
    [refreshAllData, showToast]
  );

  const saveProduct = useCallback(
    async (product: Product) => {
      try {
        const exists = products.some((current) => current.id === product.id);

        if (exists) {
          await productService.updateProduct(product.id, {
            description: product.description,
            unit: product.unit,
            base_price: product.base_price,
            has_igv: product.has_igv,
          });
        } else {
          await productService.createProduct({
            description: product.description,
            unit: product.unit,
            base_price: product.base_price,
            has_igv: product.has_igv,
          });
        }

        await refreshAllData();
        showToast('PRODUCTO GUARDADO');
      } catch (error: any) {
        showToast(error.message || 'ERROR', 'error');
      }
    },
    [products, refreshAllData, showToast]
  );

  const deleteProduct = useCallback(
    async (id: number) => {
      await productService.deleteProduct(id);
      await refreshAllData();
      showToast('PRODUCTO ELIMINADO');
    },
    [refreshAllData, showToast]
  );

  const saveClient = useCallback(
    async (client: Client) => {
      try {
        const exists = clients.some((current) => current.id === client.id);

        if (exists) {
          await clientService.updateClient(client.id, {
            name: client.name,
            dni: client.dni || undefined,
            ruc: client.ruc || undefined,
            phone: client.phone || undefined,
          });
        } else {
          await clientService.createClient({
            name: client.name,
            dni: client.dni || undefined,
            ruc: client.ruc || undefined,
            phone: client.phone || undefined,
          });
        }

        await refreshAllData();
        showToast('CLIENTE GUARDADO');
      } catch (error: any) {
        showToast(error.message || 'ERROR', 'error');
      }
    },
    [clients, refreshAllData, showToast]
  );

  const deleteClient = useCallback(
    async (id: number) => {
      await clientService.deleteClient(id);
      await refreshAllData();
      showToast('CLIENTE ELIMINADO');
    },
    [refreshAllData, showToast]
  );

  const persistInvoice = useCallback(
    async (invoice: Invoice) => {
      try {
        await invoiceService.createInvoice({
          client_id: invoice.client_id || undefined,
          client_name: invoice.client_name || undefined,
          client_document: invoice.client_document || undefined,
          invoice_type: invoice.invoice_type,
          invoice_date: invoice.invoice_date,
          items: invoice.items.map((item) => ({
            product_id: item.product_id ?? undefined,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            has_igv: item.has_igv,
          })),
        });

        await refreshAllData();
        showToast('DOCUMENTO CREADO');
      } catch (error: any) {
        console.error('Error guardando invoice:', error);
        showToast(error.message || 'ERROR AL GUARDAR', 'error');
      }
    },
    [refreshAllData, showToast]
  );

  const emitCreditNote = useCallback(
    async (baseInvoice: Invoice, reason: CreditNoteReason) => {
      try {
        await invoiceService.createCreditNote(baseInvoice.id, {
          date: new Date().toISOString().split('T')[0],
          reason,
          sustento: `Nota de crédito por motivo: ${reason}`,
        });

        await refreshAllData();
        showToast('NOTA DE CRÉDITO CREADA');
      } catch (error: any) {
        console.error('Error emitiendo Nota de Crédito:', error);
        showToast(`Error: ${error.message}`, 'error');
      }
    },
    [refreshAllData, showToast]
  );

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setSenders([]);
    setProducts([]);
    setClients([]);
    setInvoices([]);
    setActiveSenderId(null);
    setDataReady(false);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const me = await authService.bootstrapSession();
        setUser((me as AuthUser | null) || null);
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    bootstrap();

    const activityEvents: Array<keyof WindowEventMap> = [
      'click',
      'keydown',
      'mousemove',
      'scroll',
    ];

    const touch = () => {
      if (authService.hasSession()) {
        authService.touchActivity();
      }
    };

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, touch, { passive: true })
    );

    return () => {
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, touch)
      );
    };
  }, []);

  useEffect(() => {
    if (user) {
      refreshAllData();
    }
  }, [user, refreshAllData]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      user,
      authLoading,
      dataReady,
      toast,
      isAdmin,

      senders,
      activeSenderId,
      activeSender,

      products,
      clients,
      invoices,

      setToast,
      showToast,

      refreshAllData,
      changeSender,

      saveSender,
      deleteSender,

      saveProduct,
      deleteProduct,

      saveClient,
      deleteClient,

      persistInvoice,
      emitCreditNote,

      logout,
    }),
    [
      user,
      authLoading,
      dataReady,
      toast,
      isAdmin,
      senders,
      activeSenderId,
      activeSender,
      products,
      clients,
      invoices,
      showToast,
      refreshAllData,
      changeSender,
      saveSender,
      deleteSender,
      saveProduct,
      deleteProduct,
      saveClient,
      deleteClient,
      persistInvoice,
      emitCreditNote,
      logout,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = () => {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error('useAppData debe usarse dentro de AppDataProvider');
  }

  return context;
};