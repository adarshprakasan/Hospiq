import axios from 'axios';
import { clearSession } from '../utils/session';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'; // Update if using .env or deploying

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Automatically attach token from localStorage (if available)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // or sessionStorage if that's what you're using
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    const patientContext = sessionStorage.getItem("patientContext");
    if (patientContext) config.headers["X-Patient-Id"] = patientContext;
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(response => response, error => {
  if (error.response?.data?.code === "PATIENT_CONTEXT_REVOKED") { sessionStorage.removeItem("patientContext"); window.location.assign("/"); }
  if (error.response?.data?.code === "PASSWORD_CHANGE_REQUIRED" && window.location.pathname !== "/change-password") window.location.assign("/change-password");
  if (error.response?.status === 401 && !error.config?.url?.startsWith("/auth/login")) {
    clearSession();
    if (window.location.pathname !== "/login") window.location.assign("/login");
  }
  return Promise.reject(error);
});
export default axiosInstance;
