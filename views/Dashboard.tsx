
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, FileText, ShoppingBag, CreditCard, ChevronRight, Zap, Target } from 'lucide-react';
import { Invoice, Sender, InvoiceStatus } from '../types';
import { StatusBadge } from './History';

interface DashboardProps {
  invoices: Invoice[];
  activeSender: Sender | null;
  onEmit: () => void;
  onHistory: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ invoices, activeSender, onEmit, onHistory }) => {
  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const avgSales = invoices.length ? totalSales / invoices.length : 0;

  const stats = [
    { label: 'Ingresos', value: `S/ ${totalSales.toFixed(2)}`, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Tickets', value: invoices.length, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Promedio', value: `S/ ${avgSales.toFixed(2)}`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  const last7Days = invoices.slice(-7).map(inv => ({
    name: new Date(inv.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
    total: inv.total
  }));

  return (
    <div className="space-y-6 pb-6">
      {/* Premium Active Sender Card */}
      <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/30 rounded-full blur-[80px] group-hover:scale-110 transition-transform duration-700"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-[60px]"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
             <div>
               <p className="text-blue-400 text-[9px] font-black uppercase tracking-[0.3em] mb-1">Emisor Activo</p>
               <h2 className="text-2xl font-black tracking-tight leading-tight">{activeSender?.name || 'Configura tu Empresa'}</h2>
               <p className="text-white/40 text-[10px] font-bold mt-1 tracking-widest uppercase">RUC: {activeSender?.ruc || '-'}</p>
             </div>
             <div className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center">
                <Target className="text-blue-400" size={24} />
             </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={onEmit}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all text-[10px] uppercase tracking-widest"
            >
              Nueva Venta
            </button>
            <button 
              onClick={onHistory}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/5 backdrop-blur-md font-black py-4 rounded-2xl active:scale-95 transition-all text-[10px] uppercase tracking-widest"
            >
              Historial
            </button>
          </div>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex flex-col items-center text-center hover:border-blue-100 transition-colors">
            <div className={`${stat.bg} ${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon size={20} strokeWidth={2.5} />
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-xs font-black text-slate-900 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Activity Chart Section */}
      <div className="bg-white p-7 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Actividad Reciente</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Ventas semanales</p>
          </div>
          <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-widest">LIVE DATA</span>
        </div>
        <div className="h-48 w-full">
          {last7Days.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: '900'}} 
                />
                <Bar dataKey="total" radius={[8, 8, 8, 8]} barSize={32}>
                   {last7Days.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === last7Days.length - 1 ? '#4f46e5' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 border border-slate-100">
                <ShoppingBag size={32} className="opacity-20" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">Esperando transacciones</p>
            </div>
          )}
        </div>
      </div>

      {/* Elegant Recent Invoices List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-4">
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Últimas Operaciones</h3>
          <button onClick={onHistory} className="text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 group">
            Ver Todo 
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <div className="space-y-3">
          {invoices.length > 0 ? (
            invoices.slice().reverse().slice(0, 5).map((inv) => (
              <div key={inv.id} className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex items-center justify-between hover:border-blue-100 transition-all active:scale-[0.98]">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${inv.type === 'BOLETA' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    <FileText size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[14px] font-black text-slate-800 truncate uppercase tracking-tight max-w-[120px]">{inv.clientName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <StatusBadge status={inv.status} />
                       <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{inv.date}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">S/ {inv.total.toFixed(2)}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{inv.series}-{inv.number}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white/40 p-12 rounded-[40px] border border-dashed border-slate-200 text-center">
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">Comienza a vender para ver historial</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
