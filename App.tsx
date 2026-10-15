// App.tsx
import { AppDataProvider } from './src/context/AppDataContext';
import AppRouter from './src/routes/AppRouter';
import OfflineOverlay from './src/components/OfflineOverlay';
import UpdatePrompt from './src/components/UpdatePrompt';

export default function App() {
  return (
    <AppDataProvider>
      <AppRouter />
      <UpdatePrompt />
      <OfflineOverlay />
    </AppDataProvider>
  );
}