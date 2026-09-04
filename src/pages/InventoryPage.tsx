// src/pages/InventoryPage.tsx
import type React from 'react';
import { useEffect } from 'react';
import { useAppData } from '../context/AppDataContext';
import Inventory from '../views/Inventory';

const InventoryPage: React.FC = () => {
  const { inventory, inventoryEnabled, activeSenderId, saveInventoryItem, refreshInventory } =
    useAppData();

  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  return (
    <Inventory
      inventory={inventory}
      inventoryEnabled={inventoryEnabled}
      senderId={activeSenderId}
      onSave={saveInventoryItem}
      onRefresh={refreshInventory}
    />
  );
};

export default InventoryPage;
