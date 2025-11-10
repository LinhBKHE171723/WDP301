import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/LoginPage";
import KitchenDashboard from "../pages/KitchenDashboard";
import WaiterDashboard from "../pages/WaiterDashboard";
import TableMap from "../components/waiter/TableMap";
import TableDetail from "../components/waiter/TableDetail";
import Profile from "../components/user/Profile";
import ServingHistory from "../components/waiter/ServingHistory";
import ServingHistoryDetail from "../components/waiter/ServingHistoryDetail";
import Attendance from "../components/user/Attendance";
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
import PreOrderPage from "../pages/admin/PreOrderPage";
import AdminPreOrderNotification from "../components/admin/AdminPreOrderNotification";
import CashierShiftManager from "../components/cashier/CashierShiftManager";
import CashierDashboard from "../components/cashier/CashierDashboard";
import OrderPayment from "../components/cashier/order-payment";
import TableManagement from "../components/cashier/table-management";
import UnpaidOrdersList from "../components/cashier/Unpaid-orders-list";

// auth 
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";

function AdminCashierDashboardRoute() {
  const navigate = useNavigate();
  const [shiftData, setShiftData] = useState({
    startTime: new Date().toISOString(),
    endTime: null,
    openingCash: 500000,
    closingCash: null,
    isShiftOpen: true,
    pettyCashTransactions: [],
  });

  const shiftInfo = {
    startTime: shiftData.startTime,
    openingCash: shiftData.openingCash || 0,
  };

  const handleCloseShift = () => {
    navigate("/admin/cashier/shift");
  };

  const handleAddPettyCash = (transaction) => {
    setShiftData((prev) => ({
      ...prev,
      pettyCashTransactions: [transaction, ...(prev.pettyCashTransactions || [])],
    }));
  };

  const handlePrintXReport = () => {
    window.print();
  };

  return (
    <CashierDashboard
      shiftInfo={shiftInfo}
      shiftData={shiftData}
      onCloseShift={handleCloseShift}
      onAddPettyCash={handleAddPettyCash}
      onPrintXReport={handlePrintXReport}
    />
  );
}

function AdminCashierUnpaidOrdersRoute() {
  const navigate = useNavigate();

  const handleBack = () => navigate("/admin/cashier/dashboard");

  const handlePaymentComplete = () => {
    navigate("/admin/cashier/dashboard");
  };

  return <UnpaidOrdersList onBack={handleBack} onPaymentComplete={handlePaymentComplete} />;
}

function AdminCashierTableManagementRoute() {
  const navigate = useNavigate();
  return <TableManagement onBack={() => navigate("/admin/cashier/dashboard")} />;
}

function AdminCashierOrderPaymentRoute() {
  const navigate = useNavigate();

  const demoOrder = useMemo(
    () => ({
      id: 999,
      orderNumber: "ĐH-DEM0",
      tableNumber: "Bàn DEMO",
      orderTime: new Date().toISOString(),
      items: [
        { id: 1, name: "Phở Bò", quantity: 1, price: 75000 },
        { id: 2, name: "Trà Đá", quantity: 2, price: 10000 },
      ],
      totalAmount: 95000,
    }),
    []
  );

  return (
    <OrderPayment
      order={demoOrder}
      onBack={() => navigate("/admin/cashier/dashboard")}
      onPaymentComplete={() => navigate("/admin/cashier/dashboard")}
    />
  );
}

function CashierApp() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminCashierDashboardRoute />} />
      <Route path="shift" element={<CashierShiftManager />} />
      <Route path="orderpayment" element={<AdminCashierOrderPaymentRoute />} />
      <Route path="unpaid" element={<AdminCashierUnpaidOrdersRoute />} />
      <Route path="tables" element={<AdminCashierTableManagementRoute />} />
      <Route path="preorders" element={<PreOrderPage />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
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
      {/* Nếu đã đăng nhập rồi thì không cho vào trang quên mật khẩu / đặt lại mật khẩu */}
      <Route
        path="forgot-password"
        element={
          isLoggedIn && token ? (
            <Navigate to="/" replace />
          ) : (
            <ForgotPassword />
          )
        }
      />

      <Route
        path="/reset-password"
        element={
          isLoggedIn && token ? (
            <Navigate to="/" replace />
          ) : (
            <ResetPassword />
          )
        }
      />

      {/* Redirect root path về login nếu chưa đăng nhập */}
      <Route
        path="/"
        element={
          !isLoggedIn || !token ? (
            <Navigate to="/auth/login" replace />
          ) : user?.role === "admin" ? (
            <Navigate to="/admin" replace />
          ) : user?.role === "cashier" ? (
            <Navigate to="/admin/cashier/dashboard" replace />
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
                <AdminPreOrderNotification />
                <div className="flex">
                  <Sidebar />
                  <main className="flex-1 p-6 space-y-6 ml-64">
                    <Header />
                    <div className="container-page">
                      <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/preorders" element={<PreOrderPage />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/item-report" element={<ItemReportPage />} />
                        <Route path="item-analytics/:itemId" element={<AnalyticsPage2 />} />
                        <Route path="/accounts" element={<AccountsPage />} />
                        <Route path="/feedback" element={<FeedbackPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/customers" element={<CustomerReportPage />} />
                        <Route path="/performance" element={<PerformancePage />} />
                        <Route path="performance/:userId" element={<PerformanceDetailPage />} />
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
          <Route path="/user/attendance" element={<Attendance />} />
        </>
      )}

      {isLoggedIn && user?.role === "cashier" && token && (
        <Route path="/admin/cashier/*" element={<CashierApp />} />
      )}

      {/* Nếu user điền URL linh tinh hoặc cố tình điền url ko thuộc role của mình */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
