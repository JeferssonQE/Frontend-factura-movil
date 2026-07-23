// src/pages/InventoryPage.tsx
import React, { useEffect } from 'react';
import Inventory from '../views/Inventory';
import { useAppData } from '../context/AppDataContext';

const InventoryPage: React.FC = () => {
  const { inventory, activeSenderId, saveInventoryItem, refreshInventory } = useAppData();

  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  return (
    <Inventory
      inventory={inventory}
      senderId={activeSenderId}
      onSave={saveInventoryItem}
      onRefresh={refreshInventory}
    />
  );
};

export default InventoryPage;
