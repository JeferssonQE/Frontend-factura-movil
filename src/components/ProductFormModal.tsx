// components/ProductFormModal.tsx
import React, { useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { InvoiceItem, Product, UnitOfMeasure } from '../types';
import { recalcItem, createEmptyItem, unitLabel } from '../services/utils/invoiceMath';
import ProductSearchSelector from './ProductSearchSelector';

interface ProductFormModalProps {
  initialItem: InvoiceItem | null;
  products: Product[];
  canSaveToCatalog: boolean;
  onSubmit: (item: InvoiceItem, saveToCatalog: boolean) => void;
  onClose: () => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  initialItem,
  products,
  canSaveToCatalog,
  onSubmit,
  onClose,
}) => {
  const isEditing = initialItem !== null;
  const [draft, setDraft] = useState<InvoiceItem>(initialItem ?? createEmptyItem());
  const [saveToCatalog, setSaveToCatalog] = useState(false);
  const [igvChosen, setIgvChosen] = useState(isEditing);

  const updateDraft = (updates: Partial<InvoiceItem>) =>
    setDraft((prev) => recalcItem(prev, updates));

  const chooseIgv = (hasIgv: boolean) => {
    setIgvChosen(true);
    setDraft((prev) => recalcItem({ ...prev, has_igv: hasIgv }, { unit_price: prev.unit_price }));
  };

  const handleSelectProduct = (product: Product) => {
    setIgvChosen(true);
    setDraft((prev) =>
      recalcItem(
        {
          ...prev,
          product_id: product.id,
          description: product.description,
          unit: product.unit,
          has_igv: product.has_igv,
        },
        { unit_price: product.base_price }
      )
    );
  };

  const canSubmit = draft.description.trim().length > 0 && draft.total > 0 && igvChosen;
  const offerSaveToCatalog = canSaveToCatalog && !draft.product_id;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(
      { ...draft, description: draft.description.trim() },
      saveToCatalog && offerSaveToCatalog
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <ShoppingCart size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">
              {isEditing ? 'Editar' : 'Agregar'} Producto
            </h3>
          </div>

          <button onClick={onClose} className="p-2 text-slate-300">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Producto
            </label>
            <ProductSearchSelector
              products={products}
              value={draft.description}
              onChange={(value) => updateDraft({ description: value.toUpperCase() })}
              onSelectProduct={handleSelectProduct}
              placeholder="Nombre del producto"
              showDropdownButton
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block px-1">
                Cant.
              </label>
              <input
                type="number"
                value={draft.quantity || ''}
                onChange={(event) => updateDraft({ quantity: parseFloat(event.target.value) || 0 })}
                placeholder="1"
                className="w-full bg-slate-50 rounded-xl px-2 py-3 text-sm font-black text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block px-1">
                Unidad
              </label>
              <select
                value={draft.unit}
                onChange={(event) => updateDraft({ unit: event.target.value as UnitOfMeasure })}
                className="w-full bg-slate-50 rounded-xl px-2 py-3 text-[11px] font-black text-center focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer"
              >
                {Object.values(UnitOfMeasure).map((unit) => (
                  <option key={unit} value={unit}>
                    {unitLabel(unit)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block px-1">
                P.Unit
              </label>
              <input
                type="number"
                step="0.0001"
                value={draft.unit_price || ''}
                onChange={(event) =>
                  updateDraft({ unit_price: parseFloat(event.target.value) || 0 })
                }
                placeholder="0.0000"
                className="w-full bg-slate-50 rounded-xl px-2 py-3 text-sm font-black text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-blue-600 uppercase mb-1 block px-1">
                Total
              </label>
              <input
                type="number"
                step="0.0001"
                value={draft.total || ''}
                onChange={(event) => updateDraft({ total: parseFloat(event.target.value) || 0 })}
                placeholder="0.0000"
                className="w-full bg-blue-50 border-2 border-blue-200 rounded-xl px-2 py-2.5 text-sm font-black text-blue-600 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex gap-2">
              <button
                onClick={() => chooseIgv(true)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                  igvChosen && draft.has_igv ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                IGV 18%
              </button>
              <button
                onClick={() => chooseIgv(false)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                  igvChosen && !draft.has_igv ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                Exonerado
              </button>
            </div>
            {!igvChosen && (
              <p className="text-[10px] font-bold text-amber-500 mt-2 ml-1 uppercase tracking-wide">
                Elige IGV o Exonerado para continuar
              </p>
            )}
          </div>

          {offerSaveToCatalog && (
            <label className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveToCatalog}
                onChange={() => setSaveToCatalog((prev) => !prev)}
                className="w-5 h-5 rounded accent-emerald-600 cursor-pointer"
              />
              <span className="text-[11px] font-black uppercase text-slate-500">
                Guardar en mi catálogo
              </span>
            </label>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-white border border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl active:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-[2] py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isEditing ? 'Guardar cambios' : 'Agregar producto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductFormModal;
