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
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import "./CashierDashboard.css"
import UnpaidOrdersList from "./Unpaid-orders-list"
import TableManagement from "./table-management"
import OrderPayment from "./order-payment"
import Client from "../../api/Client"
import useCashierSocket from "../../hooks/useCashierSocket"
import adminApi from "../../api/adminApi"
import useAdminWebSocket from "../../hooks/useAdminWebSocket"
import { useAuth } from "../../context/AuthContext"
import CashierUserBadge from "./CashierUserBadge"

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
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null) // Order để xem hóa đơn từ lịch sử

  // ====== User menu đã được tách ra thành CashierUserBadge component ======

  // ====== Preorders (đơn đặt trước) ======
  const [pendingPreordersCount, setPendingPreordersCount] = useState(0)
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

  // ====== Lịch sử thanh toán & danh sách đơn chờ ======
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
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "0 ₫"
    }
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)
  }

  const formatTime = (dateString) => {
    if (!dateString) {
      return "--:--"
    }
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "--:--"
      }
      return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date)
    } catch (error) {
      console.error("Error formatting time:", error)
      return "--:--"
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) {
      return "--/--/----"
    }
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "--/--/----"
      }
      return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
    } catch (error) {
      console.error("Error formatting date:", error)
      return "--/--/----"
    }
  }

  // ====== Thông tin thu ngân đã được tách ra thành CashierUserBadge component ======

  // ====== Callback từ UnpaidOrdersList khi thanh toán xong ======
  const handlePaymentCompleteFromUnpaid = (payment) => {
    const newPayment = {
      id: Date.now(),
      orderId: payment.orderId, // Lưu orderId để có thể fetch lại order
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

  // ====== Realtime: đơn preparing ======
  const handleRealtimePreparing = useCallback(
    (order) => {
      if (!order?.id) return
      const orderId = order.id

      let isNewOrder = false
      updateOrders((prev) => {
        const index = prev.findIndex((item) => item.id === orderId)
        if (index === -1) {
          isNewOrder = true
          return [...prev, order]
        }
        const next = [...prev]
        next[index] = { ...next[index], ...order }
        return next
      })

      if (isNewOrder) {
        const tableText = order.tableNumber || "Mang đi"
        const message = `🆕 Có đơn hàng mới ${order.orderNumber || ""} từ ${tableText} cần thanh toán!`
        toast.info(message)
      }
    },
    [updateOrders]
  )

  // ====== Realtime: đơn paid ======
  const handleRealtimePaid = useCallback(
    (order) => {
      if (!order?.id) return
      updateOrders((prev) => prev.filter((item) => item.id !== order.id))
    },
    [updateOrders]
  )

  // ====== Lấy danh sách đơn chờ thanh toán ======
  const fetchUnpaidOrders = useCallback(async () => {
    try {
      const res = await Client.get("/cashier/orders/preparing")
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

  // ====== Lấy số lượng preorders ======
  const fetchPreordersCounts = useCallback(async () => {
    try {
      setLoadingPreorders(true)

      // Đơn đang chờ duyệt
      const pendingResponse = await adminApi.getPreOrders({ waiterResponseStatus: "pending" })
      const pendingOrders = Array.isArray(pendingResponse?.data) ? pendingResponse.data : []
      setPendingPreordersCount(pendingOrders.length)
    } catch (error) {
      console.error("Không thể tải số lượng đơn đặt trước:", error)
      setPendingPreordersCount(0)
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
      fetchPreordersCounts()
    }
  }, [preorderMessage, fetchPreordersCounts])

  // ====== Notification khi khách yêu cầu thanh toán ======
  const handlePaymentRequested = useCallback((data) => {
    console.log("💳 Payment requested:", data)
    const tableNumber = data.tableNumber || "N/A"
    const totalAmount = data.totalAmount ? formatCurrency(data.totalAmount) : "0 ₫"
    toast.warning(`💳 Khách hàng tại bàn ${tableNumber} yêu cầu thanh toán! Tổng tiền: ${totalAmount}`, {
      autoClose: 8000,
      position: "top-right",
    })
  }, [])

  useCashierSocket({
    onOrderPreparing: handleRealtimePreparing,
    onOrderPaid: handleRealtimePaid,
    onPaymentRequested: handlePaymentRequested,
  })

  // ====== Doanh thu trong ca ======
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

  // ====== Handler Profile + Logout đã được tách ra thành CashierUserBadge component ======

  // ====== Màn xem hóa đơn từ lịch sử ======
  if (selectedReceiptOrder) {
    return (
      <OrderPayment
        order={selectedReceiptOrder}
        onBack={() => setSelectedReceiptOrder(null)}
        onPaymentComplete={null} // Không cho thanh toán lại từ hóa đơn
        viewOnly={true} // Chỉ xem, không cho thanh toán
      />
    )
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
                      <th className="history-table-header">Hành động</th>
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
                        <td className="history-table-cell">
                          <button
                            onClick={async () => {
                              if (!payment.orderId) {
                                alert("Không tìm thấy thông tin đơn hàng")
                                return
                              }
                              try {
                                // Fetch order details từ customer endpoint (cashier có thể dùng)
                                const res = await Client.get(`/customer/orders/${payment.orderId}`)
                                const orderData = res.data || res
                                // Lấy paymentMethod từ paymentIds hoặc paymentId
                                let paymentMethodFromOrder = "cash" // default
                                if (orderData.paymentIds && orderData.paymentIds.length > 0) {
                                  // Tìm payment cuối cùng (thanh toán cuối)
                                  const lastPayment = orderData.paymentIds
                                    .filter(p => p.status === "paid" && !p.isDeposit)
                                    .sort((a, b) => new Date(b.payTime || b.createdAt) - new Date(a.payTime || a.createdAt))[0]
                                  if (lastPayment) {
                                    paymentMethodFromOrder = lastPayment.paymentMethod || "cash"
                                  }
                                } else if (orderData.paymentId) {
                                  paymentMethodFromOrder = orderData.paymentId.paymentMethod || "cash"
                                }
                                
                                // Format order để phù hợp với OrderPayment component
                                const formattedOrder = {
                                  id: orderData._id || orderData.id,
                                  orderNumber: orderData.orderNumber || payment.orderNumber,
                                  tableNumber: orderData.tableId?.tableNumber || orderData.tableNumber || "N/A",
                                  orderTime: orderData.createdAt || orderData.orderTime || payment.time,
                                  items: (orderData.orderItems || []).map(item => ({
                                    id: item._id || item.orderItemId || item.id,
                                    name: item.itemName || item.name || "N/A",
                                    quantity: item.quantity || 0,
                                    price: item.price || 0,
                                    notes: item.note || item.notes || null
                                  })),
                                  remainingAmount: orderData.remainingAmount || payment.amount,
                                  totalPaid: orderData.totalPaid || 0,
                                  paymentMethod: paymentMethodFromOrder // Thêm paymentMethod vào order
                                }
                                setSelectedReceiptOrder(formattedOrder)
                              } catch (error) {
                                console.error("Error fetching order:", error)
                                alert("Không thể tải thông tin đơn hàng")
                              }
                            }}
                            className="button button-secondary"
                            style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem" }}
                          >
                            <Printer className="button-icon" style={{ width: "0.875rem", height: "0.875rem" }} />
                            Xem hóa đơn
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pageItems.length === 0 && (
                      <tr>
                        <td
                          className="history-table-cell"
                          colSpan={5}
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

  // ====== Màn chính Dashboard ======
  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">Dashboard Thu Ngân</h1>
            <p className="dashboard-subtitle">Tổng quan ca làm việc</p>
          </div>

          <div className="dashboard-header-actions">
            <div className="dashboard-header-buttons">
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

            {/* Badge tên thu ngân + menu - tái sử dụng component */}
            <CashierUserBadge />
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

        {/* Card: Đơn đặt trước đang chờ duyệt */}
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
      </div>

      {/* Danh sách đơn chờ thanh toán */}
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

      {/* Khối phiếu thu/chi hiện đang comment, bạn có thể mở lại sau nếu cần */}
    </div>
  )
}
