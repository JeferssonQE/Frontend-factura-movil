// src/pages/ProductsPage.tsx
import React from 'react';
import Products from '../views/Products';
import { useAppData } from '../context/AppDataContext';

const ProductsPage: React.FC = () => {
  const { products, activeSenderId, saveProduct, deleteProduct } = useAppData();

  return (
    <Products
      products={products}
      senderId={activeSenderId}
      onSave={saveProduct}
      onDelete={deleteProduct}
    />
  );
};

export default ProductsPage;
