import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGuestOrderIds, removeOrderIdFromCookie } from '../utils/cookie';
import { groupOrderItems, getStatusText, getStatusClass, formatOrderDate } from '../utils/orderUtils';
import { API_ENDPOINTS } from '../utils/apiConfig';
import './GuestOrderHistory.css';

const GuestOrderHistory = ({ onBack }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invalidOrderIds, setInvalidOrderIds] = useState([]); // Track invalid order IDs to remove from cookie

  useEffect(() => {
    fetchGuestOrders();
  }, []);

  // Auto-remove invalid orders from cookie
  useEffect(() => {
    if (invalidOrderIds.length > 0) {
      console.log('Removing invalid orders from cookie:', invalidOrderIds);
      invalidOrderIds.forEach(orderId => {
        removeOrderIdFromCookie(orderId);
      });
    }
  }, [invalidOrderIds]);

  const fetchGuestOrders = async () => {
    try {
      setLoading(true);
      setError('');
      setInvalidOrderIds([]);
      
      const orderIds = getGuestOrderIds();
      
      if (orderIds.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Fetch all orders in parallel
      const orderPromises = orderIds.map(async (orderId) => {
        try {
          const response = await fetch(API_ENDPOINTS.CUSTOMER.ORDER_BY_ID(orderId));
          const data = await response.json();
          
          if (data.success) {
            return data.data;
          } else {
            // Order not found or error - mark for removal from cookie
            console.log(`Order ${orderId} not found, will be removed from cookie`);
            setInvalidOrderIds(prev => [...prev, orderId]);
            return null;
          }
        } catch (err) {
          // Network error or other issues - mark for removal from cookie
          console.log(`Order ${orderId} failed to fetch, will be removed from cookie`);
          setInvalidOrderIds(prev => [...prev, orderId]);
          return null;
        }
      });

      const orderResults = await Promise.all(orderPromises);
      
      // Filter out null results (failed orders)
      const validOrders = orderResults.filter(order => order !== null);
      
      setOrders(validOrders);
      
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (orderId) => {
    // Navigate to OrderStatus component
    navigate(`/order-status/${orderId}`);
  };


  if (loading) {
    return (
      <div className="guest-order-history">
        <div className="guest-order-history-header">
          <h2>Đơn hàng đã đặt</h2>
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
      <div className="guest-order-history">
        <div className="guest-order-history-header">
          <h2>Đơn hàng đã đặt</h2>
          <button onClick={onBack} className="back-btn">Quay lại</button>
        </div>
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchGuestOrders} className="retry-btn">Thử lại</button>
        </div>
      </div>
    );
  }

  const orderIds = getGuestOrderIds();
  const hasOrders = orders.length > 0;

  return (
    <div className="guest-order-history">
      <div className="guest-order-history-header">
        <h2>Đơn hàng đã đặt</h2>
        <button onClick={onBack} className="back-btn">Quay lại</button>
      </div>

      {!hasOrders ? (
        <div className="no-orders">
          <div className="no-orders-icon">📋</div>
          <h3>Chưa có đơn hàng nào</h3>
          <p>Bạn chưa đặt món nào. Hãy quay lại menu để đặt món!</p>
          <button onClick={onBack} className="back-to-menu-btn">
            Quay lại menu
          </button>
        </div>
      ) : (
        <div className="orders-section">
          <div className="orders-info">
            <p>Tìm thấy {orders.length} đơn hàng hợp lệ</p>
          </div>
          
          {/* Display valid orders */}
          {orders.length > 0 && (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order._id} className="order-card">
                  <div className="order-header">
                    <div className="order-info">
                      <h3>Đơn hàng #{order._id.slice(-8).toUpperCase()}</h3>
                      <p className="order-date">{formatOrderDate(order.createdAt)}</p>
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

                  <div className="order-summary">
                    <div className="order-summary-info">
                      <span className="summary-label">Số món:</span>
                      <span className="summary-value">{order.orderItems?.length || 0} món</span>
                    </div>
                    {order.tableId && (
                      <div className="order-summary-info">
                        <span className="summary-label">Bàn:</span>
                        <span className="summary-value">Bàn {order.tableId.tableNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="order-footer">
                    <div className="order-footer-left">
                      <div className="total-amount">
                        Tổng tiền: {order.totalAmount.toLocaleString('vi-VN')}đ
                      </div>
                      {order.paymentId && (
                        <div className="payment-info">
                          <span className={`payment-status ${order.paymentId.status}`}>
                            {order.paymentId.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                          </span>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => handleViewOrder(order._id)} 
                      className="view-order-btn"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default GuestOrderHistory;
