import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Khởi tạo user từ localStorage (nếu trước đó đã login)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("customer_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const token = localStorage.getItem("customer_token");
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
          localStorage.setItem("customer_user", JSON.stringify(data.user));
          setIsLoggedIn(true);
        } else {
          throw new Error("Token không hợp lệ");
        }
      } catch (err) {
        // Token sai hoặc hết hạn
        console.error("Token không hợp lệ:", err);
        localStorage.removeItem("customer_token");
        localStorage.removeItem("customer_user");
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
    setIsLoggedIn(true);
    localStorage.setItem("customer_user", JSON.stringify(userData));
    localStorage.setItem("customer_token", token);
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem("customer_user");
    localStorage.removeItem("customer_token");
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
