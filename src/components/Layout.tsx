// components/Layout.tsx
import React, { useState } from 'react';
import {
  Home,
  Package,
  Users,
  History,
  PlusSquare,
  Menu,
  X,
  UserCircle,
  ChevronLeft,
  ShieldCheck,
  Bot,
  MessageCircle,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onGoBack?: () => void;
  showBack?: boolean;
  title: string;
  isAdmin?: boolean;
  userInitials?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onGoBack,
  showBack,
  title,
  isAdmin = false,
  userInitials = 'US',
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const bottomTabs = [
    { id: 'dashboard', icon: Home, label: 'Inicio' },
    { id: 'billing', icon: PlusSquare, label: 'Emitir', primary: true },
    { id: 'profile', icon: UserCircle, label: 'Perfil' },
  ];

  const sidebarLinks = [
    { id: 'products',  icon: Package,        label: 'Productos'  },
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
            <h2 className="text-xl font-black tracking-tighter italic">FactuMovil</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-1.5 mt-4">
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

          {/* Agente SUNAT IA — destacado */}
          <div className="h-px bg-slate-100 my-4 mx-4" />
          <button
            onClick={() => handleLinkClick('agent')}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all relative overflow-hidden ${
              activeTab === 'agent'
                ? 'bg-violet-600 text-white font-black shadow-lg shadow-violet-200'
                : 'bg-gradient-to-r from-violet-50 to-blue-50 text-violet-600 hover:from-violet-100 hover:to-blue-100 font-black'
            }`}
          >
            <Bot size={20} />
            <span className="text-[11px] uppercase font-black tracking-widest">Agente SUNAT IA</span>
            {activeTab !== 'agent' && (
              <span className="ml-auto text-[8px] font-black bg-violet-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                Nuevo
              </span>
            )}
          </button>

          {/* Información y Opinión */}
          <button
            onClick={() => handleLinkClick('feedback')}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
              activeTab === 'feedback'
                ? 'bg-blue-50 text-blue-600 font-black'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <MessageCircle size={20} />
            <span className="text-[11px] uppercase font-black tracking-widest">Información y Opinión</span>
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
      <header className="bg-white/80 backdrop-blur-md px-4 py-4 sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 h-20">
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

        <h1 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">
          {title}
        </h1>

        <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200 font-black text-xs">
          {userInitials}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-4">{children}</main>

      {/* Bottom Navigation */}
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
    </div>
  );
};

export default Layout;
