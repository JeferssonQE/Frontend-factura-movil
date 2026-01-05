
import React, { useState, useEffect } from 'react';
// Added AlertTriangle to imports
import { Plus, Search, Trash2, Pencil, Package, CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { Product, UnitOfMeasure } from '../types';

interface ProductsProps {
  products: Product[];
  senderId: string | null;
  onSave: (product: Product) => void;
  onDelete: (id: string) => void;
}

const Products: React.FC<ProductsProps> = ({ products, senderId, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [hasIgv, setHasIgv] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredProducts = products.filter(p => 
    p.senderId === senderId && 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (editingProduct) {
      setHasIgv(!!editingProduct.hasIgv);
    } else {
      setHasIgv(true);
    }
  }, [editingProduct, isModalOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!senderId) return;

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const description = (formData.get('description') as string).trim();
    const basePrice = parseFloat(formData.get('basePrice') as string);
    const unit = formData.get('unit') as UnitOfMeasure;

    if (!description) {
      setFormError("La descripción es obligatoria.");
      return;
    }
    if (isNaN(basePrice) || basePrice < 0) {
      setFormError("El precio debe ser un número válido mayor o igual a 0.");
      return;
    }

    const product: Product = {
      id: editingProduct?.id || Date.now().toString(),
      senderId,
      description: description.toUpperCase(),
      unit,
      basePrice,
      hasIgv: Boolean(hasIgv)
    };
    
    onSave(product);
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = () => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-4 relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar en el catálogo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-none rounded-2xl py-3 pl-11 pr-4 shadow-sm text-sm focus:ring-2 focus:ring-blue-500 font-medium uppercase"
          />
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormError(null);
            setIsModalOpen(true);
          }}
          disabled={!senderId}
          className="bg-blue-600 text-white p-3.5 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
          <Plus size={22} />
        </button>
      </div>

      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-[40px] border border-dashed border-slate-200">
            <Package size={48} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Catálogo Vacío</p>
          </div>
        ) : (
          filteredProducts.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex justify-between items-center hover:border-blue-100 transition-colors">
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-tight truncate">{p.description}</h4>
                <div className="flex gap-2 items-center mt-1.5">
                  <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase">{p.unit}</span>
                  <span className="text-xs font-black text-blue-600">S/ {p.basePrice.toFixed(2)}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase border ${p.hasIgv ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-400 bg-slate-50 border-slate-100'}`}>
                    {p.hasIgv ? 'Afecto' : 'Exonerado'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 ml-4">
                <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-2.5 text-slate-300 hover:text-blue-600 transition-all"><Pencil size={18} /></button>
                <button onClick={() => setConfirmDeleteId(p.id)} className="p-2.5 text-slate-300 hover:text-red-600 transition-all"><Trash2 size={18} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/20 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2 uppercase">¿ELIMINAR PRODUCTO?</h3>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-8 leading-relaxed">Esta acción es permanente y no podrá recuperarse del catálogo.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDelete} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-100 active:scale-95 transition-all">Eliminar para siempre</button>
              <button onClick={() => setConfirmDeleteId(null)} className="w-full bg-white border border-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Package size={24} /></div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300"><X size={20} /></button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 mb-6"><AlertCircle className="text-red-500" size={20} /><p className="text-red-700 text-xs font-black uppercase">{formError}</p></div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descripción</label><input name="description" defaultValue={editingProduct?.description} required className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 uppercase" placeholder="EJ. ARROZ EXTRA 5KG" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Unidad</label><select name="unit" defaultValue={editingProduct?.unit || UnitOfMeasure.UNIDAD} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 appearance-none uppercase">{Object.values(UnitOfMeasure).map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Precio Base (S/)</label><input name="basePrice" type="number" step="0.01" defaultValue={editingProduct?.basePrice} required className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-blue-600 focus:ring-2 focus:ring-blue-500" placeholder="0.00" /></div>
              </div>
              <div onClick={() => setHasIgv(!hasIgv)} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${hasIgv ? 'bg-emerald-50 border-emerald-500/20 text-emerald-900 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasIgv ? 'bg-emerald-500 text-white' : 'bg-slate-200'}`}><CheckCircle2 size={20} /></div><div><p className="text-[10px] font-black uppercase">Incluye IGV (18%)</p><p className="text-[9px] font-bold uppercase opacity-60">{hasIgv ? 'Operación Gravada' : 'Operación Exonerada'}</p></div></div>
                <div className={`w-12 h-6 rounded-full relative ${hasIgv ? 'bg-emerald-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasIgv ? 'left-7' : 'left-1'}`} /></div>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
