import React, { useMemo, useState } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom"

import TableInput from "./components/TableInput"
import MenuView from "./components/MenuView"
import CashierShiftManager from "./components/cashier/CashierShiftManager"
import CashierDashboard from "./components/cashier/CashierDashboard"
import OrderPayment from "./components/cashier/order-payment"
import TableManagement from "./components/cashier/table-management"
import UnpaidOrdersList from "./components/cashier/Unpaid-orders-list" 

import "./App.css"

/* ---------- Demo wrappers để truyền props & điều hướng ---------- */

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

  return (
    <CashierDashboard
      shiftInfo={shiftInfo}
      shiftData={shiftData}
      onCloseShift={handleCloseShift}
      onAddPettyCash={handleAddPettyCash}
      onPrintXReport={handlePrintXReport}
    />
  )
}

function UnpaidOrdersRoute() {
  const navigate = useNavigate()
  const handleBack = () => navigate("/cashier/dashboard")

  const handlePaymentComplete = (payment) => {
    // Ở demo route standalone này, chỉ điều hướng về dashboard
    // Nếu muốn đẩy payment vào lịch sử của dashboard qua context/store, bạn có thể thêm sau.
    navigate("/cashier/dashboard")
  }

  return <UnpaidOrdersList onBack={handleBack} onPaymentComplete={handlePaymentComplete} />
}

function TableManagementRoute() {
  const navigate = useNavigate()
  return <TableManagement onBack={() => navigate("/cashier/dashboard")} />
}

function OrderPaymentRoute() {
  const navigate = useNavigate()

  // Tạo demo order nếu người dùng vào trực tiếp /cashier/orderpayment
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
  )

  return (
    <OrderPayment
      order={demoOrder}
      onBack={() => navigate("/cashier/dashboard")}
      onPaymentComplete={() => navigate("/cashier/dashboard")}
    />
  )
}

/* -------------------------- App chính -------------------------- */

function App() {
  // Đặt table hiện tại (luồng đặt chỗ)
  const [currentTable, setCurrentTable] = useState(null)

  const handleTableSubmit = (table) => setCurrentTable(table)
  const handleBackToTable = () => setCurrentTable(null)

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
    <Router>
      <div className="App">
        <Routes>
          {/* Redirect root */}
          <Route path="/" element={<Navigate to="/reservation" replace />} />

          {/* Luồng đặt chỗ */}
          <Route
            path="/reservation"
            element={
              currentTable ? (
                <MenuView table={currentTable} onBack={handleBackToTable} />
              ) : (
                <TableInput onTableSubmit={handleTableSubmit} />
              )
            }
          />

          {/* Trang menu demo */}
          <Route path="/menu" element={<div>Menu Page - Coming Soon!</div>} />

          {/* Khu vực cashier */}
          <Route path="/cashier" element={<Navigate to="/cashier/dashboard" replace />} />
          <Route path="/cashier/shift" element={<CashierShiftManager />} />
          <Route
            path="/cashier/dashboard"
            element={<DashboardRoute shiftInfo={shiftInfo} shiftData={shiftData} setShiftData={setShiftData} />}
          />
          <Route path="/cashier/orderpayment" element={<OrderPaymentRoute />} />
          <Route path="/cashier/unpaid" element={<UnpaidOrdersRoute />} />
          <Route path="/cashier/tables" element={<TableManagementRoute />} />

          {/* 404 */}
          <Route path="*" element={<div style={{ padding: 24 }}>404 - Không tìm thấy trang</div>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
