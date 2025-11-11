import React from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"

import MenuView from "./components/MenuView"
import OrderHistory from "./components/OrderHistory"
import GuestOrderHistory from "./components/GuestOrderHistory"
import OrderStatus from "./components/OrderStatus"
import PreOrder from "./components/PreOrder"
import ResetPassword from "./components/ResetPassword"

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

/* -------------------------- App chính -------------------------- */

function App() {
  // Table sẽ được waiter nhập sau trên hệ thống
  const defaultTable = null

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

            {/* Đặt bàn trước */}
            <Route
              path="/preorder"
              element={<PreOrder />}
            />

            {/* Reset password */}
            <Route
              path="/reset-password"
              element={<ResetPassword />}
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
