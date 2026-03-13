// layouts/AppLayout.tsx
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const titles: Record<string, string> = {
  '/dashboard': 'Resumen',
  '/billing': 'Emitir Documento',
  '/history': 'Historial',
  '/products': 'Productos',
  '/clients': 'Clientes',
  '/profile': 'Mi Perfil',
  '/admin/users': 'Usuarios',
};

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const pathname = location.pathname;
  const title = titles[pathname] || 'FactuMovil';

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
    >
      <Outlet />
    </Layout>
  );
}