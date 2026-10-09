// components/ProductSearchSelector.tsx

import { ChevronDown, Package } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { igvTypeLabel } from '../services/utils/invoiceMath';
import type { Product } from '../types';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Input from './ui/Input';

interface ProductSearchSelectorProps {
  products: Product[];
  onSelectProduct?: (product: Product) => void;
  onSearchChange?: (searchTerm: string) => void;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  showDropdownButton?: boolean;
}

const ProductSearchSelector: React.FC<ProductSearchSelectorProps> = ({
  products,
  onSelectProduct,
  onSearchChange,
  placeholder = 'Nombre del producto',
  value = '',
  onChange,
  showDropdownButton = true,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const filteredProducts = products.filter((product) =>
    product.description.toLowerCase().includes(value.toLowerCase()),
  );

  const handleInputChange = (inputValue: string) => {
    onChange?.(inputValue);
    onSearchChange?.(inputValue);
    setIsDropdownOpen(true);
    setIsCatalogOpen(false);
  };

  const closeLists = () => {
    setIsDropdownOpen(false);
    setIsCatalogOpen(false);
  };

  const handleSelectProduct = (product: Product) => {
    onSelectProduct?.(product);
    onChange?.(product.description);
    closeLists();
  };

  const handleCatalogToggle = () => {
    setIsCatalogOpen(!isCatalogOpen);
    setIsDropdownOpen(false);
  };

  // Buscar y abrir el catalogo completo son excluyentes (cada accion cierra a la otra),
  // asi que a lo sumo hay una lista visible.
  const showSearchResults = isDropdownOpen && value && filteredProducts.length > 0;
  const showCatalog = isCatalogOpen && products.length > 0;
  const visibleProducts = showSearchResults ? filteredProducts : showCatalog ? products : null;

  return (
    <div className="relative">
      <Input
        type="text"
        value={value}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => value && setIsDropdownOpen(true)}
        placeholder={placeholder}
        aria-label="Nombre del producto"
        className="uppercase"
        trailing={
          showDropdownButton && products.length > 0 ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCatalogToggle}
              aria-label="Ver mi catálogo"
              aria-expanded={isCatalogOpen}
            >
              <ChevronDown
                size={18}
                className={`transition-transform ${isCatalogOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          ) : null
        }
      />

      {visibleProducts && (
        <>
          <button
            type="button"
            aria-label="Cerrar lista"
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={closeLists}
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-card border border-slate-200 bg-white p-2 shadow-xl">
            {visibleProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelectProduct(product)}
                className="flex w-full items-center gap-3 rounded-control p-3 text-left transition-colors hover:bg-slate-50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Package size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold uppercase text-slate-900">
                    {product.description}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      S/ {Number(product.sale_price).toFixed(2)}
                    </span>
                    <Badge>{product.unit}</Badge>
                    <Badge tone={product.igv_type === 'GRAVADO' ? 'success' : 'neutral'}>
                      {igvTypeLabel(product.igv_type)}
                    </Badge>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductSearchSelector;
