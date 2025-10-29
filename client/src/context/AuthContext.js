import { createContext, useContext, useState, useEffect } from "react";
import { getCookie, setCookie, eraseCookie } from "../utils/cookie";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Khởi tạo user từ cookie (nếu trước đó đã login)
  const [user, setUser] = useState(() => {
    const saved = getCookie("customer_user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const token = getCookie("customer_token");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
      try {
        // Gọi API xác minh token
        const res = await fetch("http://localhost:5000/api/auth/checkme", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          // Nếu hợp lệ thì cập nhật user và login state
          setUser(data.user);
          setCookie("customer_user", JSON.stringify(data.user));
          setIsLoggedIn(true);
        } else {
          throw new Error("Token không hợp lệ");
        }
      } catch (err) {
        // Token sai hoặc hết hạn
        console.error("Token không hợp lệ:", err);
        eraseCookie("customer_token");
        eraseCookie("customer_user");
        setUser(null);
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const login = (userData, tokenValue) => {
    setUser(userData);
    setIsLoggedIn(true);
    setCookie("customer_user", JSON.stringify(userData));
    setCookie("customer_token", tokenValue);
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    eraseCookie("customer_user");
    eraseCookie("customer_token");
    // Xoá luôn order đang theo dõi nếu có
    eraseCookie("current_order_id");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
