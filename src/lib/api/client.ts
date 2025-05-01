import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://koblich-chronicles-be-production.up.railway.app/api';

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
  return config;
});

export default apiClient;
