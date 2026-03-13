// config/sunat.config.ts - Configuración centralizada para API SUNAT

export const SUNAT_CONFIG = {
  // URL del backend API SUNAT
  API_BASE_URL: import.meta.env.VITE_SUNAT_API_URL || 'https://goldfish-app-7uiin.ondigitalocean.app',
  
  // Modo de operación
  IS_PRODUCTION: true, // true = Emite a SUNAT real, false = Modo simulación
  
  // Configuración de polling
  POLL_INTERVAL: 5000, // 5 segundos
  MAX_TIMEOUT: 300000, // 5 minutos
  
  // Endpoints
  ENDPOINTS: {
    HEALTH: '/api/v1/health',
    EMITIR: '/api/v1/emitir',
    EMITIR_NOTA_CREDITO: '/api/v1/emitir-nota-credito',
    STATUS: '/api/v1/status',
    VALIDATE: '/api/v1/validate'
  },
  
  // Configuración de reintentos
  RETRY_CONFIG: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000, // 2 segundos
    BACKOFF_MULTIPLIER: 2
  }
};

// Función para verificar si está en modo producción
export const isProductionMode = (): boolean => {
  return SUNAT_CONFIG.IS_PRODUCTION && !import.meta.env.DEV;
};

// Función para obtener la URL completa del endpoint
export const getEndpointUrl = (endpoint: keyof typeof SUNAT_CONFIG.ENDPOINTS): string => {
  return `${SUNAT_CONFIG.API_BASE_URL}${SUNAT_CONFIG.ENDPOINTS[endpoint]}`;
};

// Función para logging de configuración
export const logSunatConfig = (): void => {
  console.log('🔧 SUNAT API Configuration:');
  console.log(`   📡 Base URL: ${SUNAT_CONFIG.API_BASE_URL}`);
  console.log(`   🚀 Production Mode: ${isProductionMode() ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   ⏱️  Poll Interval: ${SUNAT_CONFIG.POLL_INTERVAL}ms`);
  console.log(`   ⏰ Max Timeout: ${SUNAT_CONFIG.MAX_TIMEOUT}ms`);
};