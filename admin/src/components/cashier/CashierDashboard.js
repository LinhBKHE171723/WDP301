import { useMemo, useState, useEffect } from "react"
import {
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
} from "lucide-react"
import "./CashierDashboard.css"
import UnpaidOrdersList from "./Unpaid-orders-list"
import TableManagement from "./table-management"

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
  // ====== Điều hướng màn con ======
  const [showUnpaidOrders, setShowUnpaidOrders] = useState(false)
  const [showTableManagement, setShowTableManagement] = useState(false)

  // ====== Phiếu thu/chi ======
  const [showPettyCashForm, setShowPettyCashForm] = useState(false)
  const [pettyCashType, setPettyCashType] = useState("out") // "in" | "out"
  const [pettyCashAmount, setPettyCashAmount] = useState("")
  const [pettyCashReason, setPettyCashReason] = useState("")
  const [now, setNow] = useState(Date.now())


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

  // === Pagination state ===
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // ====== Formatter ======
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0)

  const formatTime = (dateString) =>
    new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateString))

  const formatDate = (dateString) =>
    new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
      new Date(dateString)
    )
  const shiftKey = `cashier_sales_${new Date(shiftInfo.startTime).getTime()}`
  // ====== Đồng bộ số "Đơn chờ" qua localStorage để ca mới vẫn còn ======
  const getUnpaidCount = () => {
    try {
      const raw = localStorage.getItem("unpaidOrders")
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) ? arr.length : 0
    } catch {
      return 0
    }
  }
  const [pendingOrdersCount, setPendingOrdersCount] = useState(getUnpaidCount())

  // Lắng nghe thay đổi từ nơi khác (nếu có) để cập nhật số đơn chờ
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "unpaidOrders") setPendingOrdersCount(getUnpaidCount())
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 60_000) // mỗi phút
  return () => clearInterval(id)
}, [])

  // === TEST ONLY: luôn có 3 đơn chờ trên Dashboard ===
useEffect(() => {
  const FORCE_TEST_SEED = true; // hết test đặt false

  try {
    const raw = localStorage.getItem("unpaidOrders");
    const hasData = raw && Array.isArray(JSON.parse(raw)) && JSON.parse(raw).length > 0;

    if (FORCE_TEST_SEED || !hasData) {
      const SEED_ORDERS = [
        {
          id: 1,
          orderNumber: "ĐH-006",
          tableNumber: "Bàn 5",
          items: [
            { id: 1, name: "Phở Bò Đặc Biệt", quantity: 2, price: 85000 },
            { id: 2, name: "Gỏi Cuốn", quantity: 1, price: 45000 },
            { id: 3, name: "Trà Đá", quantity: 2, price: 10000 },
          ],
          totalAmount: 225000,
          orderTime: new Date(Date.now() - 15 * 60000).toISOString(),
          waitTime: 15,
        },
        {
          id: 2,
          orderNumber: "ĐH-007",
          tableNumber: "Bàn 12",
          items: [
            { id: 4, name: "Cơm Gà Xối Mỡ", quantity: 1, price: 65000 },
            { id: 5, name: "Canh Chua", quantity: 1, price: 55000 },
            { id: 6, name: "Nước Chanh", quantity: 1, price: 20000 },
          ],
          totalAmount: 140000,
          orderTime: new Date(Date.now() - 8 * 60000).toISOString(),
          waitTime: 8,
        },
        {
          id: 3,
          orderNumber: "ĐH-008",
          tableNumber: "Bàn 3",
          items: [
            { id: 7, name: "Bún Chả Hà Nội", quantity: 3, price: 75000 },
            { id: 8, name: "Nem Rán", quantity: 2, price: 40000 },
            { id: 9, name: "Trà Chanh", quantity: 3, price: 25000 },
          ],
          totalAmount: 380000,
          orderTime: new Date(Date.now() - 22 * 60000).toISOString(),
          waitTime: 22,
        },
      ];
      localStorage.setItem("unpaidOrders", JSON.stringify(SEED_ORDERS));

      // cập nhật badge trên Dashboard
      setPendingOrdersCount(SEED_ORDERS.length);

      // thông báo cho các listener khác (nếu có)
      window.dispatchEvent(
        new StorageEvent("storage", { key: "unpaidOrders", newValue: JSON.stringify(SEED_ORDERS) })
      );
    }
  } catch {}
}, []);


  // ====== Nhận sự kiện thanh toán xong từ màn "Đơn chờ" ======
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
    try {
    const raw = localStorage.getItem(shiftKey)
    const sales = raw ? JSON.parse(raw) : { cash: 0, card: 0 }
    if (newPayment.method === "Tiền mặt") {
      sales.cash += newPayment.amount
    } else {
      // QR/Thẻ
      sales.card += newPayment.amount
    }
    localStorage.setItem(shiftKey, JSON.stringify(sales))
  } catch {}
  }

  // ====== Tính doanh thu từ paymentHistory ======
  const cashRevenue = paymentHistory.filter((p) => p.method === "Tiền mặt").reduce((s, p) => s + p.amount, 0)
  const cardRevenue = paymentHistory
    .filter((p) => p.method === "Thẻ" || p.method === "QR Code")
    .reduce((s, p) => s + p.amount, 0)
  const totalRevenue = cashRevenue + cardRevenue
  const completedOrdersCount = paymentHistory.length

  const startMs = new Date(shiftInfo.startTime).getTime()
const currentShiftDuration = Number.isFinite(startMs)
  ? Math.max(0, Math.floor((now - startMs) / 60_000))
  : 0

  // ====== Phiếu thu/chi: tổng hợp ======
  const pettyCashIn = (shiftData.pettyCashTransactions || [])
    .filter((t) => t.type === "in")
    .reduce((sum, t) => sum + t.amount, 0)
  const pettyCashOut = (shiftData.pettyCashTransactions || [])
    .filter((t) => t.type === "out")
    .reduce((sum, t) => sum + t.amount, 0)

  // ====== Submit phiếu thu/chi ======
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
      type: pettyCashType, // "in" | "out"
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

  // ====== Phân trang ======
  const payments = paymentHistory
  const total = payments.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  const pageItems = useMemo(() => payments.slice(start, end), [payments, start, end])
  const goTo = (p) => setPage(Math.min(totalPages, Math.max(1, p)))

  // ====== Điều hướng sang các màn con ======
  if (showUnpaidOrders) {
    return (
      <UnpaidOrdersList onBack={() => setShowUnpaidOrders(false)} onPaymentComplete={handlePaymentCompleteFromUnpaid} />
    )
  }

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
          <div style={{ display: "flex", gap: "0.75rem" }}>
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

      {/* Revenue Cards (luôn hiển thị, kể cả 0) */}
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
            <span className="revenue-label">Đơn Chờ</span>
          </div>
          <div className="revenue-amount revenue-amount-pending">{pendingOrdersCount}</div>
          <div className="revenue-footer">
            <button className="button button-view-orders" onClick={() => setShowUnpaidOrders(true)}>
              Xem danh sách đơn
            </button>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {paymentHistory.length > 0 ? (
        <div className="history-section">
          <div className="history-header">
            <h2 className="history-title">Lịch Sử Thanh Toán</h2>
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

          {/* Pagination */}
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
            <button className="page-btn" disabled={currentPage === totalPages} onClick={() => goTo(totalPages)} aria-label="Trang cuối">
              »
            </button>
          </div>
        </div>
      ) : (
        <div className="history-section">
          <div className="history-header">
            <h2 className="history-title">Lịch Sử Thanh Toán</h2>
            <span className="history-date">{formatDate(shiftInfo.startTime)}</span>
          </div>
          <div className="empty-state" style={{ padding: "1.25rem", color: "var(--muted-foreground)" }}>
            Chưa có giao dịch trong ca này. Vào “Đơn Chờ” để thanh toán đơn đầu tiên.
          </div>
        </div>
      )}

      {/* ===== Khối PHIẾU THU/CHI (để nguyên nếu chưa dùng) ===== */}
      {/* ... giữ nguyên phần comment như bản trước nếu cần mở lại */}
    </div>
  )
}
