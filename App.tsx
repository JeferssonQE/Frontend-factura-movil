import React, { useState, useEffect } from 'react';
import { AuthService, SupabaseDB, ProfileService, UserProfile } from './services/supabase';
import { decrypt } from './services/crypto';
import { Sender, Product, Client, Invoice, InvoiceType, InvoiceStatus, CreditNoteReason } from './types';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Products from './views/Products';
import Billing from './views/Billing';
import History from './views/History';
import Clients from './views/Clients';
import Login from './views/Login';
import Profile from './views/Profile';
import { CheckCircle2, AlertCircle, X, Building, ChevronDown } from 'lucide-react';

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => (
  <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-3 px-6 py-4 rounded-[24px] shadow-2xl animate-in slide-in-from-top duration-300 ${type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
    {type === 'success' ? <CheckCircle2 className="text-emerald-400" size={20} /> : <AlertCircle size={20} />}
    <span className="text-xs font-black uppercase tracking-widest">{message}</span>
    <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100"><X size={16} /></button>
  </div>
);

// Selector de empresa para Admin
const SenderSelector: React.FC<{
  senders: Sender[];
  activeSenderId: string | null;
  onSelect: (id: string) => void;
}> = ({ senders, activeSenderId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeSender = senders.find(s => s.id === activeSenderId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-xs font-black text-amber-700 uppercase tracking-wider"
      >
        <Building size={14} />
        {activeSender?.name || 'Seleccionar'}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest px-2">🔑 Modo Admin</p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {senders.map(sender => (
              <button
                key={sender.id}
                onClick={() => { onSelect(sender.id); setIsOpen(false); }}
                className={`w-full px-4 py-3 text-left text-xs font-bold hover:bg-slate-50 transition-colors ${
                  sender.id === activeSenderId ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
                }`}
              >
                <p className="font-black uppercase">{sender.name}</p>
                <p className="text-[10px] text-slate-400">RUC: {sender.ruc}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [historyTabStack, setHistoryTabStack] = useState<string[]>(['dashboard']);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeSenderId, setActiveSenderId] = useState<string | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isAdmin = userProfile?.role === 'admin';

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await AuthService.getSession();
        setUser(session?.user || null);
        
        // Cargar perfil del usuario
        if (session?.user) {
          const profile = await ProfileService.getProfile();
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();

    const { data: { subscription } } = AuthService.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      refreshAllData();
    }
  }, [user]);

  const handleTabChange = (tab: string) => {
    if (tab !== activeTab) {
      setHistoryTabStack((prev: string[]) => [...prev, tab]);
      setActiveTab(tab);
    }
  };

  const handleGoBack = () => {
    if (historyTabStack.length > 1) {
      const newStack = [...historyTabStack];
      newStack.pop();
      const prevTab = newStack[newStack.length - 1];
      setHistoryTabStack(newStack);
      setActiveTab(prevTab);
    } else {
      setActiveTab('dashboard');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshAllData = async () => {
    try {
      // Cargar senders - Admin ve todos, Empresa solo los suyos
      const loadedSenders = await SupabaseDB.getSenders(isAdmin);
      
      // Desencriptar credenciales SUNAT
      const sendersWithDecrypted = await Promise.all(
        loadedSenders.map(async (s: any) => {
          let sunatUser = '';
          let sunatPass = '';
          
          try {
            if (s.sunat_user_encrypted) {
              sunatUser = await decrypt(s.sunat_user_encrypted);
            }
            if (s.sunat_pass_encrypted) {
              sunatPass = await decrypt(s.sunat_pass_encrypted);
            }
          } catch (e) {
            console.warn('Error desencriptando credenciales:', e);
          }
          
          return {
            id: s.id,
            name: s.name,
            ruc: s.ruc,
            sunatUser,
            sunatPass
          };
        })
      );
      
      setSenders(sendersWithDecrypted);

      // Si hay sender, cargar sus datos
      if (loadedSenders.length > 0) {
        const senderId = loadedSenders[0].id;
        setActiveSenderId(senderId);

        const [loadedProducts, loadedClients, loadedInvoices] = await Promise.all([
          SupabaseDB.getProducts(senderId),
          SupabaseDB.getClients(senderId),
          SupabaseDB.getInvoices(senderId)
        ]);

        console.log('📦 Datos cargados:', { 
          products: loadedProducts.length, 
          clients: loadedClients.length, 
          invoices: loadedInvoices.length 
        });

        setProducts(loadedProducts.map((p: any) => ({
          id: String(p.id),
          senderId: String(p.sender_id),
          description: p.description,
          unit: p.unit,
          basePrice: parseFloat(p.base_price),
          hasIgv: p.has_igv,
          stock: p.stock
        })));

        setClients(loadedClients.map((c: any) => ({
          id: String(c.id),
          senderId: String(c.sender_id),
          name: c.name,
          dni: c.dni,
          ruc: c.ruc,
          phone: c.phone
        })));

        setInvoices(loadedInvoices.map((inv: any) => ({
          id: String(inv.id),
          senderId: String(inv.sender_id),
          clientId: inv.client_id ? String(inv.client_id) : inv.client_document || '',
          clientName: inv.client_name || '',
          type: inv.type,
          series: inv.series,
          number: inv.number,
          date: inv.date,
          subtotal: parseFloat(inv.subtotal) || 0,
          igv: parseFloat(inv.igv) || 0,
          total: parseFloat(inv.total) || 0,
          status: inv.status,
          pdfBase64: inv.pdf_base64 || null,
          items: (inv.invoice_items || []).map((item: any) => ({
            productId: item.product_id ? String(item.product_id) : '',
            description: item.description || '',
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || 'UNIDAD',
            unitPrice: parseFloat(item.unit_price) || 0,
            hasIgv: item.has_igv ?? true,
            total: parseFloat(item.total) || 0
          }))
        })));
      }

      setDataReady(true);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setDataReady(true);
    }
  };

  const handleSaveSender = async (sender: Sender) => {
    try {
      const existingSender = senders.find((s: Sender) => s.id === sender.id);
      
      if (existingSender) {
        await SupabaseDB.updateSender(sender.id, {
          name: sender.name,
          ruc: sender.ruc,
          sunat_user: sender.sunatUser,
          sunat_pass: sender.sunatPass
        });
      } else {
        const created = await SupabaseDB.createSender({
          name: sender.name,
          ruc: sender.ruc,
          sunat_user: sender.sunatUser,
          sunat_pass: sender.sunatPass
        });
        setActiveSenderId(created.id);
      }

      await refreshAllData();
      showToast("EMPRESA GUARDADA");
    } catch (error: any) {
      console.error('Error guardando sender:', error);
      showToast(error.message || "ERROR AL GUARDAR", "error");
    }
  };

  const handleSaveProduct = async (product: Product) => {
    try {
      if (products.find((p: Product) => p.id === product.id)) {
        await SupabaseDB.updateProduct(product.id, {
          description: product.description,
          unit: product.unit,
          base_price: product.basePrice,
          has_igv: product.hasIgv
        });
      } else {
        await SupabaseDB.createProduct({
          sender_id: activeSenderId!,
          description: product.description,
          unit: product.unit,
          base_price: product.basePrice,
          has_igv: product.hasIgv
        });
      }
      await refreshAllData();
      showToast("PRODUCTO GUARDADO");
    } catch (error: any) {
      showToast(error.message || "ERROR", "error");
    }
  };

  const handleSaveClient = async (client: Client) => {
    try {
      if (clients.find((c: Client) => c.id === client.id)) {
        await SupabaseDB.updateClient(client.id, {
          name: client.name,
          dni: client.dni,
          ruc: client.ruc,
          phone: client.phone
        });
      } else {
        await SupabaseDB.createClient({
          sender_id: activeSenderId!,
          name: client.name,
          dni: client.dni,
          ruc: client.ruc,
          phone: client.phone
        });
      }
      await refreshAllData();
      showToast("CLIENTE GUARDADO");
    } catch (error: any) {
      showToast(error.message || "ERROR", "error");
    }
  };

  const handleEmitInvoice = async (inv: Invoice) => {
    try {
      const isNumericId = (id: string) => /^\d+$/.test(id);
      
      // Convertir sender_id a número
      const senderId = parseInt(inv.senderId);
      if (isNaN(senderId)) {
        throw new Error('Sender ID inválido');
      }

      let clientId: number | null = null;
      const clientDocument = inv.clientId; // DNI o RUC

      console.log('📋 Datos cliente:', { clientDocument, clientName: inv.clientName });

      // Si el clientId ya es un ID numérico de la BD, usarlo
      if (clientDocument && isNumericId(clientDocument) && clientDocument !== '000') {
        // Verificar si realmente existe en la BD
        const existingById = clients.find((c: Client) => c.id === clientDocument);
        if (existingById) {
          clientId = parseInt(clientDocument);
          console.log('✅ Cliente por ID:', clientId);
        }
      }
      
      // Si no se encontró por ID y hay documento válido (DNI 8 dígitos o RUC 11 dígitos)
      if (clientId === null && clientDocument && (clientDocument.length === 8 || clientDocument.length === 11)) {
        const existingClient = clients.find(
          (c: Client) => c.dni === clientDocument || c.ruc === clientDocument
        );

        if (existingClient) {
          clientId = parseInt(existingClient.id);
          console.log('✅ Cliente encontrado por documento:', clientId);
        } else {
          console.log('🆕 Creando cliente nuevo:', inv.clientName, clientDocument);
          const newClient = await SupabaseDB.createClient({
            sender_id: senderId,
            name: inv.clientName,
            dni: clientDocument.length === 8 ? clientDocument : undefined,
            ruc: clientDocument.length === 11 ? clientDocument : undefined
          });
          clientId = newClient.id;
          console.log('✅ Cliente creado:', inv.clientName, clientId);
        }
      }

      // Si aún no hay clientId y hay nombre, crear cliente sin documento
      if (clientId === null && inv.clientName && inv.clientName.trim()) {
        console.log('🆕 Creando cliente sin documento:', inv.clientName);
        const newClient = await SupabaseDB.createClient({
          sender_id: senderId,
          name: inv.clientName
        });
        clientId = newClient.id;
        console.log('✅ Cliente creado (sin doc):', inv.clientName, clientId);
      }

      console.log('📋 Client ID final:', clientId);

      // Procesar items - crear productos si no existen
      const itemsData = await Promise.all(
        inv.items.map(async (item) => {
          let productId: number | null = null;

          // Si ya es ID numérico de la BD, usarlo
          if (item.productId && isNumericId(item.productId)) {
            productId = parseInt(item.productId);
            console.log('✅ Producto existente (ID):', item.description, productId);
          }
          // Si tiene descripción, buscar o crear producto
          else if (item.description && item.description.trim()) {
            const existingProduct = products.find(
              (p: Product) =>
                p.description.toUpperCase() === item.description.toUpperCase() &&
                p.senderId === inv.senderId
            );

            if (existingProduct) {
              productId = parseInt(existingProduct.id);
              console.log('✅ Producto encontrado:', item.description, productId);
            } else {
              console.log('🆕 Creando producto nuevo:', item.description);
              const newProduct = await SupabaseDB.createProduct({
                sender_id: senderId,
                description: item.description,
                unit: item.unit,
                base_price: item.unitPrice,
                has_igv: item.hasIgv
              });
              productId = newProduct.id;
              console.log('✅ Producto creado:', item.description, productId);
            }
          }

          return {
            product_id: productId,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unitPrice,
            has_igv: item.hasIgv,
            total: item.total
          };
        })
      );

      // Preparar datos para Supabase
      const invoiceData = {
        sender_id: senderId,
        client_id: clientId,
        client_name: inv.clientName,
        client_document: clientDocument || null,
        type: inv.type,
        series: inv.series,
        number: inv.number,
        date: inv.date,
        subtotal: inv.subtotal,
        igv: inv.igv,
        total: inv.total,
        status: inv.status,
        pdf_base64: inv.pdfBase64 || null
      };

      console.log('📄 Guardando invoice:', invoiceData);

      // Guardar en Supabase
      await SupabaseDB.createInvoice(invoiceData, itemsData);

      // Refrescar datos
      await refreshAllData();
      showToast('DOCUMENTO EMITIDO');
    } catch (error: any) {
      console.error('Error guardando invoice:', error);
      showToast(error.message || 'ERROR AL GUARDAR', 'error');
    }
  };

  const handleEmitCreditNote = async (baseInvoice: Invoice, reason: CreditNoteReason) => {
    const nc: Invoice = {
      ...baseInvoice,
      id: Date.now().toString(),
      type: InvoiceType.NOTA_CREDITO,
      series: 'NC01',
      number: (invoices.filter((i: Invoice) => i.type === InvoiceType.NOTA_CREDITO).length + 1).toString().padStart(4, '0'),
      date: new Date().toISOString().split('T')[0],
      status: InvoiceStatus.ACEPTADO,
      referencedInvoiceId: `${baseInvoice.series}-${baseInvoice.number}`,
      creditNoteReason: reason
    };
    setInvoices((prev: Invoice[]) => [...prev, nc]);
    showToast("NOTA DE CRÉDITO EMITIDA");
  };

  const handleLogout = async () => {
    try {
      await AuthService.signOut();
      setUser(null);
      setSenders([]);
      setProducts([]);
      setClients([]);
      setInvoices([]);
      showToast("SESIÓN CERRADA");
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Resumen';
      case 'billing': return 'Emitir Documento';
      case 'history': return 'Historial';
      case 'products': return 'Productos';
      case 'clients': return 'Clientes';
      case 'profile': return 'Mi Perfil';
      default: return 'FactuMovil';
    }
  };

  // Auth loading
  if (authLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 gap-6">
      <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="text-white text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Verificando sesión...</p>
    </div>
  );

  // Not logged in
  if (!user) return <Login onSuccess={() => {}} />;

  // Data loading
  if (!dataReady) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 gap-6">
      <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="text-white text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Cargando datos...</p>
    </div>
  );

  const activeSender = senders.find((s: Sender) => s.id === activeSenderId) || null;

  // Función para cambiar de empresa (solo admin)
  const handleChangeSender = async (senderId: string) => {
    setActiveSenderId(senderId);
    // Recargar datos de la nueva empresa
    const [loadedProducts, loadedClients, loadedInvoices] = await Promise.all([
      SupabaseDB.getProducts(senderId),
      SupabaseDB.getClients(senderId),
      SupabaseDB.getInvoices(senderId)
    ]);

    setProducts(loadedProducts.map((p: any) => ({
      id: String(p.id),
      senderId: String(p.sender_id),
      description: p.description,
      unit: p.unit,
      basePrice: parseFloat(p.base_price),
      hasIgv: p.has_igv,
      stock: p.stock
    })));

    setClients(loadedClients.map((c: any) => ({
      id: String(c.id),
      senderId: String(c.sender_id),
      name: c.name,
      dni: c.dni,
      ruc: c.ruc,
      phone: c.phone
    })));

    setInvoices(loadedInvoices.map((inv: any) => ({
      id: String(inv.id),
      senderId: String(inv.sender_id),
      clientId: inv.client_id ? String(inv.client_id) : inv.client_document || '',
      clientName: inv.client_name || '',
      type: inv.type,
      series: inv.series,
      number: inv.number,
      date: inv.date,
      subtotal: parseFloat(inv.subtotal) || 0,
      igv: parseFloat(inv.igv) || 0,
      total: parseFloat(inv.total) || 0,
      status: inv.status,
      pdfBase64: inv.pdf_base64 || null,
      items: (inv.invoice_items || []).map((item: any) => ({
        productId: item.product_id ? String(item.product_id) : '',
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || 'UNIDAD',
        unitPrice: parseFloat(item.unit_price) || 0,
        hasIgv: item.has_igv ?? true,
        total: parseFloat(item.total) || 0
      }))
    })));

    showToast(`Empresa: ${senders.find(s => s.id === senderId)?.name}`);
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onGoBack={handleGoBack}
      showBack={activeTab !== 'dashboard' && activeTab !== 'billing' && activeTab !== 'profile'}
      title={getTitle()}
    >
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Selector de empresa para Admin */}
      {isAdmin && senders.length > 1 && (
        <div className="mb-4">
          <SenderSelector
            senders={senders}
            activeSenderId={activeSenderId}
            onSelect={handleChangeSender}
          />
        </div>
      )}

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'dashboard' && (
          <Dashboard
            invoices={invoices}
            activeSender={activeSender}
            onEmit={() => handleTabChange('billing')}
            onHistory={() => handleTabChange('history')}
          />
        )}
        {activeTab === 'products' && (
          <Products
            products={products}
            senderId={activeSenderId}
            onSave={handleSaveProduct}
            onDelete={async (id: string) => { await SupabaseDB.deleteProduct(id); refreshAllData(); }}
          />
        )}
        {activeTab === 'clients' && (
          <Clients
            clients={clients}
            senderId={activeSenderId}
            onSave={handleSaveClient}
            onDelete={async (id: string) => { await SupabaseDB.deleteClient(id); refreshAllData(); }}
          />
        )}
        {activeTab === 'billing' && (
          <Billing
            sender={activeSender}
            products={products}
            clients={clients}
            invoices={invoices}
            onEmit={handleEmitInvoice}
            onAddClient={handleSaveClient}
            onSelectSender={() => handleTabChange('profile')}
          />
        )}
        {activeTab === 'history' && <History invoices={invoices} onEmitCreditNote={handleEmitCreditNote} />}
        {activeTab === 'profile' && (
          <Profile
            user={user}
            sender={activeSender}
            onSaveSender={handleSaveSender}
            onDeleteSender={async (id: string) => { await SupabaseDB.deleteSender(id); refreshAllData(); }}
            onLogout={handleLogout}
          />
        )}
      </div>
    </Layout>
  );
};

export default App;
