// services/geminiMonitor.ts - Monitor de uso de Gemini API

interface UsageStats {
  requestsToday: number;
  lastReset: string;
  errors: number;
}

const STORAGE_KEY = 'gemini_monitor';

export const trackRequest = (success: boolean): void => {
  const today = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem(STORAGE_KEY);
  let stats: UsageStats = stored ? JSON.parse(stored) : { requestsToday: 0, lastReset: today, errors: 0 };
  
  // Resetear si es un nuevo día
  if (stats.lastReset !== today) {
    stats = { requestsToday: 0, lastReset: today, errors: 0 };
  }
  
  stats.requestsToday++;
  if (!success) stats.errors++;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

export const getUsageStats = (): UsageStats => {
  const today = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem(STORAGE_KEY);
  let stats: UsageStats = stored ? JSON.parse(stored) : { requestsToday: 0, lastReset: today, errors: 0 };
  
  if (stats.lastReset !== today) {
    stats = { requestsToday: 0, lastReset: today, errors: 0 };
  }
  
  return stats;
};

export const getHealthStatus = (): 'healthy' | 'warning' | 'critical' => {
  const stats = getUsageStats();
  const errorRate = stats.requestsToday > 0 ? stats.errors / stats.requestsToday : 0;
  
  if (errorRate > 0.5) return 'critical'; // Más del 50% de errores
  if (errorRate > 0.2) return 'warning';  // Más del 20% de errores
  return 'healthy';
};
