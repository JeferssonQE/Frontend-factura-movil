// App.tsx
import { AppDataProvider } from './src/context/AppDataContext';
import AppRouter from './src/routes/AppRouter';
import OfflineOverlay from './src/components/OfflineOverlay';

export default function App() {
  return (
    <AppDataProvider>
      <AppRouter />
      <OfflineOverlay />
    </AppDataProvider>
  );
}