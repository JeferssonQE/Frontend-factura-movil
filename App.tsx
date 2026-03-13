// App.tsx
import { AppDataProvider } from './src/context/AppDataContext';
import AppRouter from './src/routes/AppRouter';

export default function App() {
  return (
    <AppDataProvider>
      <AppRouter />
    </AppDataProvider>
  );
}