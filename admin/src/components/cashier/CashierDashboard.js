import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Clock,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Banknote,
  LogOut,
  TrendingUp,
  Plus,
  Minus,
  Printer,
  Grid3x3,
  Calendar,
  User,
  ChevronDown,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import "./CashierDashboard.css"
import UnpaidOrdersList from "./Unpaid-orders-list"
import TableManagement from "./table-management"
import Client from "../../api/Client"
import useCashierSocket from "../../hooks/useCashierSocket"
import adminApi from "../../api/adminApi"
import useAdminWebSocket from "../../hooks/useAdminWebSocket"
import { useAuth } from "../../context/AuthContext"

/**
 * Props hỗ trợ cả phiên bản cũ và mới:
 * - BẮT BUỘC (cũ): shiftInfo, onCloseShift
 * - MỚI (tuỳ chọn): shiftData, onAddPettyCash, onPrintXReport
 * -> Có mặc định an toàn nếu không truyền vào (để không vỡ app cũ).
 */
export default function CashierDashboard({
  shiftInfo,
  shiftData: shiftDataProp,
  onCloseShift,
  onAddPettyCash,
  onPrintXReport,
}) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // ====== Điều hướng màn con ======
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)
  const [showTableManagement, setShowTableManagement] = useState(false)

  // ====== User menu (tên thu ngân + Profile + Logout) ======
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  // ====== Preorders (đơn đặt trước) ======
  const [pendingPreordersCount, setPendingPreordersCount] = useState(0) // Đơn đang chờ duyệt
  const [todaysPreordersCount, setTodaysPreordersCount] = useState(0) // Đơn đã duyệt, scheduledTime hôm nay
  const [loadingPreorders, setLoadingPreorders] = useState(true)

  // WebSocket để nhận thông báo preorder mới
  const { lastMessage: preorderMessage } = useAdminWebSocket()

  // ====== Phiếu thu/chi ======
  const [showPettyCashForm, setShowPettyCashForm] = useState(false)
  const [pettyCashType, setPettyCashType] = useState("out") // "in" | "out"
  const [pettyCashAmount, setPettyCashAmount] = useState("")
  const [pettyCashReason, setPettyCashReason] = useState("")

  // ====== Dữ liệu mặc định để tương thích nếu app cũ chưa truyền vào ======
  const noop = () => {}
  const shiftData =
    shiftDataProp || {
      startTime: null,
      endTime: null,
      openingCash: null,
      closingCash: null,
      isShiftOpen: true,
      pettyCashTransactions: [],
    }
  const addPettyCash = onAddPettyCash || noop
  const printXReport = onPrintXReport || noop

  // ====== Lịch sử thanh toán ======
  const [paymentHistory, setPaymentHistory] = useState([])
  const [unpaidOrdersData, setUnpaidOrdersData] = useState([])
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const pendingOrdersRef = useRef(null)

  const updateOrders = useCallback((updater) => {
    setUnpaidOrdersData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      const normalized = Array.isArray(next) ? next : []
      setPendingOrdersCount(normalized.length)
      return normalized
    })
  }, [])

  // === Pagination state ===
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // ====== Formatter ======
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)

  const formatTime = (dateString) =>
    new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateString))

  const formatDate = (dateString) =>
    new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
      new Date(dateString)
    )

  // ====== Tên thu ngân từ AuthContext (chỉ UI) ======
  const cashierName = user?.name || "Thu ngân"
  const cashierInitials = useMemo(() => {
    if (!cashierName) return "TN"
    const parts = cashierName.trim().split(/\s+/)
    const letters = parts.map((p) => p[0]).join("")
    return letters.slice(-2).toUpperCase()
  }, [cashierName])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ====== Điều hướng sang danh sách đơn chờ, nhận callback thanh toán xong ======
  const handlePaymentCompleteFromUnpaid = (payment) => {
    const newPayment = {
      id: Date.now(),
      orderNumber: payment.orderNumber,
      amount: payment.amount,
      method: payment.method, // "Tiền mặt" | "QR Code"
      time: payment.time,
    }
    setPaymentHistory((prev) => [newPayment, ...prev])
    setPendingOrdersCount((c) => Math.max(0, c - 1))
  }

  const handleOrdersUpdate = useCallback(
    (orders) => {
      updateOrders(orders)
    },
    [updateOrders]
  )

  const handleRealtimePreparing = useCallback(
    (order) => {
      if (!order?.id) return
      const orderId = order.id

      // Kiểm tra xem đơn có phải là đơn mới không (chưa có trong danh sách)
      let isNewOrder = false
      updateOrders((prev) => {
        const index = prev.findIndex((item) => item.id === orderId)
        if (index === -1) {
          isNewOrder = true
          return [...prev, order]
        }
        // Đơn đã tồn tại - chỉ cập nhật thông tin
        const next = [...prev]
        next[index] = { ...next[index], ...order }
        return next
      })

      // Hiển thị toast notification cho đơn mới
      if (isNewOrder) {
        const tableText = order.tableNumber || "Mang đi"
        const message = `🆕 Có đơn hàng mới ${order.orderNumber || ""} từ ${tableText} cần thanh toán!`
        toast.info(message)
      }
    },
    [updateOrders]
  )

  const handleRealtimePaid = useCallback(
    (order) => {
      if (!order?.id) return
      updateOrders((prev) => prev.filter((item) => item.id !== order.id))
    },
    [updateOrders]
  )

  // ====== Tải danh sách đơn chưa thanh toán ======
  const fetchUnpaidOrders = useCallback(async () => {
    try {
      const res = await Client.get("/cashier/orders/preparing")
      // API trả về { message, data: [...] }, interceptor đã lấy res.data nên res = { message, data }
      const orders = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      console.log("Fetched unpaid orders:", orders.length, orders)
      updateOrders(orders)
      return orders
    } catch (error) {
      console.error("Không thể tải danh sách đơn chờ:", error)
      updateOrders([])
      return []
    }
  }, [updateOrders])

  useEffect(() => {
    fetchUnpaidOrders()
  }, [fetchUnpaidOrders])

  // ====== Fetch số lượng preorders đang chờ & hôm nay ======
  const fetchPreordersCounts = useCallback(async () => {
    try {
      setLoadingPreorders(true)

      // 1. Đơn đang chờ duyệt
      const pendingResponse = await adminApi.getPreOrders({ waiterResponseStatus: "pending" })
      const pendingOrders = Array.isArray(pendingResponse?.data) ? pendingResponse.data : []
      setPendingPreordersCount(pendingOrders.length)

      // 2. Đơn đã duyệt, scheduledTime trong hôm nay
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todaysResponse = await adminApi.getPreOrders({
        waiterResponseStatus: "approved",
        fromDate: today.toISOString(),
        toDate: tomorrow.toISOString(),
        filterBy: "scheduledTime",
      })
      const todaysOrders = Array.isArray(todaysResponse?.data) ? todaysResponse.data : []

      const filteredTodaysOrders = todaysOrders.filter((order) => {
        if (!order.scheduledTime) return false
        const scheduledDate = new Date(order.scheduledTime)
        scheduledDate.setHours(0, 0, 0, 0)
        return scheduledDate.getTime() === today.getTime()
      })

      setTodaysPreordersCount(filteredTodaysOrders.length)
    } catch (error) {
      console.error("Không thể tải số lượng đơn đặt trước:", error)
      setPendingPreordersCount(0)
      setTodaysPreordersCount(0)
    } finally {
      setLoadingPreorders(false)
    }
  }, [])

  useEffect(() => {
    fetchPreordersCounts()
  }, [fetchPreordersCounts])

  // ====== Listen WebSocket preorder ======
  useEffect(() => {
    if (!preorderMessage) return

    const messageType = preorderMessage.type
    console.log(`📨 CashierDashboard received WebSocket message: ${messageType}`, preorderMessage)

    if (
      messageType === "preorder:new" ||
      messageType === "preorder:cancelled" ||
      messageType === "preorder:approved" ||
      messageType === "order:confirmed"
    ) {
      console.log(`🔄 Refreshing preorder counts due to ${messageType}`)
      fetchPreordersCounts()
    }
  }, [preorderMessage, fetchPreordersCounts])

  // ====== Thông báo khi bàn yêu cầu thanh toán ======
  const handlePaymentRequested = useCallback((data) => {
    console.log("💳 Payment requested:", data)
    const tableNumber = data.tableNumber || "N/A"
    const totalAmount = data.totalAmount?.toLocaleString("vi-VN") || "0"
    toast.warning(`💳 Khách hàng tại bàn ${tableNumber} yêu cầu thanh toán! Tổng tiền: ${totalAmount}đ`, {
      autoClose: 8000,
      position: "top-right",
    })
  }, [])

  useCashierSocket({
    onOrderPreparing: handleRealtimePreparing,
    onOrderPaid: handleRealtimePaid,
    onPaymentRequested: handlePaymentRequested,
  })

  // ====== Doanh thu ======
  const cashRevenue = paymentHistory.filter((p) => p.method === "Tiền mặt").reduce((s, p) => s + p.amount, 0)
  const cardRevenue = paymentHistory
    .filter((p) => p.method === "Thẻ" || p.method === "QR Code")
    .reduce((s, p) => s + p.amount, 0)
  const totalRevenue = cashRevenue + cardRevenue
  const completedOrdersCount = paymentHistory.length

  const currentShiftDuration = Math.floor((Date.now() - new Date(shiftInfo.startTime).getTime()) / (1000 * 60))

  // ====== Phiếu thu/chi: tổng hợp ======
  const pettyCashIn = (shiftData.pettyCashTransactions || [])
    .filter((t) => t.type === "in")
    .reduce((sum, t) => sum + t.amount, 0)
  const pettyCashOut = (shiftData.pettyCashTransactions || [])
    .filter((t) => t.type === "out")
    .reduce((sum, t) => sum + t.amount, 0)

  const handlePettyCashSubmit = () => {
    const amount = Number.parseFloat(pettyCashAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ")
      return
    }
    if (!pettyCashReason.trim()) {
      alert("Vui lòng nhập lý do")
      return
    }

    const transaction = {
      id: Date.now().toString(),
      type: pettyCashType,
      amount,
      reason: pettyCashReason,
      time: new Date().toISOString(),
    }

    addPettyCash(transaction)
    setPettyCashAmount("")
    setPettyCashReason("")
    setShowPettyCashForm(false)
    alert(`Đã ghi nhận phiếu ${pettyCashType === "in" ? "thu" : "chi"} ${formatCurrency(amount)}`)
  }

  // ====== Phân trang lịch sử thanh toán ======
  const payments = paymentHistory
  const total = payments.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  const pageItems = useMemo(() => payments.slice(start, end), [payments, start, end])
  const goTo = (p) => setPage(Math.min(totalPages, Math.max(1, p)))

  // ====== Handler Profile + Logout (LOGOUT THẬT) ======
  const handleGoProfile = () => {
    setIsUserMenuOpen(false)
    navigate("/admin/profile")
  }

  const handleDashboardLogoutClick = () => {
    setIsUserMenuOpen(false)
    logout()           // xoá user, token trong AuthContext
    navigate("/login") // điều hướng về trang login
  }

  // ====== Màn lịch sử thanh toán ======
  if (showPaymentHistory) {
    return (
      <div className="dashboard-container">
        <div className="unpaid-orders-container">
          <div className="unpaid-orders-header">
            <div className="unpaid-orders-header-left">
              <button onClick={() => setShowPaymentHistory(false)} className="back-button">
                <ArrowLeft className="back-icon" />
              </button>
              <div className="header-content">
                <h1 className="header-title">Lịch Sử Thanh Toán</h1>
                <p className="header-subtitle">{paymentHistory.length} giao dịch trong ca</p>
              </div>
            </div>
          </div>

          {paymentHistory.length > 0 ? (
            <div className="history-section">
              <div className="history-header">
                <h2 className="history-title">Danh sách thanh toán</h2>
                <span className="history-date">{formatDate(shiftInfo.startTime)}</span>
              </div>

              <div className="history-toolbar">
                <div className="history-toolbar-left">
                  <span className="history-total">
                    Hiển thị <b>{Math.min(end, total)}</b>/<b>{total}</b> đơn
                  </span>
                </div>
                <div className="history-toolbar-right">
                  <label className="page-size">
                    <span>Dòng/trang:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPage(1)
                        setPageSize(Number(e.target.value))
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead className="history-table-head">
                    <tr>
                      <th className="history-table-header">Mã đơn</th>
                      <th className="history-table-header">Số tiền</th>
                      <th className="history-table-header">Phương thức</th>
                      <th className="history-table-header">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="history-table-body">
                    {pageItems.map((payment) => (
                      <tr key={payment.id} className="history-table-row">
                        <td className="history-table-cell history-order-number">{payment.orderNumber}</td>
                        <td className="history-table-cell history-amount">{formatCurrency(payment.amount)}</td>
                        <td className="history-table-cell">
                          <span
                            className={`payment-method-badge ${
                              payment.method === "Tiền mặt" ? "payment-method-cash" : "payment-method-card"
                            }`}
                          >
                            {payment.method === "Tiền mặt" ? (
                              <Banknote className="payment-method-icon" />
                            ) : (
                              <CreditCard className="payment-method-icon" />
                            )}
                            {payment.method}
                          </span>
                        </td>
                        <td className="history-table-cell history-time">{formatTime(payment.time)}</td>
                      </tr>
                    ))}
                    {pageItems.length === 0 && (
                      <tr>
                        <td
                          className="history-table-cell"
                          colSpan={4}
                          style={{ textAlign: "center", color: "var(--muted-foreground)" }}
                        >
                          Không có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <button className="page-btn" disabled={currentPage === 1} onClick={() => goTo(1)} aria-label="Trang đầu">
                  «
                </button>
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => goTo(currentPage - 1)}
                  aria-label="Trước"
                >
                  ←
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p, _, arr) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .map((p, idx, arr) => (
                    <span key={p}>
                      {idx > 0 && p - arr[idx - 1] > 1 && <span className="page-ellipsis">…</span>}
                      <button
                        className={`page-btn ${p === currentPage ? "active" : ""}`}
                        onClick={() => goTo(p)}
                        aria-current={p === currentPage ? "page" : undefined}
                      >
                        {p}
                      </button>
                    </span>
                  ))}

                <button
                  className="page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => goTo(currentPage + 1)}
                  aria-label="Sau"
                >
                  →
                </button>
                <button
                  className="page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => goTo(totalPages)}
                  aria-label="Trang cuối"
                >
                  »
                </button>
              </div>
            </div>
          ) : (
            <div className="history-section">
              <div className="history-header">
                <h2 className="history-title">Danh sách thanh toán</h2>
                <span className="history-date">{formatDate(shiftInfo.startTime)}</span>
              </div>
              <div className="empty-state" style={{ padding: "1.25rem", color: "var(--muted-foreground)" }}>
                Chưa có giao dịch trong ca này. Quay lại để tiếp tục nhận đơn chờ.
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ====== Màn quản lý bàn ======
  if (showTableManagement) {
    return <TableManagement onBack={() => setShowTableManagement(false)} />
  }

  // ====== Màn chính ======
  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">Dashboard Thu Ngân</h1>
            <p className="dashboard-subtitle">Tổng quan ca làm việc</p>
          </div>

          {/* Dãy nút + badge thu ngân bên phải */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => navigate("/admin/cashier/preorders")} className="button button-secondary">
                <Calendar className="button-icon" />
                Đơn đặt trước
              </button>
              <button onClick={() => setShowTableManagement(true)} className="button button-secondary">
                <Grid3x3 className="button-icon" />
                Quản lý bàn
              </button>
              <button onClick={printXReport} className="button button-secondary">
                <Printer className="button-icon" />
                X-Report
              </button>
              <button onClick={onCloseShift} className="button button-close-shift">
                <LogOut className="button-icon" />
                Đóng Ca
              </button>
            </div>

            {/* Badge thu ngân + menu */}
            <div ref={userMenuRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.35rem 0.6rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(148, 163, 184, 0.6)",
                  background: "white",
                  cursor: "pointer",
                  minWidth: "0",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "999px",
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {cashierInitials}
                </div>
                <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.1 }}>{cashierName}</span>
                  <span style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.1 }}>Thu ngân</span>
                </div>
                <ChevronDown size={16} style={{ color: "#6b7280", flexShrink: 0 }} />
              </button>

              {isUserMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    marginTop: 6,
                    minWidth: 180,
                    background: "white",
                    borderRadius: 12,
                    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.15)",
                    padding: "0.4rem 0",
                    zIndex: 20,
                    border: "1px solid rgba(226, 232, 240, 0.9)",
                  }}
                >
                  <button
                    onClick={handleGoProfile}
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      padding: "0.45rem 0.9rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <User size={16} style={{ color: "#4b5563" }} />
                    <span>Hồ sơ cá nhân</span>
                  </button>

                  <div
                    style={{
                      height: 1,
                      background: "rgba(229, 231, 235, 0.9)",
                      margin: "0.25rem 0",
                    }}
                  />

                  <button
                    onClick={handleDashboardLogoutClick}
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      padding: "0.45rem 0.9rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: 13,
                      cursor: "pointer",
                      color: "#b91c1c",
                    }}
                  >
                    <LogOut size={16} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shift Info Bar */}
      <div className="shift-info-bar">
        <div className="shift-info-item">
          <Clock className="shift-info-icon" />
          <div className="shift-info-content">
            <span className="shift-info-label">Giờ bắt đầu</span>
            <span className="shift-info-value">{formatTime(shiftInfo.startTime)}</span>
          </div>
        </div>
        <div className="shift-info-divider"></div>
        <div className="shift-info-item">
          <DollarSign className="shift-info-icon" />
          <div className="shift-info-content">
            <span className="shift-info-label">Tiền đầu ca</span>
            <span className="shift-info-value">{formatCurrency(shiftInfo.openingCash)}</span>
          </div>
        </div>
        <div className="shift-info-divider"></div>
        <div className="shift-info-item">
          <TrendingUp className="shift-info-icon" />
          <div className="shift-info-content">
            <span className="shift-info-label">Thời gian làm việc</span>
            <span className="shift-info-value">{currentShiftDuration} phút</span>
          </div>
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="revenue-grid">
        <div className="revenue-card revenue-card-total">
          <div className="revenue-card-header">
            <div className="revenue-icon-wrapper revenue-icon-total">
              <DollarSign className="revenue-icon" />
            </div>
            <span className="revenue-label">Tổng Doanh Thu</span>
          </div>
          <div className="revenue-amount revenue-amount-total">{formatCurrency(totalRevenue)}</div>
          <div className="revenue-footer">
            <span className="revenue-count">{completedOrdersCount} đơn hoàn thành</span>
          </div>
        </div>

        <div className="revenue-card revenue-card-cash">
          <div className="revenue-card-header">
            <div className="revenue-icon-wrapper revenue-icon-cash">
              <Banknote className="revenue-icon" />
            </div>
            <span className="revenue-label">Tiền Mặt</span>
          </div>
          <div className="revenue-amount revenue-amount-cash">{formatCurrency(cashRevenue)}</div>
          <div className="revenue-footer">
            <span className="revenue-percentage">
              {totalRevenue > 0 ? ((cashRevenue / totalRevenue) * 100).toFixed(0) : 0}% tổng doanh thu
            </span>
          </div>
        </div>

        <div className="revenue-card revenue-card-card">
          <div className="revenue-card-header">
            <div className="revenue-icon-wrapper revenue-icon-card">
              <CreditCard className="revenue-icon" />
            </div>
            <span className="revenue-label">Thẻ</span>
          </div>
          <div className="revenue-amount revenue-amount-card">{formatCurrency(cardRevenue)}</div>
          <div className="revenue-footer">
            <span className="revenue-percentage">
              {totalRevenue > 0 ? ((cardRevenue / totalRevenue) * 100).toFixed(0) : 0}% tổng doanh thu
            </span>
          </div>
        </div>

        <div className="revenue-card revenue-card-pending">
          <div className="revenue-card-header">
            <div className="revenue-icon-wrapper revenue-icon-pending">
              <ShoppingCart className="revenue-icon" />
            </div>
            <span className="revenue-label">Đơn đã thanh toán</span>
          </div>
          <div className="revenue-amount revenue-amount-pending">{completedOrdersCount}</div>
          <div className="revenue-footer">
            <button className="button button-view-orders" onClick={() => setShowPaymentHistory(true)}>
              Xem lịch sử thanh toán
            </button>
          </div>
        </div>

        {/* Card 1: Đơn đặt trước đang chờ duyệt */}
        <div
          className="revenue-card revenue-card-preorder-pending"
          style={{
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)"
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)"
            e.currentTarget.style.boxShadow = ""
          }}
          onClick={() => navigate("/admin/cashier/preorders?waiterResponseStatus=pending")}
        >
          <div className="revenue-card-header">
            <div className="revenue-icon-wrapper" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
              <Calendar className="revenue-icon" style={{ color: "#3b82f6" }} />
            </div>
            <span className="revenue-label">Đơn đặt trước đang chờ</span>
          </div>
          <div className="revenue-amount" style={{ color: "#3b82f6", fontSize: "2rem", fontWeight: "bold" }}>
            {loadingPreorders ? "..." : pendingPreordersCount}
          </div>
          <div className="revenue-footer">
            <button
              className="button button-view-orders"
              onClick={(e) => {
                e.stopPropagation()
                navigate("/admin/cashier/preorders?waiterResponseStatus=pending")
              }}
            >
              Xem đơn chờ duyệt
            </button>
          </div>
        </div>

        {/* Card 2: Đơn đặt trước hôm nay */}
        <div
          className="revenue-card revenue-card-preorder-today"
          style={{
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)"
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)"
            e.currentTarget.style.boxShadow = ""
          }}
          onClick={() => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)
            navigate(
              `/admin/cashier/preorders?waiterResponseStatus=approved&fromDate=${today.toISOString()}&toDate=${tomorrow.toISOString()}&filterBy=scheduledTime`
            )
          }}
        >
          <div className="revenue-card-header">
            <div className="revenue-icon-wrapper" style={{ backgroundColor: "rgba(251, 146, 60, 0.1)" }}>
              <Clock className="revenue-icon" style={{ color: "#fb923c" }} />
            </div>
            <span className="revenue-label">Đơn đặt trước hôm nay</span>
          </div>
          <div className="revenue-amount" style={{ color: "#fb923c", fontSize: "2rem", fontWeight: "bold" }}>
            {loadingPreorders ? "..." : todaysPreordersCount}
          </div>
          <div className="revenue-footer">
            <button
              className="button button-view-orders"
              onClick={(e) => {
                e.stopPropagation()
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)
                navigate(
                  `/admin/cashier/preorders?waiterResponseStatus=approved&fromDate=${today.toISOString()}&toDate=${tomorrow.toISOString()}&filterBy=scheduledTime`
                )
              }}
            >
              Xem đơn hôm nay
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách đơn chưa thanh toán */}
      <div className="pending-orders-wrapper" ref={pendingOrdersRef}>
        <UnpaidOrdersList
          variant="embedded"
          showBackButton={false}
          onPaymentComplete={handlePaymentCompleteFromUnpaid}
          fetchOrders={fetchUnpaidOrders}
          onOrdersUpdate={handleOrdersUpdate}
          initialOrders={unpaidOrdersData}
        />
      </div>

      {/* Khối phiếu thu/chi hiện vẫn đang comment như bạn, nên mình giữ nguyên comment để không ảnh hưởng */}
      {/* ... */}
    </div>
  )
}
