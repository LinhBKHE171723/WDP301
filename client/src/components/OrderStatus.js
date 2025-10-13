import React, { useState, useEffect } from 'react';
import './OrderStatus.css';

const OrderStatus = ({ orderId, onBack }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextUpdate, setNextUpdate] = useState(5);

  useEffect(() => {
    if (orderId) {
      fetchOrderStatus();
      
      // Countdown timer cho next update
      const countdownInterval = setInterval(() => {
        setNextUpdate(prev => {
          if (prev <= 1) {
            fetchOrderStatus();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Cleanup interval khi component unmount
      return () => clearInterval(countdownInterval);
    }
  }, [orderId]);

  const fetchOrderStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/customer/orders/${orderId}`);
      const data = await response.json();

      if (data.success) {
        setOrder(data.data);
        setLastUpdated(new Date());
        setNextUpdate(5); // Reset countdown
      } else {
        setError(data.message || 'Không thể tải thông tin đơn hàng');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Đã đặt món';
      case 'waiting_confirm':
        return 'Chờ xác nhận';
      case 'confirmed':
        return 'Đã xác nhận';
      case 'preparing':
        return 'Đang chuẩn bị';
      case 'ready':
        return 'Sẵn sàng phục vụ';
      case 'served':
        return 'Đã phục vụ';
      case 'paid':
        return 'Đã thanh toán';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
      case 'waiting_confirm':
        return '#ffc107';
      case 'confirmed':
      case 'preparing':
        return '#17a2b8';
      case 'ready':
        return '#28a745';
      case 'served':
        return '#6f42c1';
      case 'paid':
        return '#20c997';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="order-status-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-status-container">
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchOrderStatus} className="retry-btn">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-status-container">
        <div className="error">
          <p>Không tìm thấy thông tin đơn hàng</p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-status-container">
      <div className="order-status-card">
        <div className="header">
          <h2>Trạng thái đơn hàng</h2>
          <button onClick={onBack} className="back-btn">
            ← Quay lại
          </button>
        </div>

        <div className="order-info">
          <div className="info-row">
            <span className="label">Mã đơn hàng:</span>
            <span className="value">{order._id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="info-row">
            <span className="label">Bàn số:</span>
            <span className="value">{order.tableId?.tableNumber || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Tổng tiền:</span>
            <span className="value price">{order.totalAmount?.toLocaleString('vi-VN')} VNĐ</span>
          </div>
        </div>

        <div className="status-section">
          <h3>Trạng thái hiện tại</h3>
          <div 
            className="current-status"
            style={{ backgroundColor: getStatusColor(order.status) }}
          >
            {getStatusText(order.status)}
          </div>
        </div>

        <div className="order-items">
          <h3>Món đã đặt</h3>
          <div className="items-list">
            {order.orderItems?.map((orderItem, index) => (
              <div key={index} className="order-item">
                <div className="item-info">
                  <span className="item-name">
                    {orderItem.itemName || orderItem.itemId?.name || 'Món ăn'}
                  </span>
                  <span className="item-price">
                    {orderItem.price?.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
                <div className="item-quantity">
                  Số lượng: {orderItem.quantity}
                </div>
                {orderItem.itemType && (
                  <div className="item-type">
                    Loại: {orderItem.itemType === 'menu' ? 'Combo' : 'Món ăn'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="actions">
          <div className="auto-update-info">
            {lastUpdated && (
              <span className="last-updated">
                Cập nhật lần cuối: {lastUpdated.toLocaleTimeString('vi-VN')}
              </span>
            )}
          </div>
          <button onClick={fetchOrderStatus} className="refresh-btn">
            Cập nhật trạng thái đơn hàng
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderStatus;
