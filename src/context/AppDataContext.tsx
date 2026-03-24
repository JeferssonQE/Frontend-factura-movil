import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { authService } from '../services/core/authService';
import { senderService } from '../services/business/senderService';
import { productsService } from '../services/business/productsService';
import { clientsService } from '../services/business/clientsService';
import { invoiceService } from '../services/business/invoiceService';
import { contadorService } from '../services/business/contadorService';
import {
  Sender,
  SenderUpsertInput,
  Product,
  Client,
  Invoice,
  CreditNoteReason,
  AuthUser,
  UserRole,
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
  isContador: boolean;

  login: (email: string, password: string) => Promise<void>;

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
  selectSenderAsContador: (senderId: number, empresaSenders?: Sender[]) => Promise<void>;

  saveSender: (input: SenderUpsertInput) => Promise<void>;
  deleteSender: (id: number) => Promise<void>;

  saveProduct: (product: Product) => Promise<void>;
  saveProductSilent: (product: Product) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;

  saveClient: (client: Client) => Promise<void>;
  deleteClient: (id: number) => Promise<void>;

  persistInvoice: (invoice: Invoice) => Promise<Invoice | null>;
  saveDraft: (invoice: Invoice) => Promise<Invoice | null>;
  emitDraft: (invoiceId: number) => Promise<void>;
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

  const activeSenderIdRef = useRef<number | null>(null);
  useEffect(() => {
    activeSenderIdRef.current = activeSenderId;
  }, [activeSenderId]);

  const isAdmin = user?.role === UserRole.ADMIN;
  const isContador = user?.role === UserRole.CONTADOR;

  const activeSender = useMemo(
    () => senders.find((sender) => sender.id === activeSenderId) ?? null,
    [senders, activeSenderId]
  );

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type });
      window.setTimeout(() => setToast(null), 3000);
    },
    []
  );

  const loadSenderData = useCallback(async (senderId?: number) => {
    const [loadedProducts, loadedClients, loadedInvoices] = await Promise.all([
      productsService.getProducts(senderId),
      clientsService.getClients(senderId),
      invoiceService.getInvoices(undefined, senderId),
    ]);

    setProducts(loadedProducts);
    setClients(loadedClients);
    setInvoices(loadedInvoices);
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      if (user?.role === UserRole.CONTADOR || user?.role === UserRole.ADMIN) {
        const current = activeSenderIdRef.current;
        if (current) {
          await loadSenderData(current);
        } else {
          setProducts([]);
          setClients([]);
          setInvoices([]);
        }
      } else {
        const sender = await senderService.getSender();
        const loadedSenders = sender ? [sender] : [];
        setSenders(loadedSenders);

        if (loadedSenders.length > 0) {
          const nextActiveSenderId = loadedSenders[0].id;
          setActiveSenderId(nextActiveSenderId);
          await loadSenderData();
        } else {
          setActiveSenderId(null);
          setProducts([]);
          setClients([]);
          setInvoices([]);
        }
      }

      setDataReady(true);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setDataReady(true);
    }
  }, [loadSenderData, user?.role]);

  const selectSenderAsContador = useCallback(
    async (senderId: number, empresaSenders?: Sender[]) => {
      if (empresaSenders) setSenders(empresaSenders);
      setActiveSenderId(senderId);
      await loadSenderData(senderId);
      const pool = empresaSenders ?? senders;
      const name = pool.find((s) => s.id === senderId)?.name ?? '';
      showToast(`Operando como: ${name}`);
    },
    [loadSenderData, senders, showToast]
  );

  const changeSender = useCallback(
    async (senderId: number) => {
      setActiveSenderId(senderId);
      const senderName = senders.find((sender) => sender.id === senderId)?.name ?? '';
      await loadSenderData(isContador ? senderId : undefined);
      showToast(`Empresa: ${senderName}`);
    },
    [loadSenderData, senders, showToast, isContador]
  );

  const saveSender = useCallback(
    async (input: SenderUpsertInput) => {
      if (isContador) {
        if (!activeSender) return;
        await contadorService.updateSender(activeSender.id, {
          name: input.name,
          ruc: input.ruc,
          sunat_user: input.sunat_user,
          sunat_pass: input.sunat_pass,
        });
      } else if (activeSender) {
        await senderService.updateSender(input);
      } else {
        await senderService.createSender(input);
      }

      await refreshAllData();
      showToast('CREDENCIALES GUARDADAS');
    },
    [activeSender, isContador, refreshAllData, showToast]
  );

  const deleteSender = useCallback(
    async (_id: number) => {
      await senderService.deleteSender();
      await refreshAllData();
      showToast('EMPRESA ELIMINADA');
    },
    [refreshAllData, showToast]
  );

  const saveProduct = useCallback(
    async (product: Product) => {
      try {
        const senderId = isContador ? activeSenderIdRef.current ?? undefined : undefined;
        const exists = products.some((current) => current.id === product.id);

        if (exists) {
          await productsService.updateProduct(
            product.id,
            {
              description: product.description,
              unit: product.unit,
              base_price: product.base_price,
              has_igv: product.has_igv,
            },
            senderId
          );
        } else {
          await productsService.createProduct(
            {
              description: product.description,
              unit: product.unit,
              base_price: product.base_price,
              has_igv: product.has_igv,
            },
            senderId
          );
        }

        await refreshAllData();
        showToast('PRODUCTO GUARDADO');
      } catch (error: any) {
        showToast(error.message || 'ERROR', 'error');
      }
    },
    [products, refreshAllData, showToast, isContador]
  );

  const saveProductSilent = useCallback(
    async (product: Product) => {
      try {
        const senderId = isContador ? activeSenderIdRef.current ?? undefined : undefined;
        const exists = products.some((current) => current.id === product.id);

        if (exists) {
          await productsService.updateProduct(
            product.id,
            {
              description: product.description,
              unit: product.unit,
              base_price: product.base_price,
              has_igv: product.has_igv,
            },
            senderId
          );
        } else {
          await productsService.createProduct(
            {
              description: product.description,
              unit: product.unit,
              base_price: product.base_price,
              has_igv: product.has_igv,
            },
            senderId
          );
        }
      } catch {
        // silencioso — no interrumpe el flujo de emisión
      }
    },
    [products, isContador]
  );

  const deleteProduct = useCallback(
    async (id: number) => {
      const senderId = isContador ? activeSenderIdRef.current ?? undefined : undefined;
      await productsService.deleteProduct(id, senderId);
      await refreshAllData();
      showToast('PRODUCTO ELIMINADO');
    },
    [refreshAllData, showToast, isContador]
  );

  const saveClient = useCallback(
    async (client: Client) => {
      try {
        const senderId = isContador ? activeSenderIdRef.current ?? undefined : undefined;
        const exists = clients.some((current) => current.id === client.id);

        if (exists) {
          await clientsService.updateClient(
            client.id,
            {
              name: client.name,
              dni: client.dni || undefined,
              ruc: client.ruc || undefined,
              phone: client.phone || undefined,
            },
            senderId
          );
        } else {
          await clientsService.createClient(
            {
              name: client.name,
              dni: client.dni || undefined,
              ruc: client.ruc || undefined,
              phone: client.phone || undefined,
            },
            senderId
          );
        }

        await refreshAllData();
        showToast('CLIENTE GUARDADO');
      } catch (error: any) {
        showToast(error.message || 'ERROR', 'error');
      }
    },
    [clients, refreshAllData, showToast, isContador]
  );

  const deleteClient = useCallback(
    async (id: number) => {
      const senderId = isContador ? activeSenderIdRef.current ?? undefined : undefined;
      await clientsService.deleteClient(id, senderId);
      await refreshAllData();
      showToast('CLIENTE ELIMINADO');
    },
    [refreshAllData, showToast, isContador]
  );

  const persistInvoice = useCallback(
    async (invoice: Invoice): Promise<Invoice | null> => {
      try {
        const senderId = isContador ? activeSenderIdRef.current ?? undefined : undefined;

        const createdInvoice = await invoiceService.createInvoice(
          {
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
          },
          senderId
        );

        await invoiceService.emitInvoice(createdInvoice.id, senderId);
        await refreshAllData();
        showToast('DOCUMENTO ENVIADO A SUNAT');
        return createdInvoice;
      } catch (error: any) {
        console.error('Error guardando invoice:', error);
        showToast(error.message || 'ERROR AL GUARDAR', 'error');
        return null;
      }
    },
    [refreshAllData, showToast, isContador]
  );

  const saveDraft = useCallback(
    async (invoice: Invoice): Promise<Invoice | null> => {
      try {
        const senderId = isContador ? activeSenderIdRef.current ?? undefined : undefined;

        const createdInvoice = await invoiceService.createInvoice(
          {
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
          },
          senderId
        );

        await refreshAllData();
        showToast('BORRADOR GUARDADO');
        return createdInvoice;
      } catch (error: any) {
        console.error('Error guardando borrador:', error);
        showToast(error.message || 'ERROR AL GUARDAR', 'error');
        return null;
      }
    },
    [refreshAllData, showToast, isContador]
  );

  const emitDraft = useCallback(
    async (invoiceId: number): Promise<void> => {
      try {
        const senderId = isContador ? activeSenderIdRef.current ?? undefined : undefined;
        await invoiceService.emitInvoice(invoiceId, senderId);
        await refreshAllData();
        showToast('DOCUMENTO ENVIADO A SUNAT');
      } catch (error: any) {
        console.error('Error emitiendo borrador:', error);
        showToast(error.message || 'ERROR AL EMITIR', 'error');
      }
    },
    [refreshAllData, showToast, isContador]
  );

  const CREDIT_NOTE_SUSTENTO: Record<string, string> = {
    '01': 'Anulacion de la Operacion',
    '02': 'Anulacion por Error en el RUC',
    '03': 'Devolucion Total',
    '04': 'Correccion por error en la descripcion',
    '05': 'Devolucion por item',
  };

  const emitCreditNote = useCallback(
    async (baseInvoice: Invoice, reason: CreditNoteReason) => {
      try {
        const senderId = isContador ? activeSenderIdRef.current ?? undefined : undefined;
        await invoiceService.createCreditNote(
          baseInvoice.id,
          {
            date: new Date().toISOString().split('T')[0],
            reason,
            sustento: CREDIT_NOTE_SUSTENTO[reason] ?? 'Anulacion de la Operacion',
          },
          senderId
        );

        await refreshAllData();
        showToast('NOTA DE CRÉDITO CREADA');
      } catch (error: any) {
        console.error('Error emitiendo Nota de Crédito:', error);
        showToast(`Error: ${error.message}`, 'error');
      }
    },
    [refreshAllData, showToast, isContador]
  );

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user as AuthUser);
  }, []);

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

  const bootstrapRan = useRef(false);

  useEffect(() => {
    if (bootstrapRan.current) return;
    bootstrapRan.current = true;

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
      isContador,

      senders,
      activeSenderId,
      activeSender,

      products,
      clients,
      invoices,

      setToast,
      showToast,

      login,
      refreshAllData,
      changeSender,
      selectSenderAsContador,

      saveSender,
      deleteSender,

      saveProduct,
      saveProductSilent,
      deleteProduct,

      saveClient,
      deleteClient,

      persistInvoice,
      saveDraft,
      emitDraft,
      emitCreditNote,

      logout,
    }),
    [
      user,
      authLoading,
      dataReady,
      toast,
      isAdmin,
      isContador,
      senders,
      activeSenderId,
      activeSender,
      products,
      clients,
      invoices,
      showToast,
      login,
      refreshAllData,
      changeSender,
      selectSenderAsContador,
      saveSender,
      deleteSender,
      saveProduct,
      saveProductSilent,
      deleteProduct,
      saveClient,
      deleteClient,
      persistInvoice,
      saveDraft,
      emitDraft,
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
