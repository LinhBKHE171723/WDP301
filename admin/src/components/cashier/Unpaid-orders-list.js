import { ArrowLeft, Clock, Users } from "lucide-react"
import "./unpaid-orders-list.css"
import { useState } from "react"
import OrderPayment from "./order-payment"

function UnpaidOrdersList({ onBack, onPaymentComplete }) {
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [unpaidOrders, setUnpaidOrders] = useState([
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
  ])

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)

  const formatTime = (dateString) =>
    new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateString))

  const handlePaymentComplete = (orderId, paymentMethod) => {
    const paidOrder = unpaidOrders.find((order) => order.id === orderId)
    if (paidOrder) {
      const VAT_RATE = 0.1
      const subtotal = paidOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const total = subtotal * (1 + VAT_RATE)

      // XÓA ĐƠN KHỎI LIST NGAY LẬP TỨC
      setUnpaidOrders((prev) => prev.filter((order) => order.id !== orderId))

      // Báo về Dashboard để trừ “Đơn Chờ” và ghi lịch sử
      if (onPaymentComplete) {
        onPaymentComplete({
          orderNumber: paidOrder.orderNumber,
          amount: total,
          method: paymentMethod === "cash" ? "Tiền mặt" : "QR Code",
          time: new Date().toISOString(),
        })
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
    <div className="unpaid-orders-container">
      {/* Header */}
      <div className="unpaid-orders-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeft className="back-icon" />
        </button>
        <div className="header-content">
          <h1 className="header-title">Đơn Chờ Thanh Toán</h1>
          <p className="header-subtitle">{unpaidOrders.length} đơn hàng đang chờ</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="orders-list">
        {unpaidOrders.map((order) => (
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
                </div>
              </div>
              <div className="wait-time-badge">
                <Clock className="wait-time-icon" />
                <span className="wait-time-text">{order.waitTime} phút</span>
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
      {unpaidOrders.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <Users />
          </div>
          <h3 className="empty-title">Không có đơn chờ thanh toán</h3>
          <p className="empty-description">Tất cả đơn hàng đã được thanh toán</p>
        </div>
      )}
    </div>
  )
}

export default UnpaidOrdersList
