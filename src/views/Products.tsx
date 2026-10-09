// views/Products.tsx

import { Package, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import ProductSearchSelector from '../components/ProductSearchSelector';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDeleteDialog from '../components/ui/ConfirmDeleteDialog';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Notice from '../components/ui/Notice';
import SegmentedControl from '../components/ui/SegmentedControl';
import Select from '../components/ui/Select';
import { useUnits } from '../hooks/useUnits';
import { productSchema } from '../schemas/business';
import { igvTypeLabel, unitLabel } from '../services/utils/invoiceMath';
import type { IgvType, Product, UnitOfMeasure } from '../types';

const IGV_TYPES: IgvType[] = ['GRAVADO', 'EXONERADO', 'INAFECTO'];
const IGV_OPTIONS = IGV_TYPES.map((igvType) => ({
  value: igvType,
  label: igvTypeLabel(igvType),
}));

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

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

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
    <div className="relative space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <ProductSearchSelector
            products={products.filter((product) => product.sender_id === senderId)}
            value={search}
            onChange={setSearch}
            placeholder="Buscar en el catálogo…"
            showDropdownButton={false}
          />
        </div>

        <Button variant="outline" size="icon-lg" onClick={onRefresh} aria-label="Actualizar lista">
          <RefreshCw size={18} />
        </Button>

        <Button
          size="icon-lg"
          onClick={openCreateModal}
          disabled={!senderId}
          aria-label="Agregar producto"
        >
          <Plus size={22} />
        </Button>
      </div>

      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <Card dashed className="py-16 text-center">
            <Package size={48} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">
              {search ? 'Ningún producto coincide con la búsqueda.' : 'Tu catálogo está vacío.'}
            </p>
          </Card>
        ) : (
          filteredProducts.map((product) => (
            <Card key={product.id} className="flex items-center justify-between p-4">
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-semibold uppercase text-slate-900">
                  {product.description}
                </h4>

                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge>{product.unit}</Badge>
                  <span className="text-sm font-semibold text-slate-700">
                    S/ {Number(product.sale_price).toFixed(2)}
                  </span>
                  <Badge tone={product.igv_type === 'GRAVADO' ? 'success' : 'neutral'}>
                    {igvTypeLabel(product.igv_type)}
                  </Badge>
                </div>
              </div>

              <div className="ml-4 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditModal(product)}
                  aria-label={`Editar ${product.description}`}
                >
                  <Pencil size={18} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmDeleteId(product.id)}
                  aria-label={`Eliminar ${product.description}`}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {confirmDeleteId !== null && (
        <ConfirmDeleteDialog
          title="¿Eliminar producto?"
          message="Esta acción es permanente y no podrá recuperarse del catálogo."
          confirmLabel="Eliminar para siempre"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {isModalOpen && (
        <Modal
          layout="form"
          title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
          icon={<Package size={22} />}
          iconTone="accent"
          onClose={() => setIsModalOpen(false)}
        >
          {formError && (
            <div className="mb-4">
              <Notice tone="danger">{formError}</Notice>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Descripción"
              name="description"
              defaultValue={editingProduct?.description}
              required
              className="uppercase"
              placeholder="Ej. Arroz extra 5 kg"
            />

            <Select label="Unidad" name="unit" defaultValue={editingProduct?.unit || 'UNIDAD'}>
              {/* La del producto que se edita va siempre, aunque la lista no haya
                  llegado: asi el desplegable nunca se ve vacio. */}
              {(units.length ? units : [editingProduct?.unit ?? 'UNIDAD']).map((unit) => (
                <option key={unit} value={unit}>
                  {unitLabel(unit)}
                </option>
              ))}
            </Select>

            <div>
              <Input
                label="Precio de venta (S/)"
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(event) => setSalePrice(event.target.value)}
                required
                placeholder="0.00"
              />
              <p className="ml-1 mt-1.5 text-xs text-slate-500">Lo que cobras al cliente</p>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Cómo se grava</span>
              <SegmentedControl
                options={IGV_OPTIONS}
                value={igvType}
                onChange={setIgvType}
                aria-label="Afectación al IGV"
              />
            </div>

            <Card tone="muted" className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Lo que cobras</p>
                <p className="text-xs text-slate-500">
                  El desglose del IGV lo calcula el comprobante
                </p>
              </div>
              <span className="shrink-0 text-base font-bold text-slate-900">
                S/ {salePriceNumber.toFixed(2)}
              </span>
            </Card>

            <div className="pt-2">
              <Button type="submit" fullWidth loading={isSaving}>
                {isSaving ? 'Guardando…' : 'Guardar producto'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Products;
