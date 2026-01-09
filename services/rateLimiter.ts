// services/rateLimiter.ts - Control de uso de IA por usuario

const DAILY_LIMIT = 5; // 5 extracciones por usuario por día (ajustado a tier FREE)
const STORAGE_KEY = 'gemini_usage';

interface UsageRecord {
  count: number;
  date: string;
}

export const checkRateLimit = (userId: string): { allowed: boolean; remaining: number } => {
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `${STORAGE_KEY}_${userId}`;
  
  // Obtener uso actual
  const stored = localStorage.getItem(storageKey);
  let usage: UsageRecord = stored ? JSON.parse(stored) : { count: 0, date: today };
  
  // Resetear si es un nuevo día
  if (usage.date !== today) {
    usage = { count: 0, date: today };
  }
  
  const remaining = DAILY_LIMIT - usage.count;
  const allowed = usage.count < DAILY_LIMIT;
  
  return { allowed, remaining };
};

export const incrementUsage = (userId: string): void => {
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `${STORAGE_KEY}_${userId}`;
  
  const stored = localStorage.getItem(storageKey);
  let usage: UsageRecord = stored ? JSON.parse(stored) : { count: 0, date: today };
  
  if (usage.date !== today) {
    usage = { count: 0, date: today };
  }
  
  usage.count++;
  localStorage.setItem(storageKey, JSON.stringify(usage));
};

export const getRemainingUsage = (userId: string): number => {
  const { remaining } = checkRateLimit(userId);
  return remaining;
};
