// App configuration constants
export const API_BASE_URL = 'https://api.pcmonitoring.example.com'; // Replace with actual API URL

export const APP_CONFIG = {
  refreshInterval: 30000, // 30 seconds for auto-refresh
  sessionTimeout: 3600000, // 1 hour session timeout
  maxRetries: 3,
  defaultPageSize: 20,
  cacheDuration: 5 * 60 * 1000, // 5 minutes cache duration
};
