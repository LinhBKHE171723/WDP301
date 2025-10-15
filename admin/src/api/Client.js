import axios from "axios";
console.log("Base URL:", process.env.REACT_APP_API_URL);
const Client = axios.create({
  baseURL: process.env.REACT_APP_API_URL, // ✅ dùng cố định cho dễ test

  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

Client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

Client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error("API error:", err.response || err.message);
    return Promise.reject(err.response?.data || { message: "Lỗi kết nối" });
  }
);

export default Client;
