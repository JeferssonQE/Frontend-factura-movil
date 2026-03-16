// layouts/AppLayout.tsx
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAppData } from '../context/AppDataContext';

const titles: Record<string, string> = {
  '/dashboard': 'Resumen',
  '/billing': 'Emitir Documento',
  '/history': 'Historial',
  '/products': 'Productos',
  '/clients': 'Clientes',
  '/profile': 'Mi Perfil',
  '/admin/users': 'Gestión de Usuarios',
};

const activeTabMap: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/billing': 'billing',
  '/history': 'history',
  '/products': 'products',
  '/clients': 'clients',
  '/profile': 'profile',
  '/admin/users': 'admin-users',
};

const routeMap: Record<string, string> = {
  dashboard: '/dashboard',
  billing: '/billing',
  history: '/history',
  products: '/products',
  clients: '/clients',
  profile: '/profile',
  'admin-users': '/admin/users',
};

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAppData();

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
      userInitials={userInitials}
    >
      <Outlet />
    </Layout>
  );
}
