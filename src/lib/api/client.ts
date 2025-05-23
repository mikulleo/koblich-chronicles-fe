import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://koblich-chronicles-be-production.up.railway.app/api';
const DEFAULT_LIMIT = 10000; // Default limit for pagination

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  // Get token from localStorage when in browser environment
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('payload-token');
    if (token) {
      config.headers.Authorization = `JWT ${token}`;
    }
  }


  // Add pagination limit to all GET requests if not already present
  if (config.method === 'get') {
    // Initialize params object if it doesn't exist
    config.params = config.params || {};
    
    // Only set the limit if it's not already set
    if (!config.params.limit) {
      config.params.limit = DEFAULT_LIMIT;
    }
  }
  return config;
});

export default apiClient;
