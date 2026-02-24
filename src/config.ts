// ========================================
// CONFIGURACIÓN DE APIs
// ========================================

const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const port = typeof window !== 'undefined' ? window.location.port : '';
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

console.log('🔧 Config API:', {
  hostname,
  port,
  isLocalhost,
  isDevelopment: isLocalhost,
  isProduction: !isLocalhost
});

export const API_CONFIG = {
  // Entorno
  environment: isLocalhost ? 'development' : 'production',
  
  // ========================================
  // RTM API (Agendamiento)
  // ========================================
  BASE_URL: isLocalhost 
    ? '/rtm-api/'
    : '/api-proxy.php?api=rtm&path=',
  
  // ========================================
  // RUNT API (Consulta de vehículos)
  // ========================================
  RUNT_URL: isLocalhost
    ? '/runt-api/'
    : '/api-proxy.php?api=runt&path=',
  
  // ========================================
  // PAGOS API - ✅ CORREGIDO
  // ========================================
  PAGOS_URL: isLocalhost
    ? '/pagos-api/'
    : '/api-proxy.php?api=pagos&path=',  // ✅ AHORA USA EL PROXY
};