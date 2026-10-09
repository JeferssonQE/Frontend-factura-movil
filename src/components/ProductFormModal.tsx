// components/ProductFormModal.tsx

import { ShoppingCart } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useUnits } from '../hooks/useUnits';
import {
  createEmptyItem,
  igvTypeLabel,
  recalcItem,
  unitLabel,
} from '../services/utils/invoiceMath';
import type { IgvType, InvoiceItem, Product, UnitOfMeasure } from '../types';
import ProductSearchSelector from './ProductSearchSelector';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';
import SegmentedControl from './ui/SegmentedControl';
import Select from './ui/Select';

const IGV_TYPES: IgvType[] = ['GRAVADO', 'EXONERADO', 'INAFECTO'];
const IGV_OPTIONS = IGV_TYPES.map((igvType) => ({
  value: igvType,
  label: igvTypeLabel(igvType),
}));

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
  const { units, failed: unitsFailed } = useUnits();
  const isEditing = initialItem !== null;
  const [draft, setDraft] = useState<InvoiceItem>(initialItem ?? createEmptyItem());
  const [saveToCatalog, setSaveToCatalog] = useState(false);
  const [igvChosen, setIgvChosen] = useState(isEditing);

  const updateDraft = (updates: Partial<InvoiceItem>) =>
    setDraft((prev) => recalcItem(prev, updates));

  const chooseIgvType = (igvType: IgvType) => {
    setIgvChosen(true);
    setDraft((prev) => recalcItem(prev, { igv_type: igvType }));
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
          igv_type: product.igv_type,
        },
        { sale_price: product.sale_price },
      ),
    );
  };

  const canSubmit = draft.description.trim().length > 0 && draft.total > 0 && igvChosen;
  const offerSaveToCatalog = canSaveToCatalog && !draft.product_id;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(
      { ...draft, description: draft.description.trim().toUpperCase() },
      saveToCatalog && offerSaveToCatalog,
    );
  };

  return (
    <Modal
      layout="form"
      title={isEditing ? 'Editar producto' : 'Agregar producto'}
      icon={<ShoppingCart size={22} />}
      iconTone="accent"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Producto</span>
          <ProductSearchSelector
            products={products}
            value={draft.description}
            onChange={(value) => updateDraft({ description: value })}
            onSelectProduct={handleSelectProduct}
            placeholder="Nombre del producto"
            showDropdownButton
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cantidad"
            type="number"
            value={draft.quantity || ''}
            onChange={(event) => updateDraft({ quantity: parseFloat(event.target.value) || 0 })}
            placeholder="1"
          />

          <Select
            label="Unidad"
            value={draft.unit}
            onChange={(event) => updateDraft({ unit: event.target.value as UnitOfMeasure })}
          >
            {/* La que ya tiene el item va siempre: sin esto, mientras carga la lista
                el desplegable se veria vacio y al tocarlo cambiaria la unidad. */}
            {(units.length ? units : [draft.unit]).map((unit) => (
              <option key={unit} value={unit}>
                {unitLabel(unit)}
              </option>
            ))}
          </Select>

          <Input
            label="Precio"
            type="number"
            step="0.01"
            value={draft.sale_price || ''}
            onChange={(event) => updateDraft({ sale_price: parseFloat(event.target.value) || 0 })}
            placeholder="0.00"
          />

          <Input
            label="Total"
            type="number"
            step="0.01"
            value={draft.total || ''}
            onChange={(event) => updateDraft({ total: parseFloat(event.target.value) || 0 })}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <SegmentedControl
            options={IGV_OPTIONS}
            value={igvChosen ? draft.igv_type : null}
            onChange={chooseIgvType}
            aria-label="Afectación al IGV"
          />
          {unitsFailed && (
            <p className="ml-1 text-sm text-warning">
              No se pudo cargar la lista de unidades; queda {unitLabel(draft.unit)}
            </p>
          )}
          {!igvChosen && (
            <p className="ml-1 text-sm text-warning">Elige cómo se grava para continuar</p>
          )}
        </div>

        {offerSaveToCatalog && (
          <label className="flex cursor-pointer select-none items-center gap-3 rounded-control bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={saveToCatalog}
              onChange={() => setSaveToCatalog((prev) => !prev)}
              className="size-5 cursor-pointer rounded accent-accent"
            />
            <span className="text-sm font-medium text-slate-700">Guardar en mi catálogo</span>
          </label>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-[2]" onClick={handleSubmit} disabled={!canSubmit}>
            {isEditing ? 'Guardar cambios' : 'Agregar producto'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProductFormModal;
