import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './OrderHistory.css';

const OrderHistory = ({ onBack }) => {
  const { user, isLoggedIn } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserOrders();
    }
  }, [isLoggedIn]);

  const fetchUserOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('customer_token');
      const response = await fetch('http://localhost:5000/api/customer/user/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setOrders(data.data);
      } else {
        setError(data.message || 'Không thể tải danh sách đơn hàng');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'Chờ xử lý',
      'waiting_confirm': 'Chờ xác nhận',
      'confirmed': 'Đã xác nhận',
      'preparing': 'Đang chuẩn bị',
      'ready': 'Sẵn sàng',
      'served': 'Đã phục vụ',
      'paid': 'Đã thanh toán',
      'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'pending': 'status-pending',
      'waiting_confirm': 'status-waiting',
      'confirmed': 'status-confirmed',
      'preparing': 'status-preparing',
      'ready': 'status-ready',
      'served': 'status-served',
      'paid': 'status-paid',
      'cancelled': 'status-cancelled'
    };
    return classMap[status] || 'status-default';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupOrderItems = (orderItems) => {
    const grouped = {};
    orderItems?.forEach((orderItem) => {
      const itemName = orderItem.itemName || orderItem.itemId?.name || 'Món ăn';
      const note = orderItem.note || '';
      const key = `${itemName}-${note}`;

      if (!grouped[key]) {
        grouped[key] = {
          name: itemName,
          note: note,
          price: orderItem.price,
          itemType: orderItem.itemType,
          totalQuantity: 0,
          items: [],
          statusCounts: {}
        };
      }
      grouped[key].totalQuantity += orderItem.quantity;
      grouped[key].items.push(orderItem);
      
      const status = orderItem.status || 'pending';
      if (!grouped[key].statusCounts[status]) {
        grouped[key].statusCounts[status] = 0;
      }
      grouped[key].statusCounts[status] += orderItem.quantity;
    });
    return Object.values(grouped);
  };

  if (!isLoggedIn) {
    return (
      <div className="order-history">
        <div className="order-history-header">
          <h2>Lịch sử đơn hàng</h2>
          <button onClick={onBack} className="back-btn">Quay lại</button>
        </div>
        <div className="login-required">
          <p>Vui lòng đăng nhập để xem lịch sử đơn hàng</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="order-history">
        <div className="order-history-header">
          <h2>Lịch sử đơn hàng</h2>
          <button onClick={onBack} className="back-btn">Quay lại</button>
        </div>
        <div className="loading">
          <p>Đang tải danh sách đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-history">
        <div className="order-history-header">
          <h2>Lịch sử đơn hàng</h2>
          <button onClick={onBack} className="back-btn">Quay lại</button>
        </div>
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchUserOrders} className="retry-btn">Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-history">
      <div className="order-history-header">
        <h2>Lịch sử đơn hàng của {user?.name || user?.username}</h2>
        <button onClick={onBack} className="back-btn">Quay lại</button>
      </div>

      {orders.length === 0 ? (
        <div className="no-orders">
          <p>Bạn chưa có đơn hàng nào</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>Đơn hàng #{order._id.slice(-8).toUpperCase()}</h3>
                  <p className="order-date">{formatDate(order.createdAt)}</p>
                  {order.tableId && (
                    <p className="table-info">Bàn số: {order.tableId.tableNumber}</p>
                  )}
                </div>
                <div className="order-status">
                  <span className={`status-badge ${getStatusClass(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>

              <div className="order-items">
                <h4>Món đã đặt:</h4>
                {groupOrderItems(order.orderItems)?.map((groupedItem, index) => (
                  <div key={index} className="order-item">
                    <div className="item-info">
                      <span className="item-name">{groupedItem.name}</span>
                      <span className="item-quantity">x{groupedItem.totalQuantity}</span>
                      <span className="item-price">{groupedItem.price.toLocaleString('vi-VN')}đ</span>
                    </div>
                    {groupedItem.note && (
                      <div className="item-note">Ghi chú: {groupedItem.note}</div>
                    )}
                    {Object.keys(groupedItem.statusCounts).length > 0 && (
                      <div className="item-statuses">
                        <div className="statuses-label">Trạng thái:</div>
                        <div className="statuses-list">
                          {Object.entries(groupedItem.statusCounts).map(([status, count]) => (
                            <span key={status} className={`status-badge status-${status}`}>
                              {getStatusText(status)} ({count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <div className="total-amount">
                  <strong>Tổng tiền: {order.totalAmount.toLocaleString('vi-VN')}đ</strong>
                </div>
                {order.paymentId && (
                  <div className="payment-info">
                    <span className={`payment-status ${order.paymentId.status}`}>
                      {order.paymentId.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
