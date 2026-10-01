import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance with base URL and credentials for HTTP-only cookies
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 (Unauthorized) & errors
api.interceptors.response.use(
  (response) => {
    return response?.data ?? response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // Only redirect to login if we are not already on the login page
      if (status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }

      const errorMessage = data?.message || (typeof data === 'string' ? data : 'Something went wrong');
      return Promise.reject({
        status,
        message: errorMessage,
        errors: data?.errors || null,
        data: data?.data || null,
      });
    }

    return Promise.reject({
      message: 'Network error - Cannot connect to backend server. Ensure backend is running on port 5000.',
    });
  }
);

export default api;
