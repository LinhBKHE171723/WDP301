import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/LoginPage";
import KitchenDashboard from "../pages/KitchenDashboard";

export default function AppRouter() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Luôn có route login */}
      <Route path="/auth/login" element={<LoginPage />} />

      {/* Nếu user hợp lệ */}
      {user?.role === "kitchen_manager" && (
        <Route path="/kitchen/dashboard" element={<KitchenDashboard />} />
      )}

      {/* Nếu chưa login thì đẩy về /auth/login */}
      <Route
        path="*"
        element={
          user ? (
            <Navigate to="/kitchen/dashboard" replace />
          ) : (
            <Navigate to="/auth/login" replace />
          )
        }
      />
    </Routes>
  );
}
