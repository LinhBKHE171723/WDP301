// src/api.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:9999/api";

//  Tạo instance axios riêng
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

//  Thêm token vào header mỗi khi request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

//  Xử lý response lỗi chung
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Nếu token hết hạn → logout
      if (error.response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
      return Promise.reject(
        new Error(error.response.data?.message || "API Error")
      );
    } else {
      return Promise.reject(error);
    }
  }
);

//  Các hàm helper
export const apiGet = (url, params) => api.get(url, { params });
export const apiPost = (url, data) => api.post(url, data);
export const apiPut = (url, data) => api.put(url, data);
export const apiDelete = (url) => api.delete(url);

export default api;
