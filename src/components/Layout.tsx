// components/Layout.tsx

import {
  ArrowLeftRight,
  Building2,
  ChevronLeft,
  History,
  Home,
  type LucideIcon,
  Menu,
  MessageCircle,
  Package,
  PlusSquare,
  ShieldCheck,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { Sender } from '../types';
import Button from './ui/Button';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onGoBack?: () => void;
  showBack?: boolean;
  title: string;
  isAdmin?: boolean;
  isContador?: boolean;
  activeSender?: Sender | null;
  userInitials?: string;
  hideBottomNav?: boolean;
}

interface SidebarLinkProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ icon: Icon, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    className={`flex min-h-12 w-full items-center gap-4 rounded-control px-5 py-3 text-sm font-semibold transition ${
      active ? 'bg-accent/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
    }`}
  >
    <Icon size={20} />
    {label}
  </button>
);

const Divider: React.FC = () => <div className="mx-4 my-4 h-px bg-slate-100" />;

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onGoBack,
  showBack,
  title,
  isAdmin = false,
  isContador = false,
  activeSender = null,
  userInitials = 'US',
  hideBottomNav = false,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const bottomTabs = [
    { id: 'dashboard', icon: Home, label: 'Inicio' },
    { id: 'billing', icon: PlusSquare, label: 'Emitir', primary: true },
    { id: 'profile', icon: UserCircle, label: 'Perfil' },
  ];

  const sidebarLinks = [
    { id: 'products', icon: Package, label: 'Productos' },
    { id: 'clients', icon: Users, label: 'Clientes' },
    { id: 'history', icon: History, label: 'Historial' },
    { id: 'feedback', icon: MessageCircle, label: 'Opiniones' },
    { id: 'about', icon: Building2, label: 'Sobre nosotros' },
  ];

  const handleLinkClick = (id: string) => {
    onTabChange(id);
    setIsSidebarOpen(false);
  };

  return (
    <div className="relative mx-auto flex h-screen max-w-md flex-col overflow-hidden border-x bg-slate-50 font-sans">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        inert={!isSidebarOpen}
        className={`fixed left-0 top-0 z-50 h-full w-72 transform bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between bg-primary p-8 text-white">
          <img src="/logo-horizontal-light.png" alt="FactuMovil" className="h-8 w-auto" />
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Cerrar menú"
            className="flex size-11 items-center justify-center rounded-full hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-4 space-y-1.5 p-4">
          {isContador && (
            <>
              <SidebarLink
                icon={Building2}
                label="Mis empresas"
                active={activeTab === 'contador-senders'}
                onClick={() => handleLinkClick('contador-senders')}
              />
              <Divider />
            </>
          )}

          <SidebarLink
            icon={Home}
            label="Inicio"
            active={activeTab === 'dashboard'}
            onClick={() => handleLinkClick('dashboard')}
          />

          <Divider />

          {sidebarLinks.map((link) => (
            <SidebarLink
              key={link.id}
              icon={link.icon}
              label={link.label}
              active={activeTab === link.id}
              onClick={() => handleLinkClick(link.id)}
            />
          ))}

          {isAdmin && (
            <>
              <Divider />
              <p className="mb-2 px-5 text-xs font-semibold text-slate-500">Administración</p>
              <SidebarLink
                icon={ShieldCheck}
                label="Usuarios"
                active={activeTab === 'admin-users'}
                onClick={() => handleLinkClick('admin-users')}
              />
            </>
          )}
        </nav>
      </aside>

      <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-md">
        {showBack && onGoBack ? (
          <Button variant="ghost" size="icon" onClick={onGoBack} aria-label="Volver">
            <ChevronLeft size={24} />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </Button>
        )}

        {activeTab === 'dashboard' ? (
          <img src="/logo-icon.png" alt="FactuMovil AI" className="size-9" />
        ) : (
          <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        )}

        <div className="flex size-11 items-center justify-center rounded-control bg-primary text-sm font-semibold text-white">
          {userInitials}
        </div>
      </header>

      {isContador && activeSender && (
        <div className="flex items-center gap-2.5 bg-primary px-4 py-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-control bg-white/10">
            <Building2 size={14} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-white">
              {activeSender.name}
            </p>
            <p className="text-xs leading-tight text-white/60">RUC {activeSender.ruc}</p>
          </div>
          <button
            type="button"
            onClick={() => onTabChange('contador-senders')}
            className="flex min-h-9 shrink-0 items-center gap-1.5 px-1 text-white/70 transition-colors hover:text-white"
            aria-label="Cambiar empresa"
          >
            <ArrowLeftRight size={14} />
            <span className="text-xs font-semibold">Cambiar</span>
          </button>
        </div>
      )}

      <main className={`flex-1 overflow-y-auto px-4 pt-4 ${hideBottomNav ? 'pb-4' : 'pb-32'}`}>
        {children}
      </main>

      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex max-w-md items-center justify-between rounded-t-card border-t border-slate-100 bg-white/95 px-8 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] backdrop-blur-xl">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            if (tab.primary) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  aria-label={tab.label}
                  aria-current={isActive ? 'page' : undefined}
                  className="relative -top-8 flex flex-col items-center"
                >
                  <div
                    className={`flex size-16 items-center justify-center rounded-card text-white shadow-2xl transition-all active:scale-90 ${
                      isActive ? 'scale-110 bg-accent' : 'bg-primary'
                    }`}
                  >
                    <Icon size={32} strokeWidth={2.5} />
                  </div>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-w-14 flex-col items-center justify-center gap-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-slate-500'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default Layout;
