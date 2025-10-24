import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/LoginPage";
import KitchenDashboard from "../pages/KitchenDashboard";
import WaiterDashboard from "../pages/WaiterDashboard";
import TableMap from "../components/waiter/TableMap";
import TableDetail from "../components/waiter/TableDetail";
import Profile from "../components/user/Profile";
export default function AppRouter() {
  const { user, token, isLoggedIn, loading } = useAuth();
  
  /*
  function PrivateRoute({ element, roles }) {
    const { isLoggedIn, user } = useAuth();
    if (!isLoggedIn) return <Navigate to="/auth/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/auth/login" replace />;
    return element;
  }
  */

  // AppRouter để điều hướng các trang
  // Khi đang xác minh token (chưa biết login hay chưa)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 text-lg">Đang kiểm tra phiên đăng nhập...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Nếu chưa đăng nhập → chỉ cho vào trang login */}
      {!isLoggedIn && <Route path="/auth/login" element={<LoginPage />} />}

      {/* Nếu đã đăng nhập và có quyền kitchen_manager */}
      {isLoggedIn && user?.role === "kitchen_manager" && token && (
        <Route path="/kitchen/dashboard" element={<KitchenDashboard />} />
      )}

      {/* Nếu đã đăng nhập và có quyền waiter */}
      {isLoggedIn && user?.role === "waiter" && token && (
        <>
          <Route path="/waiter/dashboard" element={<WaiterDashboard />} />
          <Route path="/waiter/tables" element={<TableMap />} /> 
          <Route path="/waiter/tables/details/:tableId" element={<TableDetail />} />  
          <Route path="/profile" element={<Profile />} />
        </>
      )}

      {/* Nếu user điền URL linh tinh hoặc cố tình điền url ko thuộc role của mình */}
      <Route
        path="*"
        element={
          !isLoggedIn || !token ? (
            <Navigate to="/auth/login" replace />
          ) : user?.role === "kitchen_manager" ? (
            <Navigate to="/kitchen/dashboard" replace />
          ) : user?.role === "waiter" ? (
            <Navigate to="/waiter/dashboard" replace />
          ) : (
            <Navigate to="/auth/login" replace />
          )
        }
      />
    </Routes>
  );
}
