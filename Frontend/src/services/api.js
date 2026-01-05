import axios from 'axios';

const API_BASE_URL = 'http://localhost:7001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to inject user details from session storage
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (user) {
      config.headers['x-user-id'] = user.user_id || user.id;
      config.headers['x-user-role'] = user.role;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;