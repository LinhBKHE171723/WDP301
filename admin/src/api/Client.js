import axios from "axios";
console.log("Base URL:", process.env.REACT_APP_API_URL);
const Client = axios.create({
  baseURL: process.env.REACT_APP_API_URL, // URL backend (đặt trong .env)
  // headers: cấu hình mặc định cho tất cả request — ở đây là gửi dữ liệu dạng JSON
  headers: {
    "Content-Type": "application/json",
  },
  // timeout: thời gian chờ tối đa cho 1 request (10 giây). Hết thời gian → lỗi timeout.
  timeout: 10000,
});

// Interceptor REQUEST: chạy TRƯỚC khi gửi request đi (cụ thể là gắN token vào mỗi request)
Client.interceptors.request.use((config) => {  
  const token = localStorage.getItem("token");
  // Nếu có token thì thêm vào header Authorization (chuẩn Bearer Token)
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Trả về config đã chỉnh sửa để axios tiếp tục gửi request
  return config;
});

// Interceptor RESPONSE: chạy SAU khi nhận được phản hồi từ server
Client.interceptors.response.use(
  // Nếu thành công → chỉ lấy phần data (thay vì lấy nguyên response)
  (res) => res.data,
  // Nếu thất bại → xử lý lỗi tập trung
  (err) => {
    console.error("API error:", err.response || err.message); // In chi tiết lỗi ra console (để debug)
    
    // Nếu lỗi 401 (Unauthorized) - token invalid hoặc user không tồn tại
    if (err.response?.status === 401) {
      // Clear token và user khỏi localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Redirect về trang login
      window.location.href = "/login";
    }
    
    return Promise.reject(err.response?.data || { message: "Lỗi kết nối" });
  }
);

export default Client;
