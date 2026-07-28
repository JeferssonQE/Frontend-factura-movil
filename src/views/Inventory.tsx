// views/Inventory.tsx
import React, { useState } from 'react';
import {
  Plus,
  Boxes,
  PackagePlus,
  CalendarClock,
  AlertCircle,
  X,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { InventoryProduct } from '../types';
import { SUNAT_UNITS } from '../config/sunatUnits';
import { inventoryProductSchema } from '../schemas/business';
import { InventoryProductPayload } from '../services/business/inventoryService';

interface InventoryProps {
  inventory: InventoryProduct[];
  inventoryEnabled: boolean;
  senderId: number | null;
  onSave: (payload: InventoryProductPayload) => Promise<void>;
  onRefresh: () => void;
}

const formatVencimiento = (fecha: string | null): string => {
  if (!fecha) return 'Sin vencimiento';
  const [year, month, day] = fecha.split('-');
  return `Vence ${day}/${month}/${year}`;
};

const Inventory: React.FC<InventoryProps> = ({
  inventory,
  inventoryEnabled,
  senderId,
  onSave,
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!inventoryEnabled) {
    return (
      <div className="text-center py-20 bg-white/50 rounded-[40px] border border-dashed border-slate-200">
        <Lock size={48} className="mx-auto text-slate-200 mb-2" />
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
          Módulo de Inventario no Disponible
        </p>
      </div>
    );
  }

  const filteredInventory = inventory.filter(
    (item) =>
      item.sender_id === senderId &&
      item.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setSalePrice('');
    setBuyPrice('');
    setQuantity('');
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!senderId) return;

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const fechaVencimiento = (formData.get('fecha_vencimiento') as string).trim();

    const result = inventoryProductSchema.safeParse({
      nombre: (formData.get('nombre') as string).trim(),
      categoria: (formData.get('categoria') as string).trim(),
      unidad_medida: formData.get('unidad_medida') as string,
      precio_venta: parseFloat(salePrice) || 0,
      cantidad_inicial: parseFloat(quantity) || 0,
      precio_compra: buyPrice ? parseFloat(buyPrice) : undefined,
      fecha_vencimiento: fechaVencimiento,
    });

    if (!result.success) {
      setFormError(result.error.issues[0].message);
      return;
    }

    const payload: InventoryProductPayload = {
      nombre: result.data.nombre,
      categoria: result.data.categoria || null,
      unidad_medida: result.data.unidad_medida,
      precio_venta: result.data.precio_venta,
      cantidad_inicial: result.data.cantidad_inicial,
      precio_compra: result.data.precio_compra ?? null,
      fecha_vencimiento: result.data.fecha_vencimiento || null,
    };

    setIsSaving(true);
    try {
      await onSave(payload);
      setIsModalOpen(false);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 relative">
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="BUSCAR EN EL INVENTARIO..."
          className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 text-[11px] font-black text-slate-700 uppercase tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300"
        />

        <button
          onClick={onRefresh}
          className="bg-white border border-slate-200 text-slate-400 p-3.5 rounded-2xl shadow-sm active:scale-95 transition-all hover:text-slate-600"
          aria-label="Actualizar inventario"
        >
          <RefreshCw size={18} />
        </button>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          disabled={!senderId}
          className="bg-blue-600 text-white p-3.5 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
          <Plus size={22} />
        </button>
      </div>

      <div className="space-y-3">
        {filteredInventory.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-[40px] border border-dashed border-slate-200">
            <Boxes size={48} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              Inventario Vacío
            </p>
          </div>
        ) : (
          filteredInventory.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex justify-between items-center hover:border-blue-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-tight truncate">
                  {item.nombre}
                </h4>

                <div className="flex flex-wrap gap-2 items-center mt-1.5">
                  <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-lg uppercase">
                    {Number(item.stock_total).toFixed(0)} {item.unidad_medida}
                  </span>
                  <span className="text-xs font-black text-blue-600">
                    S/ {Number(item.precio_venta).toFixed(2)}
                  </span>
                  {item.categoria && (
                    <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase">
                      {item.categoria}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-1.5 text-slate-400">
                  <CalendarClock size={12} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">
                    {formatVencimiento(item.proximo_vencimiento)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <PackagePlus size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                  Nuevo Producto
                </h3>
              </div>

              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 mb-6">
                <AlertCircle className="text-red-500" size={20} />
                <p className="text-red-700 text-xs font-black uppercase">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Nombre
                </label>
                <input
                  name="nombre"
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="EJ. LECHE GLORIA 400G"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Categoría
                  </label>
                  <input
                    name="categoria"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder="OPCIONAL"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Unidad
                  </label>
                  <select
                    name="unidad_medida"
                    defaultValue="UNIDAD"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 appearance-none uppercase"
                  >
                    {SUNAT_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Precio Venta (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePrice}
                    onChange={(event) => setSalePrice(event.target.value)}
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-lg font-black text-blue-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Precio Compra (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={buyPrice}
                    onChange={(event) => setBuyPrice(event.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-lg font-black text-slate-700 focus:ring-2 focus:ring-blue-500"
                    placeholder="OPCIONAL"
                  />
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-5">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                  Primer lote de stock
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      required
                      className="w-full bg-white border-none rounded-2xl p-4 text-lg font-black text-slate-800 focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      Vencimiento
                    </label>
                    <input
                      type="date"
                      name="fecha_vencimiento"
                      className="w-full bg-white border-none rounded-2xl p-4 text-sm font-black text-slate-700 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  El vencimiento es opcional
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {isSaving && <RefreshCw size={14} className="animate-spin" />}
                  {isSaving ? 'Guardando…' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
