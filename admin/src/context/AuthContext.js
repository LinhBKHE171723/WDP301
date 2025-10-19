import { createContext, useContext, useState, useEffect } from "react";
import Client from "../api/Client";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Khởi tạo user từ localStorage (nếu trước đó đã login)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false); // biến isLoggedIn này để duy trì trạng thái đăng nhập, tránh back lại trang login khi đã đăng nhập
  
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  // loading dùng để biểu thị app đang trong quá trình kiểm tra token xác thực, nên chưa thể biết isLoggedIn 
  // là true hay false, tránh việc truyền token cũ xuống các component con trước khi xác thực xong hoặc bị sửa token mà vẫn đăng nhập dc 


  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
      try {
        // Gọi API xác minh token
        const res = await Client.get("auth/checkme", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Nếu hợp lệ thì cập nhật user và login state
        setUser(res.user);
        localStorage.setItem("user", JSON.stringify(res.user)); // đảm bảo user luôn mới nhất , tránh sửa role rồi hack vào trang không đúng quyền
        setIsLoggedIn(true);
      } catch (err) {
        // Token sai hoặc hết hạn
        console.error("Token không hợp lệ:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    setIsLoggedIn(true);
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook tiện dụng để truy cập AuthContext mà không cần import useContext và AuthContext
export const useAuth = () => useContext(AuthContext);
