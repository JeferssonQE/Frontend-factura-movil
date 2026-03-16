// components/ProductSearchSelector.tsx
import React, { useState, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Product } from '../types';

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
  placeholder = "NOMBRE DEL PRODUCTO",
  value = '',
  onChange,
  showDropdownButton = true
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  
  const filteredProducts = products.filter(product =>
    product.description.toLowerCase().includes(value.toLowerCase())
  );

  const handleInputChange = (inputValue: string) => {
    onChange?.(inputValue);
    onSearchChange?.(inputValue);
    setIsDropdownOpen(true);
    setIsCatalogOpen(false);
  };

  const handleSelectProduct = (product: Product) => {
    onSelectProduct?.(product);
    onChange?.(product.description);
    setIsDropdownOpen(false);
    setIsCatalogOpen(false);
  };

  const handleCatalogToggle = () => {
    setIsCatalogOpen(!isCatalogOpen);
    setIsDropdownOpen(false);
  };

  const shouldShowSearchDropdown = isDropdownOpen && value && filteredProducts.length > 0;
  const shouldShowCatalogDropdown = isCatalogOpen && products.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => value && setIsDropdownOpen(true)}
          placeholder={placeholder}
          className="w-full bg-white border-2 border-blue-500 rounded-[28px] px-4 py-3 pr-16 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-slate-400 uppercase"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showDropdownButton && products.length > 0 && (
            <button
              type="button"
              onClick={handleCatalogToggle}
              className="p-2 hover:bg-blue-50 rounded-full transition-colors"
            >
              <ChevronDown 
                size={18} 
                className={`text-blue-500 transition-transform ${isCatalogOpen ? 'rotate-180' : ''}`} 
              />
            </button>
          )}
          <div className="p-2">
            <Search size={18} className="text-blue-500" />
          </div>
        </div>
      </div>

      {/* Dropdown de resultados de búsqueda */}
      {shouldShowSearchDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-slate-200 rounded-[20px] shadow-xl max-h-60 overflow-y-auto">
          <div className="p-2">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="w-full text-left p-3 hover:bg-blue-50 rounded-[16px] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <span className="text-blue-600 text-xs font-black">📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-sm truncate uppercase">
                      {product.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-blue-600">
                        S/ {product.base_price.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase">
                        {product.unit}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase ${
                        product.has_igv
                          ? 'text-emerald-600 bg-emerald-50'
                          : 'text-slate-400 bg-slate-50'
                      }`}>
                        {product.has_igv ? 'Afecto' : 'Exonerado'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dropdown del catálogo completo */}
      {shouldShowCatalogDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-slate-200 rounded-[20px] shadow-xl max-h-60 overflow-y-auto">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-2">
              📦 Seleccionar del catálogo
            </div>
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="w-full text-left p-3 hover:bg-blue-50 rounded-[16px] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <span className="text-blue-600 text-xs font-black">📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-sm truncate uppercase">
                      {product.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-blue-600">
                        S/ {product.base_price.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase">
                        {product.unit}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase ${
                        product.has_igv
                          ? 'text-emerald-600 bg-emerald-50'
                          : 'text-slate-400 bg-slate-50'
                      }`}>
                        {product.has_igv ? 'Afecto' : 'Exonerado'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay para cerrar dropdowns */}
      {(shouldShowSearchDropdown || shouldShowCatalogDropdown) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsDropdownOpen(false);
            setIsCatalogOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ProductSearchSelector;