// layouts/AppLayout.tsx
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import { useAppData } from '../context/AppDataContext';

const titles: Record<string, string> = {
  '/dashboard':         'Resumen',
  '/billing':           'Emitir Documento',
  '/history':           'Historial',
  '/products':          'Productos',
  '/inventory':         'Inventario',
  '/clients':           'Clientes',
  '/profile':           'Mi Perfil',
  '/agent':             'Agente SUNAT IA',
  '/feedback':          'Opiniones',
  '/about':             'Sobre Nosotros',
  '/admin/users':       'Gestión de Usuarios',
  '/contador/senders':  'Mis Empresas',
};

const activeTabMap: Record<string, string> = {
  '/dashboard':         'dashboard',
  '/billing':           'billing',
  '/history':           'history',
  '/products':          'products',
  '/inventory':         'inventory',
  '/clients':           'clients',
  '/profile':           'profile',
  '/agent':             'agent',
  '/feedback':          'feedback',
  '/about':             'about',
  '/admin/users':       'admin-users',
  '/contador/senders':  'contador-senders',
};

const routeMap: Record<string, string> = {
  dashboard:            '/dashboard',
  billing:              '/billing',
  history:              '/history',
  products:             '/products',
  inventory:            '/inventory',
  clients:              '/clients',
  profile:              '/profile',
  agent:                '/agent',
  feedback:             '/feedback',
  about:                '/about',
  'admin-users':        '/admin/users',
  'contador-senders':   '/contador/senders',
};

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isContador, activeSender, toast, setToast, inventoryEnabled } = useAppData();

  const pathname = location.pathname;
  const title = titles[pathname] || 'FactuMovil';

  const userInitials = (() => {
    const name = user?.name || user?.email || 'US';
    if (name.includes('@')) return name.substring(0, 2).toUpperCase();
    return name
      .split(' ')
      .filter(Boolean)
      .map((p: string) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  })();

  return (
    <>
      <Layout
        activeTab={activeTabMap[pathname] || 'dashboard'}
        onTabChange={(tab) => {
          const nextRoute = routeMap[tab];
          if (nextRoute) navigate(nextRoute);
        }}
        onGoBack={() => navigate(-1)}
        showBack={pathname !== '/dashboard' && pathname !== '/billing' && pathname !== '/profile'}
        title={title}
        isAdmin={isAdmin}
        isContador={isContador}
        activeSender={activeSender}
        userInitials={userInitials}
        hideBottomNav={pathname === '/agent'}
        showInventory={inventoryEnabled}
      >
        <Outlet />
      </Layout>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
}
