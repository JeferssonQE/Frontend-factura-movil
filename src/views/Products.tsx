// views/Products.tsx

import {
  AlertCircle,
  AlertTriangle,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import ProductSearchSelector from '../components/ProductSearchSelector';
import { useUnits } from '../hooks/useUnits';
import { productSchema } from '../schemas/business';
import { igvTypeLabel, unitLabel } from '../services/utils/invoiceMath';
import type { IgvType, Product, UnitOfMeasure } from '../types';

const IGV_TYPES: IgvType[] = ['GRAVADO', 'EXONERADO', 'INAFECTO'];

interface ProductsProps {
  products: Product[];
  senderId: number | null;
  onSave: (product: Product) => Promise<void>;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

const Products: React.FC<ProductsProps> = ({ products, senderId, onSave, onDelete, onRefresh }) => {
  const { units } = useUnits();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [igvType, setIgvType] = useState<IgvType>('GRAVADO');
  const [salePrice, setSalePrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const filteredProducts = products.filter(
    (product) =>
      product.sender_id === senderId &&
      product.description.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (editingProduct) {
      const price = Number(editingProduct.sale_price);
      setIgvType(editingProduct.igv_type);
      setSalePrice(price > 0 ? price.toFixed(2) : '');
      return;
    }
    setIgvType('GRAVADO');
    setSalePrice('');
  }, [editingProduct, isModalOpen]);

  const salePriceNumber = parseFloat(salePrice) || 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!senderId) return;

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const result = productSchema.safeParse({
      description: (formData.get('description') as string).trim(),
      unit: formData.get('unit') as UnitOfMeasure,
      sale_price: salePriceNumber,
      igv_type: igvType,
    });

    if (!result.success) {
      setFormError(result.error.issues[0].message);
      return;
    }

    const product: Product = {
      id: editingProduct?.id || Date.now(),
      sender_id: senderId,
      description: result.data.description,
      unit: result.data.unit,
      sale_price: result.data.sale_price,
      igv_type: result.data.igv_type,
    };

    setIsSaving(true);
    try {
      await onSave(product);
      setIsModalOpen(false);
      setEditingProduct(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (confirmDeleteId === null) return;
    onDelete(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-4 relative">
      <div className="flex gap-2">
        <div className="flex-1">
          <ProductSearchSelector
            products={products.filter((product) => product.sender_id === senderId)}
            value={search}
            onChange={setSearch}
            placeholder="BUSCAR EN EL CATÁLOGO..."
            showDropdownButton={false}
          />
        </div>

        <button
          onClick={onRefresh}
          className="bg-white border border-slate-200 text-slate-400 p-3.5 rounded-2xl shadow-sm active:scale-95 transition-all hover:text-slate-600"
          aria-label="Actualizar lista"
        >
          <RefreshCw size={18} />
        </button>

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
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              Catálogo Vacío
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex justify-between items-center hover:border-blue-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-tight truncate">
                  {product.description}
                </h4>

                <div className="flex gap-2 items-center mt-1.5">
                  <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase">
                    {product.unit}
                  </span>
                  <span className="text-xs font-black text-blue-600">
                    S/ {Number(product.sale_price).toFixed(2)}
                  </span>
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase border ${
                      product.igv_type === 'GRAVADO'
                        ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                        : 'text-slate-400 bg-slate-50 border-slate-100'
                    }`}
                  >
                    {igvTypeLabel(product.igv_type)}
                  </span>
                </div>
              </div>

              <div className="flex gap-1 ml-4">
                <button
                  onClick={() => {
                    setEditingProduct(product);
                    setIsModalOpen(true);
                  }}
                  className="p-2.5 text-slate-300 hover:text-blue-600 transition-all"
                >
                  <Pencil size={18} />
                </button>

                <button
                  onClick={() => setConfirmDeleteId(product.id)}
                  className="p-2.5 text-slate-300 hover:text-red-600 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/20 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>

            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2 uppercase">
              ¿ELIMINAR PRODUCTO?
            </h3>

            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-8 leading-relaxed">
              Esta acción es permanente y no podrá recuperarse del catálogo.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleDelete}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-100 active:scale-95 transition-all"
              >
                Eliminar para siempre
              </button>

              <button
                onClick={() => setConfirmDeleteId(null)}
                className="w-full bg-white border border-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Package size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                  {editingProduct ? 'Editar' : 'Nuevo'} Producto
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
                  Descripción
                </label>
                <input
                  name="description"
                  defaultValue={editingProduct?.description}
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="EJ. ARROZ EXTRA 5KG"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Unidad
                </label>
                <select
                  name="unit"
                  defaultValue={editingProduct?.unit || 'UNIDAD'}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-blue-500 appearance-none uppercase"
                >
                  {/* La del producto que se edita va siempre, aunque la lista no haya
                      llegado: asi el desplegable nunca se ve vacio. */}
                  {(units.length ? units : [editingProduct?.unit ?? 'UNIDAD']).map((unit) => (
                    <option key={unit} value={unit}>
                      {unitLabel(unit)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Precio de Venta (S/)
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
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 ml-1">
                  Lo que cobras al cliente
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Cómo se grava
                </label>
                <div className="flex gap-2">
                  {IGV_TYPES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setIgvType(option)}
                      className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${
                        igvType === option
                          ? option === 'GRAVADO'
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      {igvTypeLabel(option)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-wide">
                    Lo que cobras
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    El desglose del IGV lo calcula el comprobante
                  </p>
                </div>
                <span className="text-sm font-black text-blue-600">
                  S/ {salePriceNumber.toFixed(2)}
                </span>
              </div>

              <div className="flex gap-3 pt-6">
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

export default Products;
