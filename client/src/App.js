import React, { useMemo, useState } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"

import MenuView from "./components/MenuView"
import OrderHistory from "./components/OrderHistory"
import GuestOrderHistory from "./components/GuestOrderHistory"
import OrderStatus from "./components/OrderStatus"
import "./App.css"

/* ---------- Demo wrappers để truyền props & điều hướng ---------- */

function OrderHistoryRoute() {
  const navigate = useNavigate()
  return <OrderHistory onBack={() => navigate('/reservation')} />
}

function GuestOrderHistoryRoute() {
  const navigate = useNavigate()
  return <GuestOrderHistory onBack={() => navigate('/reservation')} />
}

function OrderStatusRoute() {
  const navigate = useNavigate()
  const orderId = window.location.pathname.split('/').pop()
  
  // Nếu không có orderId thì chuyển về menu
  if (!orderId) {
    navigate('/reservation')
    return null
  }
  
  return <OrderStatus orderId={orderId} onBack={() => navigate('/reservation')} />
}

function DashboardRoute({ shiftInfo, shiftData, setShiftData }) {
  const navigate = useNavigate()

  const handleCloseShift = () => {
    // ví dụ: chuyển về trang mở/đóng ca
    navigate("/cashier/shift")
  }

  const handleAddPettyCash = (transaction) => {
    setShiftData((prev) => ({
      ...prev,
      pettyCashTransactions: [transaction, ...(prev.pettyCashTransactions || [])],
    }))
  }

  const handlePrintXReport = () => {
    window.print()
  }

  // return (
  //   <CashierDashboard
  //     shiftInfo={shiftInfo}
  //     shiftData={shiftData}
  //     onCloseShift={handleCloseShift}
  //     onAddPettyCash={handleAddPettyCash}
  //     onPrintXReport={handlePrintXReport}
  //   />
  // )
}

// function UnpaidOrdersRoute() {
//   const navigate = useNavigate()
//   const handleBack = () => navigate("/cashier/dashboard")

//   const handlePaymentComplete = (payment) => {
//     // Ở demo route standalone này, chỉ điều hướng về dashboard
//     // Nếu muốn đẩy payment vào lịch sử của dashboard qua context/store, bạn có thể thêm sau.
//     navigate("/cashier/dashboard")
//   }

  // return <UnpaidOrdersList onBack={handleBack} onPaymentComplete={handlePaymentComplete} />
// }

// function TableManagementRoute() {
//   const navigate = useNavigate()
//   return <TableManagement onBack={() => navigate("/cashier/dashboard")} />
// }

// function OrderPaymentRoute() {
//   const navigate = useNavigate()

  // Tạo demo order nếu người dùng vào trực tiếp /cashier/orderpayment
//   const demoOrder = useMemo(
//     () => ({
//       id: 999,
//       orderNumber: "ĐH-DEM0",
//       tableNumber: "Bàn DEMO",
//       orderTime: new Date().toISOString(),
//       items: [
//         { id: 1, name: "Phở Bò", quantity: 1, price: 75000 },
//         { id: 2, name: "Trà Đá", quantity: 2, price: 10000 },
//       ],
//       totalAmount: 95000,
//     }),
//     []
//   )

//   return (
//     <OrderPayment
//       order={demoOrder}
//       onBack={() => navigate("/cashier/dashboard")}
//       onPaymentComplete={() => navigate("/cashier/dashboard")}
//     />
//   )
// }

/* -------------------------- App chính -------------------------- */

function App() {
  // Table sẽ được waiter nhập sau trên hệ thống
  const defaultTable = null

  // Trạng thái ca làm (demo)
  const [shiftData, setShiftData] = useState({
    startTime: new Date().toISOString(),
    endTime: null,
    openingCash: 500000, // ví dụ
    closingCash: null,
    isShiftOpen: true,
    pettyCashTransactions: [],
  })

  const shiftInfo = {
    startTime: shiftData.startTime,
    openingCash: shiftData.openingCash || 0,
  }

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Redirect root */}
            <Route path="/" element={<Navigate to="/reservation" replace />} />

            {/* Luồng đặt chỗ - đi thẳng vào menu */}
            <Route
              path="/reservation"
              element={<MenuView table={defaultTable} onBack={() => {}} />}
            />

            {/* Lịch sử đơn hàng */}
            <Route
              path="/order-history"
              element={<OrderHistoryRoute />}
            />

            {/* Lịch sử đơn hàng cho guest users */}
            <Route
              path="/guest-order-history"
              element={<GuestOrderHistoryRoute />}
            />

            {/* Xem chi tiết đơn hàng */}
            <Route
              path="/order-status/:orderId"
              element={<OrderStatusRoute />}
            />

            {/* Trang menu demo */}
            <Route path="/menu" element={<div>Menu Page - Coming Soon!</div>} />

            
            {/* 404 */}
            <Route path="*" element={<div style={{ padding: 24 }}>404 - Không tìm thấy trang</div>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
