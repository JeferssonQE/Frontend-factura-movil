// components/Layout.tsx
import React, { useState } from 'react';
import {
  Home,
  Package,
  Boxes,
  Users,
  History,
  PlusSquare,
  Menu,
  X,
  UserCircle,
  ChevronLeft,
  ShieldCheck,
  MessageCircle,
  Building2,
  ArrowLeftRight,
} from 'lucide-react';
import { Sender } from '../types';

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
  showInventory?: boolean;
}

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
  showInventory = false,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const bottomTabs = [
    { id: 'dashboard', icon: Home, label: 'Inicio' },
    { id: 'billing', icon: PlusSquare, label: 'Emitir', primary: true },
    { id: 'profile', icon: UserCircle, label: 'Perfil' },
  ];

  const sidebarLinks = [
    { id: 'products',  icon: Package,        label: 'Productos'  },
    ...(showInventory ? [{ id: 'inventory', icon: Boxes, label: 'Inventario' }] : []),
    { id: 'clients',   icon: Users,          label: 'Clientes'   },
    { id: 'history',   icon: History,        label: 'Historial'  },
  ];

  const handleLinkClick = (id: string) => {
    onTabChange(id);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 border-x relative overflow-hidden font-sans">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ease-out shadow-2xl ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-8 border-b flex flex-col gap-4 bg-slate-900 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img src="/logo-horizontal-light.png" alt="FactuMovil" className="h-8 w-auto" />
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-1.5 mt-4">
          {isContador && (
            <>
              <button
                onClick={() => handleLinkClick('contador-senders')}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                  activeTab === 'contador-senders'
                    ? 'bg-blue-50 text-blue-600 font-black'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Building2 size={20} />
                <span className="text-[11px] uppercase font-black tracking-widest">Mis Empresas</span>
              </button>
              <div className="h-px bg-slate-100 my-4 mx-4" />
            </>
          )}

          <button
            onClick={() => handleLinkClick('dashboard')}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-50 text-blue-600 font-black'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Home size={20} />
            <span className="text-[11px] uppercase font-black tracking-widest">Inicio</span>
          </button>

          <div className="h-px bg-slate-100 my-4 mx-4" />

          {sidebarLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                activeTab === link.id
                  ? 'bg-blue-50 text-blue-600 font-black'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <link.icon size={20} />
              <span className="text-[11px] uppercase font-black tracking-widest">{link.label}</span>
            </button>
          ))}

          {/* Opiniones */}
          <button
            onClick={() => handleLinkClick('feedback')}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
              activeTab === 'feedback'
                ? 'bg-blue-50 text-blue-600 font-black'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <MessageCircle size={20} />
            <span className="text-[11px] uppercase font-black tracking-widest">Opiniones</span>
          </button>

          {/* Sobre Nosotros */}
          <button
            onClick={() => handleLinkClick('about')}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
              activeTab === 'about'
                ? 'bg-blue-50 text-blue-600 font-black'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Building2 size={20} />
            <span className="text-[11px] uppercase font-black tracking-widest">Sobre Nosotros</span>
          </button>

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="h-px bg-slate-100 my-4 mx-4" />
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-5 mb-2">
                Administración
              </p>
              <button
                onClick={() => handleLinkClick('admin-users')}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                  activeTab === 'admin-users'
                    ? 'bg-purple-50 text-purple-600 font-black'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck size={20} />
                <span className="text-[11px] uppercase font-black tracking-widest">Usuarios</span>
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md px-4 py-3 sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 h-[68px]">
        <div className="flex items-center gap-1">
          {showBack && onGoBack ? (
            <button
              onClick={onGoBack}
              className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-colors"
            >
              <Menu size={24} />
            </button>
          )}
        </div>

        {activeTab === 'dashboard' ? (
          <img src="/logo-icon.png" alt="FactuMovil AI" className="h-9 w-9" />
        ) : (
          <h1 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">
            {title}
          </h1>
        )}

        <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200 font-black text-xs">
          {userInitials}
        </div>
      </header>

      {/* Contador active sender banner */}
      {isContador && activeSender && (
        <div className="bg-slate-900 px-4 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Building2 size={13} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-[10px] uppercase tracking-widest truncate leading-tight">
              {activeSender.name}
            </p>
            <p className="text-white/40 text-[9px] font-medium leading-tight">
              RUC {activeSender.ruc}
            </p>
          </div>
          <button
            onClick={() => onTabChange('contador-senders')}
            className="shrink-0 flex items-center gap-1 text-white/50 hover:text-white transition-colors"
            aria-label="Cambiar empresa"
          >
            <ArrowLeftRight size={13} />
            <span className="text-[9px] font-black uppercase tracking-widest">Cambiar</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto px-4 pt-4 ${hideBottomNav ? 'pb-4' : 'pb-32'}`}>{children}</main>

      {/* Bottom Navigation */}
      {!hideBottomNav && (
      <nav className="bg-white/95 backdrop-blur-xl border-t border-slate-50 px-8 py-4 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30 flex justify-between items-center rounded-t-[40px] shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.primary) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative -top-8 flex flex-col items-center"
              >
                <div
                  className={`w-16 h-16 rounded-[22px] flex items-center justify-center shadow-2xl transition-all active:scale-90 ${
                    isActive
                      ? 'bg-blue-600 text-white scale-110 shadow-blue-200'
                      : 'bg-slate-900 text-white'
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
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center transition-all ${
                isActive ? 'text-blue-600' : 'text-slate-300'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span
                className={`text-[9px] mt-1.5 font-black uppercase tracking-widest ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              >
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
