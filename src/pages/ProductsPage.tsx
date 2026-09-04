// src/pages/ProductsPage.tsx
import type React from 'react';
import { useAppData } from '../context/AppDataContext';
import Products from '../views/Products';

const ProductsPage: React.FC = () => {
  const { products, activeSenderId, saveProduct, deleteProduct, refreshAllData } = useAppData();

  return (
    <Products
      products={products}
      senderId={activeSenderId}
      onSave={saveProduct}
      onDelete={deleteProduct}
      onRefresh={refreshAllData}
    />
  );
};

export default ProductsPage;
