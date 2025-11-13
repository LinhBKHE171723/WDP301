import { ArrowLeft, Clock, Users, Search } from "lucide-react"
import "./unpaid-orders-list.css"
import { useEffect, useState, useMemo } from "react"
import OrderPayment from "./order-payment"
import Client from "../../api/Client"

const PAYMENT_METHOD_LABELS = {
  cash: "Tiền mặt",
  qr: "QR Code",
  card: "Thẻ",
}

const ORDER_STATUS_LABELS = {
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị",
  served: "Đã phục vụ",
}

function UnpaidOrdersList({
  onBack,
  onPaymentComplete,
  fetchOrders,
  onOrdersUpdate,
  initialOrders = [],
  showBackButton = true,
  variant = "standalone",
}) {
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [unpaidOrders, setUnpaidOrders] = useState(initialOrders)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [tableFilter, setTableFilter] = useState("")

  const containerClassName = [
    "unpaid-orders-container",
    variant === "embedded" ? "unpaid-orders-container--embedded" : "",
  ]
    .filter(Boolean)
    .join(" ")

  useEffect(() => {
    setUnpaidOrders(initialOrders)
  }, [initialOrders])

  useEffect(() => {
    let ignore = false
    const loadOrders = async () => {
      if (!fetchOrders) return
      setLoading(true)
      setError("")
      try {
        const orders = await fetchOrders()
        if (ignore) return
        setUnpaidOrders(orders)
        onOrdersUpdate?.(orders)
      } catch (err) {
        if (ignore) return
        console.error("fetchOrders error", err)
        setError("Không thể tải danh sách đơn chờ. Vui lòng thử lại.")
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadOrders()

    return () => {
      ignore = true
    }
  }, [fetchOrders, onOrdersUpdate])

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)

  const formatTime = (dateString) =>
    new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateString))

  // Filter orders by table number
  const filteredOrders = useMemo(() => {
    if (!tableFilter.trim()) {
      return unpaidOrders
    }
    const filterValue = tableFilter.trim().toLowerCase()
    return unpaidOrders.filter((order) => {
      const tableNumber = order.tableNumber?.toString().toLowerCase() || ""
      return tableNumber.includes(filterValue)
    })
  }, [unpaidOrders, tableFilter])

  const handlePaymentComplete = async (orderId, paymentMethod) => {
    const paidOrder = unpaidOrders.find((order) => order.id === orderId)
    if (paidOrder) {
      const total = paidOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

      try {
        const methodToSend = paymentMethod || "cash"
        await Client.post(`/cashier/orders/${orderId}/pay`, {
          paymentMethod: methodToSend,
        })

        setUnpaidOrders((prev) => {
          const updated = prev.filter((order) => order.id !== orderId)
          onOrdersUpdate?.(updated)
          return updated
        })

      if (onPaymentComplete) {
        onPaymentComplete({
          orderNumber: paidOrder.orderNumber,
          amount: total,
            method: PAYMENT_METHOD_LABELS[methodToSend] || "Tiền mặt",
          time: new Date().toISOString(),
        })
        }
      } catch (err) {
        console.error("Hoàn tất thanh toán thất bại", err)
        setError("Thanh toán không thành công. Vui lòng thử lại.")
        return
      }
    }

    // Thoát màn chi tiết và quay lại list (đơn đã biến mất)
    setSelectedOrder(null)
  }

  if (selectedOrder) {
    return (
      <OrderPayment
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onPaymentComplete={handlePaymentComplete}
      />
    )
  }

  return (
    <div className={containerClassName}>
      {/* Header */}
      <div className="unpaid-orders-header">
        <div className="unpaid-orders-header-left">
          {showBackButton && onBack && (
        <button onClick={onBack} className="back-button">
          <ArrowLeft className="back-icon" />
        </button>
          )}
        <div className="header-content">
          <h1 className="header-title">Đơn Chờ Thanh Toán</h1>
          <p className="header-subtitle">
            {tableFilter ? `${filteredOrders.length}/${unpaidOrders.length} đơn hàng` : `${unpaidOrders.length} đơn hàng đang chờ`}
          </p>
        </div>
      </div>
      <div className="unpaid-orders-header-action">
        <div className="orders-search">
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search 
              className="search-icon" 
              style={{ 
                position: "absolute", 
                left: "0.75rem", 
                width: "1rem", 
                height: "1rem", 
                color: "var(--muted-foreground)" 
              }} 
            />
            <input
              type="text"
              className="orders-search-input"
              placeholder="Tìm số bàn..."
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              style={{ paddingLeft: "2.5rem" }}
            />
            {tableFilter && (
              <button
                onClick={() => setTableFilter("")}
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.25rem",
                  display: "flex",
                  alignItems: "center",
                  color: "var(--muted-foreground)",
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#b91c1c",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {loading && unpaidOrders.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <Users />
          </div>
          <h3 className="empty-title">Đang tải dữ liệu...</h3>
          <p className="empty-description">Vui lòng chờ trong giây lát.</p>
        </div>
      )}

      {/* Orders List */}
      <div className="orders-list">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="order-card"
            onClick={() => setSelectedOrder(order)}
            style={{ cursor: "pointer" }}
          >
            {/* Order Header */}
            <div className="order-card-header">
              <div className="order-info">
                <h3 className="order-number">{order.orderNumber}</h3>
                <div className="order-meta">
                  <div className="meta-item">
                    <Users className="meta-icon" />
                    <span className="meta-text">{order.tableNumber}</span>
                  </div>
                  <div className="meta-divider"></div>
                  <div className="meta-item">
                    <Clock className="meta-icon" />
                    <span className="meta-text">{formatTime(order.orderTime)}</span>
                  </div>
                      {order.status && (
                        <>
                          <div className="meta-divider"></div>
                          <div className="meta-item">
                            <span className="status-badge">
                              {ORDER_STATUS_LABELS[order.status] || order.status}
                            </span>
                          </div>
                        </>
                      )}
                </div>
              </div>
              <div className="wait-time-badge">
                <Clock className="wait-time-icon" />
                <span className="wait-time-text">{order.waitTime ?? 0} phút</span>
              </div>
            </div>

            {/* Order Items */}
            <div className="order-items">
              <table className="items-table">
                <thead className="items-table-head">
                  <tr>
                    <th className="items-table-header items-header-name">Món ăn</th>
                    <th className="items-table-header items-header-qty">SL</th>
                    <th className="items-table-header items-header-price">Đơn giá</th>
                    <th className="items-table-header items-header-total">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="items-table-body">
                  {order.items.map((item) => (
                    <tr key={item.id} className="items-table-row">
                      <td className="items-table-cell item-name">{item.name}</td>
                      <td className="items-table-cell item-qty">{item.quantity}</td>
                      <td className="items-table-cell item-price">{formatCurrency(item.price)}</td>
                      <td className="items-table-cell item-total">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Order Footer */}
            <div className="order-card-footer">
              <div className="footer-total">
                <span className="footer-total-label">Tổng cộng:</span>
                <span className="footer-total-amount">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {unpaidOrders.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">
            <Users />
          </div>
          <h3 className="empty-title">Không có đơn chờ thanh toán</h3>
          <p className="empty-description">Tất cả đơn hàng đã được thanh toán</p>
        </div>
      )}

      {/* No results for filter */}
      {unpaidOrders.length > 0 && filteredOrders.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">
            <Search />
          </div>
          <h3 className="empty-title">Không tìm thấy đơn hàng</h3>
          <p className="empty-description">Không có đơn nào phù hợp với số bàn "{tableFilter}"</p>
        </div>
      )}

      {loading && unpaidOrders.length > 0 && (
        <p style={{ marginTop: "1rem", color: "var(--muted-foreground)", textAlign: "center" }}>
          Đang cập nhật dữ liệu...
        </p>
      )}
    </div>
  )
}

export default UnpaidOrdersList
