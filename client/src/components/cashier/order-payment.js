import { useState } from "react"
import { ArrowLeft, CreditCard, Wallet, Printer, Download, CheckCircle } from "lucide-react"
import "./order-payment.css"

function OrderPayment({ order, onBack, onPaymentComplete }) {
  const [paymentMethod, setPaymentMethod] = useState(null) // "cash" | "qr" | null
  const [showReceipt, setShowReceipt] = useState(false)
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)

  const VAT_RATE = 0.1
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const vat = subtotal * VAT_RATE
  const total = subtotal + vat

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)

  const formatTime = (dateString) =>
    new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateString))

  const handlePayment = () => {
    if (!paymentMethod) return
    setShowPaymentSuccess(true)
    setTimeout(() => {
      setShowPaymentSuccess(false)
      setShowReceipt(true)
    }, 1500)
  }

  const handlePrintReceipt = () => window.print()

  const handleDownloadPDF = () => {
    alert("Tính năng tải PDF sẽ được triển khai với thư viện jsPDF hoặc tương tự")
  }

  const handleCompletePayment = () => {
    onPaymentComplete(order.id, paymentMethod || "cash")
  }

  if (showReceipt) {
    return (
      <div className="receipt-container">
        <div className="receipt-actions no-print">
          <button onClick={() => setShowReceipt(false)} className="receipt-back-button">
            <ArrowLeft className="button-icon" />
            Quay lại
          </button>
          <div className="receipt-action-buttons">
            <button onClick={handlePrintReceipt} className="receipt-print-button">
              <Printer className="button-icon" />
              In hóa đơn
            </button>
            <button onClick={handleDownloadPDF} className="receipt-download-button">
              <Download className="button-icon" />
              Tải PDF
            </button>
            <button onClick={handleCompletePayment} className="receipt-complete-button">
              <CheckCircle className="button-icon" />
              Hoàn tất
            </button>
          </div>
        </div>

        <div className="receipt-content">
          <div className="receipt-header">
            <div className="receipt-logo">
              <div className="logo-placeholder">LOGO</div>
            </div>
            <h1 className="receipt-restaurant-name">NHÀ HÀNG ABC</h1>
            <p className="receipt-restaurant-info">123 Đường XYZ, Quận 1, TP.HCM</p>
            <p className="receipt-restaurant-info">Hotline: 0123 456 789</p>
          </div>

          <div className="receipt-divider"></div>

          <div className="receipt-order-info">
            <h2 className="receipt-title">HÓA ĐƠN THANH TOÁN</h2>
            <div className="receipt-info-row">
              <span className="receipt-info-label">Mã đơn:</span>
              <span className="receipt-info-value">{order.orderNumber}</span>
            </div>
            <div className="receipt-info-row">
              <span className="receipt-info-label">Bàn:</span>
              <span className="receipt-info-value">{order.tableNumber}</span>
            </div>
            <div className="receipt-info-row">
              <span className="receipt-info-label">Thời gian:</span>
              <span className="receipt-info-value">{formatTime(order.orderTime)}</span>
            </div>
            <div className="receipt-info-row">
              <span className="receipt-info-label">Phương thức:</span>
              <span className="receipt-info-value">{paymentMethod === "cash" ? "Tiền mặt" : "QR Code"}</span>
            </div>
          </div>

          <div className="receipt-divider"></div>

          <div className="receipt-items">
            <table className="receipt-table">
              <thead>
                <tr>
                  <th className="receipt-table-header">Món</th>
                  <th className="receipt-table-header receipt-table-center">SL</th>
                  <th className="receipt-table-header receipt-table-right">Đơn giá</th>
                  <th className="receipt-table-header receipt-table-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="receipt-table-cell">
                      {item.name}
                      {item.notes && <div className="receipt-item-note">({item.notes})</div>}
                    </td>
                    <td className="receipt-table-cell receipt-table-center">{item.quantity}</td>
                    <td className="receipt-table-cell receipt-table-right">{formatCurrency(item.price)}</td>
                    <td className="receipt-table-cell receipt-table-right">
                      {formatCurrency(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="receipt-divider"></div>

          <div className="receipt-summary">
            <div className="receipt-summary-row">
              <span className="receipt-summary-label">Tạm tính:</span>
              <span className="receipt-summary-value">{formatCurrency(subtotal)}</span>
            </div>
            <div className="receipt-summary-row">
              <span className="receipt-summary-label">VAT (10%):</span>
              <span className="receipt-summary-value">{formatCurrency(vat)}</span>
            </div>
            <div className="receipt-summary-row receipt-total-row">
              <span className="receipt-total-label">TỔNG CỘNG:</span>
              <span className="receipt-total-value">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="receipt-divider"></div>

          <div className="receipt-footer">
            <p className="receipt-footer-text">Cảm ơn quý khách!</p>
            <p className="receipt-footer-text">Hẹn gặp lại!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-container">
      {showPaymentSuccess && (
        <div className="payment-success-overlay">
          <div className="payment-success-popup">
            <div className="payment-success-icon">
              <CheckCircle />
            </div>
            <h3 className="payment-success-title">Đã nhận tiền!</h3>
            <p className="payment-success-message">Thanh toán thành công</p>
          </div>
        </div>
      )}

      <div className="payment-header">
        <button onClick={onBack} className="payment-back-button">
          <ArrowLeft className="button-icon" />
        </button>
        <div className="payment-header-content">
          <h1 className="payment-title">Chi tiết đơn hàng</h1>
          <p className="payment-subtitle">
            {order.orderNumber} • {order.tableNumber}
          </p>
        </div>
      </div>

      <div className="payment-content">
        <div className="payment-section">
          <h2 className="section-title">Thông tin đơn hàng</h2>
          <div className="order-details-card">
            <div className="order-detail-row">
              <span className="detail-label">Mã đơn:</span>
              <span className="detail-value">{order.orderNumber}</span>
            </div>
            <div className="order-detail-row">
              <span className="detail-label">Bàn:</span>
              <span className="detail-value">{order.tableNumber}</span>
            </div>
            <div className="order-detail-row">
              <span className="detail-label">Thời gian:</span>
              <span className="detail-value">{formatTime(order.orderTime)}</span>
            </div>
          </div>
        </div>

        <div className="payment-section">
          <h2 className="section-title">Chi tiết món ăn</h2>
          <div className="items-card">
            <table className="payment-items-table">
              <thead>
                <tr>
                  <th className="payment-table-header">Món</th>
                  <th className="payment-table-header payment-table-center">SL</th>
                  <th className="payment-table-header payment-table-right">Đơn giá</th>
                  <th className="payment-table-header payment-table-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="payment-table-row">
                    <td className="payment-table-cell">
                      <div className="item-name-cell">{item.name}</div>
                      {item.notes && <div className="item-notes">Ghi chú: {item.notes}</div>}
                    </td>
                    <td className="payment-table-cell payment-table-center">{item.quantity}</td>
                    <td className="payment-table-cell payment-table-right">{formatCurrency(item.price)}</td>
                    <td className="payment-table-cell payment-table-right">
                      {formatCurrency(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="payment-section">
          <h2 className="section-title">Tổng tiền</h2>
          <div className="summary-card">
            <div className="summary-row">
              <span className="summary-label">Tạm tính:</span>
              <span className="summary-value">{formatCurrency(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">VAT (10%):</span>
              <span className="summary-value">{formatCurrency(vat)}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row summary-total">
              <span className="summary-total-label">Tổng cộng:</span>
              <span className="summary-total-value">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="payment-section">
          <h2 className="section-title">Phương thức thanh toán</h2>
          <div className="payment-methods">
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`payment-method-button ${paymentMethod === "cash" ? "active" : ""}`}
            >
              <Wallet className="payment-method-icon" />
              <span className="payment-method-text">Tiền mặt</span>
              {paymentMethod === "cash" && <CheckCircle className="payment-method-check" />}
            </button>
            <button
              onClick={() => setPaymentMethod("qr")}
              className={`payment-method-button ${paymentMethod === "qr" ? "active" : ""}`}
            >
              <CreditCard className="payment-method-icon" />
              <span className="payment-method-text">QR Code</span>
              {paymentMethod === "qr" && <CheckCircle className="payment-method-check" />}
            </button>
          </div>
        </div>

        <div className="payment-action">
          <button onClick={handlePayment} disabled={!paymentMethod} className="payment-submit-button">
            <CheckCircle className="button-icon" />
            Thanh toán {formatCurrency(total)}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderPayment
