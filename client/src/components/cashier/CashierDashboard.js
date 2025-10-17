import { useMemo, useState } from "react"
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
  // ====== Điều hướng màn con (từ file mới) ======
  const [showUnpaidOrders, setShowUnpaidOrders] = useState(false)
  const [showTableManagement, setShowTableManagement] = useState(false)

  // ====== Phiếu thu/chi (từ file mới) ======
  const [showPettyCashForm, setShowPettyCashForm] = useState(false)
  const [pettyCashType, setPettyCashType] = useState("out") // "in" | "out"
  const [pettyCashAmount, setPettyCashAmount] = useState("")
  const [pettyCashReason, setPettyCashReason] = useState("")

  // ====== Dữ liệu mặc định để tương thích nếu app cũ chưa truyền vào ======
  const noop = () => { }
  const shiftData =
    shiftDataProp ||
    {
      startTime: null,
      endTime: null,
      openingCash: null,
      closingCash: null,
      isShiftOpen: true,
      pettyCashTransactions: [],
    }
  const addPettyCash = onAddPettyCash || noop
  const printXReport = onPrintXReport || noop

  // ====== Lịch sử thanh toán (dùng từ file cũ + bổ sung onPaymentComplete từ UnpaidOrdersList) ======
  const [paymentHistory, setPaymentHistory] = useState([])

  // === Pagination state (GIỮ NGUYÊN từ file cũ) ===
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // ====== Formatter (GIỮ NGUYÊN) ======
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)

  const formatTime = (dateString) =>
    new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateString))

  const formatDate = (dateString) =>
    new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
      new Date(dateString)
    )

  // ====== Điều hướng sang danh sách đơn chờ (mới) trả về record để thêm vào lịch sử (cũ) ======
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

  // ====== Tính toán doanh thu dựa trên paymentHistory (để luôn đúng khi thêm đơn mới) ======
  const cashRevenue = paymentHistory.filter((p) => p.method === "Tiền mặt").reduce((s, p) => s + p.amount, 0)
  const cardRevenue = paymentHistory.filter((p) => p.method === "Thẻ" || p.method === "QR Code").reduce((s, p) => s + p.amount, 0)
  const totalRevenue = cashRevenue + cardRevenue
  const completedOrdersCount = paymentHistory.length
  const [pendingOrdersCount, setPendingOrdersCount] = useState(3)

  const currentShiftDuration = Math.floor((Date.now() - new Date(shiftInfo.startTime).getTime()) / (1000 * 60))

  // ====== Phiếu thu/chi: tổng hợp (mới) ======
  const pettyCashIn = (shiftData.pettyCashTransactions || [])
    .filter((t) => t.type === "in")
    .reduce((sum, t) => sum + t.amount, 0)
  const pettyCashOut = (shiftData.pettyCashTransactions || [])
    .filter((t) => t.type === "out")
    .reduce((sum, t) => sum + t.amount, 0)

  // ====== Submit phiếu thu/chi (mới) ======
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

  // ====== Phân trang (GIỮ NGUYÊN) ======
  const payments = paymentHistory
  const total = payments.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  const pageItems = useMemo(() => payments.slice(start, end), [payments, start, end])
  const goTo = (p) => setPage(Math.min(totalPages, Math.max(1, p)))

  // ====== Điều hướng sang các màn con (mới) ======
  if (showUnpaidOrders) {
    return (
      <UnpaidOrdersList
        onBack={() => setShowUnpaidOrders(false)}
        onPaymentComplete={handlePaymentCompleteFromUnpaid}
      />
    )
  }

  if (showTableManagement) {
    return <TableManagement onBack={() => setShowTableManagement(false)} />
  }

  // ====== Màn chính (giao diện giữ nguyên của file cũ, chỉ thêm các nút/khối mới) ======
  return (
    <div className="dashboard-container">
      {/* Header (GIỮ NGUYÊN + thêm 2 nút mới) */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">Dashboard Thu Ngân</h1>
            <p className="dashboard-subtitle">Tổng quan ca làm việc</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {/* Nút mới - Quản lý bàn */}
            <button onClick={() => setShowTableManagement(true)} className="button button-secondary">
              <Grid3x3 className="button-icon" />
              Quản lý bàn
            </button>
            {/* Nút mới - X-Report */}
            <button onClick={printXReport} className="button button-secondary">
              <Printer className="button-icon" />
              X-Report
            </button>
            {/* Giữ từ file cũ */}
            <button onClick={onCloseShift} className="button button-close-shift">
              <LogOut className="button-icon" />
              Đóng Ca
            </button>
          </div>
        </div>
      </div>

      {/* Shift Info Bar (GIỮ NGUYÊN) */}
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

      {/* Revenue Cards (GIỮ NGUYÊN layout, tính số liệu từ paymentHistory để luôn đúng) */}
      {paymentHistory.length > 0 && (
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
      )}

      {/* Payment History (GIỮ NGUYÊN + phân trang cũ) */}
      {paymentHistory.length > 0 ? (
        <div className="history-section">
          <div className="history-header">
            <h2 className="history-title">Lịch Sử Thanh Toán</h2>
            <span className="history-date">{formatDate(shiftInfo.startTime)}</span>
          </div>

          {/* Toolbar giữ phong cách hiện tại */}
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
                        className={`payment-method-badge ${payment.method === "Tiền mặt" ? "payment-method-cash" : "payment-method-card"
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

          {/* Pagination buttons (GIỮ NGUYÊN) */}
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
            <h2 className="history-title">Lịch Sử Thanh Toán</h2>
            <span className="history-date">{formatDate(shiftInfo.startTime)}</span>
          </div>
          <div className="empty-state" style={{ padding: '1.25rem', color: 'var(--muted-foreground)' }}>
            Chưa có giao dịch trong ca này. Vào “Đơn Chờ” để thanh toán đơn đầu tiên.
          </div>
        </div>
      )}
      {/* ===== Khối PHIẾU THU/CHI (thêm từ file mới, UI hòa hợp style hiện tại) ===== */}
      {/* <div className="petty-cash-section">
        <div className="petty-cash-header">
          <h2 className="history-title">Phiếu Thu/Chi Trong Ca</h2>
          <button onClick={() => setShowPettyCashForm(!showPettyCashForm)} className="button button-success">
            <Plus className="button-icon" />
            Thêm Phiếu
          </button>
        </div>

        {showPettyCashForm && (
          <div className="card petty-cash-form">
            <div className="card-content">
              <div className="petty-cash-type-selector">
                <button
                  onClick={() => setPettyCashType("out")}
                  className={`petty-cash-type-button ${pettyCashType === "out" ? "active" : ""}`}
                >
                  <Minus className="button-icon" />
                  Phiếu Chi
                </button>
                <button
                  onClick={() => setPettyCashType("in")}
                  className={`petty-cash-type-button ${pettyCashType === "in" ? "active" : ""}`}
                >
                  <Plus className="button-icon" />
                  Phiếu Thu
                </button>
              </div>

              <div className="input-group">
                <label className="input-label">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  value={pettyCashAmount}
                  onChange={(e) => setPettyCashAmount(e.target.value)}
                  placeholder="0"
                  className="input"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Lý do</label>
                <input
                  type="text"
                  value={pettyCashReason}
                  onChange={(e) => setPettyCashReason(e.target.value)}
                  placeholder="VD: Mua đồ dùng, Đổi tiền lẻ..."
                  className="input"
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setShowPettyCashForm(false)}
                  className="button button-full"
                  style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}
                >
                  Hủy
                </button>
                <button onClick={handlePettyCashSubmit} className="button button-full button-success">
                  Xác Nhận
                </button>
              </div>
            </div>
          </div>
        )} */}

      {/* Tổng hợp nhanh */}
      {/* <div className="petty-cash-summary">
          <div className="petty-cash-summary-item petty-cash-in">
            <Plus className="petty-cash-icon" />
            <div>
              <div className="petty-cash-label">Tổng Thu</div>
              <div className="petty-cash-amount">{formatCurrency(pettyCashIn)}</div>
            </div>
          </div>
          <div className="petty-cash-summary-item petty-cash-out">
            <Minus className="petty-cash-icon" />
            <div>
              <div className="petty-cash-label">Tổng Chi</div>
              <div className="petty-cash-amount">{formatCurrency(pettyCashOut)}</div>
            </div>
          </div>
        </div> */}

      {/* Bảng lịch sử thu/chi (nếu có) */}
      {/* {(shiftData.pettyCashTransactions || []).length > 0 && (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead className="history-table-head">
                <tr>
                  <th className="history-table-header">Loại</th>
                  <th className="history-table-header">Số tiền</th>
                  <th className="history-table-header">Lý do</th>
                  <th className="history-table-header">Thời gian</th>
                </tr>
              </thead>
              <tbody className="history-table-body">
                {shiftData.pettyCashTransactions.map((t) => (
                  <tr key={t.id} className="history-table-row">
                    <td className="history-table-cell">
                      <span
                        className={`payment-method-badge ${
                          t.type === "in" ? "payment-method-success" : "payment-method-destructive"
                        }`}
                      >
                        {t.type === "in" ? <Plus className="payment-method-icon" /> : <Minus className="payment-method-icon" />}
                        {t.type === "in" ? "Thu" : "Chi"}
                      </span>
                    </td>
                    <td className="history-table-cell history-amount">
                      {t.type === "in" ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="history-table-cell">{t.reason}</td>
                    <td className="history-table-cell history-time">{formatTime(t.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div> */}
    </div>
  )
}
