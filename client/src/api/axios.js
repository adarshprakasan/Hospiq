import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api'; // Update if using .env or deploying

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // if using cookies — safe to keep on
});

// ✅ Automatically attach token from localStorage (if available)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // or sessionStorage if that's what you're using
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
