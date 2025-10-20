import React, { useState, useEffect } from 'react';
import FeedbackForm from './FeedbackForm';
import './OrderStatus.css';

const OrderStatus = ({ orderId, onBack }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextUpdate, setNextUpdate] = useState(5);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('menus');
  const [note, setNote] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderStatus();
      
      // Countdown timer cho next update - chỉ fetch khi order có thể thay đổi
      const countdownInterval = setInterval(() => {
        setNextUpdate(prev => {
          if (prev <= 1) {
            // Chỉ fetch nếu order status có thể thay đổi
            if (order && ['pending', 'waiting_confirm', 'confirmed', 'preparing', 'ready'].includes(order.status)) {
              fetchOrderStatus();
            }
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Cleanup interval khi component unmount
      return () => clearInterval(countdownInterval);
    }
  }, [orderId]);

  const fetchMenusAndItems = async () => {
    try {
      const [menusRes, itemsRes] = await Promise.all([
        fetch('http://localhost:5000/api/customer/menus'),
        fetch('http://localhost:5000/api/customer/items')
      ]);
      
      const menusData = await menusRes.json();
      const itemsData = await itemsRes.json();
      
      if (menusData.success) setMenus(menusData.data);
      if (itemsData.success) setItems(itemsData.data);
    } catch (err) {
      console.error('Error fetching menus and items:', err);
    }
  };

  const handleAddItemToOrder = async () => {
    if (!selectedMenu && !selectedItem) {
      alert('Vui lòng chọn món để thêm vào đơn hàng!');
      return;
    }
    
    try {
      const itemToAdd = selectedMenu || selectedItem;
      console.log('Adding item to order:', {
        orderId,
        itemId: itemToAdd._id,
        quantity,
        type: selectedMenu ? 'menu' : 'item',
        note
      });
      
      const response = await fetch(`http://localhost:5000/api/customer/orders/${orderId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderItems: [{
            itemId: itemToAdd._id,
            quantity: quantity,
            type: selectedMenu ? 'menu' : 'item',
            note: note
          }]
        })
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        alert('Đã thêm món vào đơn hàng thành công!');
        setShowAddItemModal(false);
        setSelectedMenu(null);
        setSelectedItem(null);
        setQuantity(1);
        setNote('');
        fetchOrderStatus(); // Refresh order status
      } else {
        alert('Lỗi: ' + (data.message || 'Không thể thêm món vào đơn hàng'));
      }
    } catch (err) {
      console.error('Error adding item to order:', err);
      alert('Lỗi kết nối server: ' + err.message);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/customer/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled'
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Đơn hàng đã được hủy thành công!');
        fetchOrderStatus(); // Refresh order status
      } else {
        alert(`Lỗi: ${data.message || 'Không thể hủy đơn hàng'}`);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Có lỗi xảy ra khi hủy đơn hàng');
    }
  };

  const handleFeedbackSubmitted = (feedbackData) => {
    console.log('Feedback submitted:', feedbackData);
    setShowFeedbackModal(false);
    alert('Cảm ơn bạn đã đánh giá dịch vụ!');
  };

  const handleShowFeedback = () => {
    setShowFeedbackModal(true);
  };

  const fetchOrderStatus = async (isBackground = false) => {
    try {
      // Chỉ show loading cho lần đầu tiên
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const response = await fetch(`http://localhost:5000/api/customer/orders/${orderId}`);
      const data = await response.json();

      if (data.success) {
        // Chỉ update nếu data thực sự thay đổi (chỉ so sánh những field quan trọng)
        setOrder(prevOrder => {
          if (!prevOrder) {
            return data.data;
          }
          
          // So sánh chỉ những field quan trọng
          const prevImportant = {
            status: prevOrder.status,
            orderItems: prevOrder.orderItems?.map(item => ({
              status: item.status,
              quantity: item.quantity
            }))
          };
          
          const newImportant = {
            status: data.data.status,
            orderItems: data.data.orderItems?.map(item => ({
              status: item.status,
              quantity: item.quantity
            }))
          };
          
          if (JSON.stringify(prevImportant) !== JSON.stringify(newImportant)) {
            setHasNewUpdate(true);
            setTimeout(() => setHasNewUpdate(false), 2000);
            return data.data;
          }
          
          return prevOrder; // Giữ nguyên nếu không có thay đổi quan trọng
        });
        setLastUpdated(new Date());
        setNextUpdate(5); // Reset countdown
        setError(''); // Clear any previous errors
      } else {
        // Chỉ set error nếu chưa có data (lần đầu)
        if (isInitialLoad) {
          setError(data.message || 'Không thể tải thông tin đơn hàng');
        }
      }
    } catch (err) {
      // Chỉ set error nếu chưa có data (lần đầu)
      if (isInitialLoad) {
        setError('Lỗi kết nối server');
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Chờ xác nhận';
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
        return '#ffc107';
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

  const getItemStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Chờ xử lý';
      case 'preparing':
        return 'Đang chuẩn bị';
      case 'ready':
        return 'Sẵn sàng';
      case 'served':
        return 'Đã phục vụ';
      default:
        return status;
    }
  };

  // Group items by name and note
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
      
      // Count items by status
      const status = orderItem.status || 'pending';
      if (!grouped[key].statusCounts[status]) {
        grouped[key].statusCounts[status] = 0;
      }
      grouped[key].statusCounts[status] += orderItem.quantity;
    });
    
    return Object.values(grouped);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={fetchOrderStatus} className="retry-btn">
          Thử lại
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="error">
        <p>Không tìm thấy thông tin đơn hàng</p>
      </div>
    );
  }

  return (
    <div>
      <div className="order-status-card">
        <div className="header">
          <h2>Trạng thái đơn hàng</h2>
          {order && order.status === 'pending' && (
            <button onClick={handleCancelOrder} className="cancel-order-btn">
              Hủy đơn hàng
            </button>
          )}
          {order && (order.status === 'paid' || order.status === 'cancelled') && (
            <button onClick={onBack} className="back-to-menu-btn">
              Quay lại menu
            </button>
          )}
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
          <div className="order-items-header">
            <h3>Món đã đặt</h3>
            {order && ['pending', 'waiting_confirm', 'confirmed'].includes(order.status) && (
              <button onClick={() => {
                setShowAddItemModal(true);
                fetchMenusAndItems();
              }} className="add-item-btn">
                Thêm món vào đơn hàng
              </button>
            )}
          </div>
          <div className="items-list">
            {groupOrderItems(order.orderItems)?.map((groupedItem, index) => (
              <div key={index} className="order-item">
                <div className="item-info">
                  <span className="item-name">
                    {groupedItem.name}
                  </span>
                  <span className="item-price">
                    {groupedItem.price?.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
                <div className="item-quantity">
                  Số lượng: {groupedItem.totalQuantity}
                </div>
                {groupedItem.note && (
                  <div className="item-note">
                    Ghi chú: {groupedItem.note}
                  </div>
                )}
                {groupedItem.itemType && (
                  <div className="item-type">
                    Loại: {groupedItem.itemType === 'menu' ? 'Combo' : 'Món ăn'}
                  </div>
                )}
                {Object.keys(groupedItem.statusCounts).length > 0 && (
                  <div className="item-statuses">
                    <div className="statuses-label">Trạng thái:</div>
                    <div className="statuses-list">
                      {Object.entries(groupedItem.statusCounts).map(([status, count]) => (
                        <span key={status} className={`status-badge status-${status}`}>
                          {getItemStatusText(status)} ({count})
                        </span>
                      ))}
                    </div>
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
                {hasNewUpdate && <span className="new-update-indicator"> ✨ Có cập nhật mới!</span>}
              </span>
            )}
          </div>
          <div className="action-buttons">
            <button onClick={() => fetchOrderStatus()} className="refresh-btn">
              Cập nhật trạng thái đơn hàng
            </button>
            {order && order.status === 'paid' && (
              <button onClick={handleShowFeedback} className="feedback-btn">
                💬 Đánh giá dịch vụ
              </button>
            )}
          </div>
        </div>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="add-item-modal">
          <div className="add-item-modal-content">
            <div className="modal-header">
              <h3>Thêm món vào đơn hàng</h3>
              <button onClick={() => setShowAddItemModal(false)} className="close-btn">✕</button>
            </div>
            
            <div className="modal-body">
              {/* Tabs */}
              <div className="modal-tabs">
                <button 
                  className={`tab-btn ${activeTab === 'menus' ? 'active' : ''}`}
                  onClick={() => setActiveTab('menus')}
                >
                  Thực đơn
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`}
                  onClick={() => setActiveTab('items')}
                >
                  Món lẻ
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === 'menus' && (
                  <div className="menu-grid">
                    {menus.map(menu => (
                      <div 
                        key={menu._id} 
                        className={`menu-card ${selectedMenu?._id === menu._id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedMenu(menu);
                          setSelectedItem(null);
                        }}
                      >
                        <div className="menu-image">
                          <img src={menu.image || '/api/placeholder/300/200'} alt={menu.name} />
                        </div>
                        <div className="menu-content">
                          <h5>{menu.name}</h5>
                          <p className="menu-description">{menu.description}</p>
                          <div className="menu-price">{menu.price.toLocaleString('vi-VN')} VNĐ</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {activeTab === 'items' && (
                  <div className="item-grid">
                    {items.map(item => (
                      <div 
                        key={item._id} 
                        className={`item-card ${selectedItem?._id === item._id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedItem(item);
                          setSelectedMenu(null);
                        }}
                      >
                        <div className="item-image">
                          <img src={item.image || '/api/placeholder/300/200'} alt={item.name} />
                        </div>
                        <div className="item-content">
                          <h5>{item.name}</h5>
                          <p className="item-description">{item.description}</p>
                          <div className="item-price">{item.price.toLocaleString('vi-VN')} VNĐ</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="quantity-section">
                {(selectedMenu || selectedItem) && (
                  <div className="selected-item-info">
                    <h4>Món đã chọn:</h4>
                    <div className="selected-item">
                      <img src={(selectedMenu || selectedItem)?.image || '/api/placeholder/100/100'} alt={(selectedMenu || selectedItem)?.name} />
                      <div className="selected-item-details">
                        <h5>{(selectedMenu || selectedItem)?.name}</h5>
                        <p>{(selectedMenu || selectedItem)?.price?.toLocaleString('vi-VN')} VNĐ</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="quantity-controls">
                  <label>Số lượng:</label>
                  <div className="quantity-buttons">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                    <span>{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)}>+</button>
                  </div>
                </div>
                
                <div className="note-section">
                  <label>Ghi chú:</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="VD: Ít cay, không hành, thêm rau..."
                    rows="3"
                    maxLength="200"
                    className="note-textarea"
                  />
                  <div className="char-count">
                    {note.length}/200 ký tự
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowAddItemModal(false)} className="cancel-btn">
                Hủy
              </button>
              <button onClick={handleAddItemToOrder} className="confirm-btn">
                Thêm vào đơn hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="feedback-modal">
          <div className="feedback-modal-content">
            <div className="feedback-modal-header">
              <h3>Đánh giá dịch vụ</h3>
              <button 
                onClick={() => setShowFeedbackModal(false)} 
                className="close-feedback-btn"
              >
                ×
              </button>
            </div>
            <div className="feedback-modal-body">
              <FeedbackForm 
                orderId={orderId}
                onSubmit={handleFeedbackSubmitted}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default OrderStatus;
