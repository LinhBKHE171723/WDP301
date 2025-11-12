import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCookie } from '../utils/cookie';
import { groupOrderItems, getStatusText, getStatusClass, formatOrderDate } from '../utils/orderUtils';
import { API_ENDPOINTS } from '../utils/apiConfig';
import './GuestOrderHistory.css';

const OrderHistory = ({ onBack }) => {
  const { user, isLoggedIn } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // Sort orders

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserOrders();
    }
  }, [isLoggedIn]);

  // Filter and sort orders when orders or filters change
  useEffect(() => {
    let filtered = [...orders];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => {
        // Gộp "paid" vào "served" - nếu order đã thanh toán thì hiển thị như "served"
        if (statusFilter === 'served') {
          return order.status === 'served' || order.status === 'paid';
        }
        return order.status === statusFilter;
      });
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (paymentFilter === 'paid') {
          return order.paymentId && order.paymentId.status === 'paid';
        } else if (paymentFilter === 'unpaid') {
          return !order.paymentId || order.paymentId.status === 'unpaid';
        }
        return true;
      });
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(order => new Date(order.createdAt) >= filterDate);
    }

    // Price filter
    if (priceFilter !== 'all') {
      filtered = filtered.filter(order => {
        const price = order.totalAmount || 0;
        switch (priceFilter) {
          case 'under-100k':
            return price < 100000;
          case '100k-500k':
            return price >= 100000 && price < 500000;
          case '500k-1m':
            return price >= 500000 && price < 1000000;
          case 'over-1m':
            return price >= 1000000;
          default:
            return true;
        }
      });
    }

    // Sort orders
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'price-high':
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        case 'price-low':
          return (a.totalAmount || 0) - (b.totalAmount || 0);
        default:
          return 0;
      }
    });

    setFilteredOrders(filtered);
  }, [orders, statusFilter, paymentFilter, dateFilter, priceFilter, sortBy]);

  const fetchUserOrders = async () => {
    try {
      setLoading(true);
      const token = getCookie('customer_token');
      const response = await fetch(API_ENDPOINTS.CUSTOMER.USER_ORDERS, {
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

  if (!isLoggedIn) {
    return (
      <div className="guest-order-history">
        <div className="guest-order-history-header">
          <h2>Lịch sử đơn hàng</h2>
          <button onClick={onBack} className="back-btn">Quay lại</button>
        </div>
        <div className="no-orders">
          <div className="no-orders-icon">🔒</div>
          <h3>Vui lòng đăng nhập</h3>
          <p>Vui lòng đăng nhập để xem lịch sử đơn hàng</p>
          <button onClick={onBack} className="back-to-menu-btn">
            Quay lại menu
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="guest-order-history">
        <div className="guest-order-history-header">
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
      <div className="guest-order-history">
        <div className="guest-order-history-header">
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
    <div className="guest-order-history">
      <div className="guest-order-history-header">
        <h2>Lịch sử đơn hàng của {user?.name || user?.username}</h2>
        <button onClick={onBack} className="back-btn">Quay lại</button>
      </div>

      {orders.length === 0 ? (
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
            <p>Tìm thấy {filteredOrders.length} đơn hàng hợp lệ trong {orders.length} đơn hàng</p>
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
              <label htmlFor="date-filter">Thời gian:</label>
              <select 
                id="date-filter"
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tất cả</option>
                <option value="today">Hôm nay</option>
                <option value="week">7 ngày qua</option>
                <option value="month">1 tháng qua</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="price-filter">Giá tiền:</label>
              <select 
                id="price-filter"
                value={priceFilter} 
                onChange={(e) => setPriceFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tất cả</option>
                <option value="under-100k">Dưới 100k</option>
                <option value="100k-500k">100k - 500k</option>
                <option value="500k-1m">500k - 1M</option>
                <option value="over-1m">Trên 1M</option>
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
              onClick={() => {
                setStatusFilter('all');
                setPaymentFilter('all');
                setDateFilter('all');
                setPriceFilter('all');
                setSortBy('newest');
              }}
              className="clear-filters-btn"
            >
              Xóa bộ lọc
            </button>
          </div>
          
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
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
                      onClick={() => window.location.href = `/order-status/${order._id}`} 
                      className="view-order-btn"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
