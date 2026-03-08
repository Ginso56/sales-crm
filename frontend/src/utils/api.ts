import axios from 'axios';

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 for non-auth endpoints (avoid loop)
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/api/auth/me') &&
      !error.config?.url?.includes('/api/auth/login')
    ) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
