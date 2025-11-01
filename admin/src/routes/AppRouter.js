import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/LoginPage";
import KitchenDashboard from "../pages/KitchenDashboard";
import WaiterDashboard from "../pages/WaiterDashboard";
import TableMap from "../components/waiter/TableMap";
import TableDetail from "../components/waiter/TableDetail";
import Profile from "../components/user/Profile";
import ServingHistory from "../components/waiter/ServingHistory";
import ServingHistoryDetail from "../components/waiter/ServingHistoryDetail";
// Admin components
import Sidebar from "../components/admin/Sidebar";
import { Header } from "../components/admin/Header";
import DashboardPage from "../pages/admin/DashboardPage";
import AnalyticsPage from "../pages/admin/AnalyticsPage";
import AnalyticsPage2 from "../pages/admin/AnalyticsPage2";
import AccountsPage from "../pages/admin/AccountsPage";
import FeedbackPage from "../pages/admin/FeedbackPage";
import SettingsPage from "../pages/admin/SettingsPage";
import { Toaster } from "sonner";
import ItemReportPage from "../pages/admin/ItemReportPage";
import CustomerReportPage from "../pages/admin/CustomerReportPage";
import PerformancePage from "../pages/admin/PerformancePage";
import PerformanceDetailPage from "../pages/admin/PerformancePageDetail";

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
      {/* Route login luôn có sẵn (không cần điều kiện) */}
      <Route path="/auth/login" element={<LoginPage />} />

      {/* Redirect root path về login nếu chưa đăng nhập */}
      <Route
        path="/"
        element={
          !isLoggedIn || !token ? (
            <Navigate to="/auth/login" replace />
          ) : user?.role === "admin" ? (
            <Navigate to="/admin" replace />
          ) : user?.role === "kitchen_manager" ? (
            <Navigate to="/kitchen/dashboard" replace />
          ) : user?.role === "waiter" ? (
            <Navigate to="/waiter/dashboard" replace />
          ) : (
            <Navigate to="/auth/login" replace />
          )
        }
      />

      {/* Nếu đã đăng nhập và có quyền admin */}
      {isLoggedIn && user?.role === "admin" && token && (
        <>
          <Route
            path="/admin/*"
            element={
              <div className="min-h-screen">
                <div className="flex">
                  <Sidebar />
                  <main className="flex-1 p-6 space-y-6 ml-64">
                    <Header />
                    <div className="container-page">
                      <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/item-report" element={<ItemReportPage />} />
                        <Route path="/item-analytics/:itemId" element={<AnalyticsPage2 />} />
                        <Route path="/accounts" element={<AccountsPage />} />
                        <Route path="/feedback" element={<FeedbackPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/customers" element={<CustomerReportPage />} />
                        <Route path="/performance" element={<PerformancePage />} />
                        <Route path="/performance/:userId" element={<PerformanceDetailPage />} />
                      </Routes>
                    </div>
                  </main>
                </div>
                <Toaster richColors position="top-right" />
              </div>
            }
          />
        </>
      )}

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
          <Route path="/waiter/orders/history" element={<ServingHistory />} />
          <Route path="/waiter/orders/history/:orderId" element={<ServingHistoryDetail />} />
          <Route path="/profile" element={<Profile />} />
        </>
      )}

      {/* Nếu user điền URL linh tinh hoặc cố tình điền url ko thuộc role của mình */}
      <Route
        path="*"
        element={
          !isLoggedIn || !token ? (
            <Navigate to="/auth/login" replace />
          ) : user?.role === "admin" ? (
            <Navigate to="/admin" replace />
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
