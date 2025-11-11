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
  const [statusFilter, setStatusFilter] = useState('all'); // Filter by order status
  const [paymentFilter, setPaymentFilter] = useState('all'); // Filter by payment status
  const [sortBy, setSortBy] = useState('newest'); // Sort orders

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

  // Filter and sort orders
  const filteredAndSortedOrders = orders.filter(order => {
    // Status filter - gộp "paid" vào "served"
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'served' ? (order.status === 'served' || order.status === 'paid') : order.status === statusFilter);
    
    const paymentMatch = paymentFilter === 'all' || 
      (paymentFilter === 'paid' && order.paymentId?.status === 'paid') ||
      (paymentFilter === 'unpaid' && (!order.paymentId || order.paymentId?.status === 'unpaid'));
    
    return statusMatch && paymentMatch;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'price-high':
        return b.totalAmount - a.totalAmount;
      case 'price-low':
        return a.totalAmount - b.totalAmount;
      default:
        return 0;
    }
  });

  // Clear all filters and sort
  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setSortBy('newest');
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
            <p>Tìm thấy {filteredAndSortedOrders.length} đơn hàng hợp lệ trong {orders.length} đơn hàng</p>
          </div>

          {/* Filter Controls */}
          <div className="filter-controls">
            <div className="filter-group">
              <label htmlFor="status-filter">Trạng thái đơn hàng:</label>
              <select 
                id="status-filter"
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chờ xử lý</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="preparing">Đang chuẩn bị</option>
                <option value="ready">Sẵn sàng</option>
                <option value="served">Đã phục vụ</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="payment-filter">Tình trạng thanh toán:</label>
              <select 
                id="payment-filter"
                value={paymentFilter} 
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tất cả</option>
                <option value="paid">Đã thanh toán</option>
                <option value="unpaid">Chưa thanh toán</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="sort-filter">Sắp xếp theo:</label>
              <select 
                id="sort-filter"
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="price-high">Giá cao → thấp</option>
                <option value="price-low">Giá thấp → cao</option>
              </select>
            </div>

            <button 
              onClick={clearFilters}
              className="clear-filters-btn"
            >
              Xóa bộ lọc
            </button>
          </div>
          
          {/* Display valid orders */}
          {filteredAndSortedOrders.length > 0 && (
            <div className="orders-list">
              {filteredAndSortedOrders.map((order) => (
                <div key={order._id} className="order-card">
                  <div className="order-header">
                    <div className="order-info-compact">
                      <h3>Đơn hàng #{order._id.slice(-8).toUpperCase()}</h3>
                      <p className="order-date">{formatOrderDate(order.createdAt)}</p>
                    </div>
                    <div className="order-details-compact">
                      <div className="order-detail-item">
                        <span className="detail-label">Số món:</span>
                        <span className="detail-value">{order.orderItems?.length || 0} món</span>
                      </div>
                      {order.tableId && (
                        <div className="order-detail-item">
                          <span className="detail-label">Bàn:</span>
                          <span className="detail-value">Bàn {order.tableId.tableNumber}</span>
                        </div>
                      )}
                      <div className="order-detail-item">
                        <span className="detail-label">Tổng tiền:</span>
                        <span className="detail-value">{(order.totalAmount || 0).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="order-detail-item">
                        <span className="detail-label">Tình trạng:</span>
                        {order.paymentId && (
                          <span className={`payment-status ${order.paymentId.status}`}>
                            {order.paymentId.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                          </span>
                        )}
                        <span className={`status-badge ${getStatusClass(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    </div>
                    <div className="order-actions">
                      <button 
                        onClick={() => handleViewOrder(order._id)} 
                        className="view-order-btn"
                      >
                        Xem chi tiết
                      </button>
                    </div>
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
