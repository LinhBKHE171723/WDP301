import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './OrderStatus.css';

const OrderStatus = ({ orderId, onBack }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([]);
  const [tempCart, setTempCart] = useState([]);
  const [activeTab, setActiveTab] = useState('menus');

  useEffect(() => {
    if (!orderId) return;

    // Fetch dữ liệu ban đầu
    fetchOrderStatus();

    // Kết nối Socket.IO
    const socket = io('http://localhost:5000');

    // Xử lý kết nối thành công
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnectionStatus('connected');
      setError('');
      
      // Join vào room của order này
      socket.emit('join-order', orderId);
    });

    // Lắng nghe event cập nhật order
    socket.on('order-updated', (updatedOrder) => {
      console.log('📦 Order updated:', updatedOrder);
      setOrder(updatedOrder);
      setLastUpdated(new Date());
    });

    // Xử lý lỗi kết nối
    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setConnectionStatus('disconnected');
      setError('Mất kết nối với server. Đang thử kết nối lại...');
    });

    // Xử lý reconnect
    socket.on('reconnect', () => {
      console.log('🔄 Reconnected to server');
      setConnectionStatus('connected');
      setError('');
      fetchOrderStatus(); // Fetch lại dữ liệu mới nhất
      socket.emit('join-order', orderId);
    });

    // Cleanup khi unmount
    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  const fetchOrderStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/customer/orders/${orderId}`);
      const data = await response.json();

      if (data.success) {
        setOrder(data.data);
        setLastUpdated(new Date());
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

  // Group order items by itemId and itemType để hiển thị gộp
  const groupOrderItems = (orderItems) => {
    const grouped = {};
    
    orderItems.forEach(orderItem => {
      const key = `${orderItem.itemId}-${orderItem.itemType}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          itemId: orderItem.itemId,
          itemName: orderItem.itemName,
          itemType: orderItem.itemType,
          price: orderItem.price,
          orderItems: [],
          totalQuantity: 0,
          statusCounts: {}
        };
      }
      
      grouped[key].orderItems.push(orderItem);
      grouped[key].totalQuantity += orderItem.quantity;
      
      // Đếm số lượng theo status
      if (!grouped[key].statusCounts[orderItem.status]) {
        grouped[key].statusCounts[orderItem.status] = 0;
      }
      grouped[key].statusCounts[orderItem.status] += orderItem.quantity;
    });
    
    return Object.values(grouped);
  };

  // Get status text for grouped items
  const getGroupedStatusText = (statusCounts) => {
    const statuses = Object.keys(statusCounts);
    if (statuses.length === 1) {
      return getItemStatusText(statuses[0]);
    }
    
    // Nếu có nhiều status, hiển thị chi tiết
    return statuses.map(status => 
      `${getItemStatusText(status)}: ${statusCounts[status]}`
    ).join(', ');
  };

  // Fetch menus and items for add items modal
  const fetchMenuAndItems = async () => {
    try {
      const [menusRes, itemsRes] = await Promise.all([
        fetch('http://localhost:5000/api/customer/menus'),
        fetch('http://localhost:5000/api/customer/items')
      ]);

      const menusData = await menusRes.json();
      const itemsData = await itemsRes.json();

      if (menusData.success) {
        setMenus(menusData.data);
      }
      if (itemsData.success) {
        setItems(itemsData.data);
      }
    } catch (err) {
      console.error('Error fetching menus and items:', err);
    }
  };

  // Handle opening add items modal
  const handleAddMoreItems = () => {
    setShowAddItemsModal(true);
    setTempCart([]);
    fetchMenuAndItems();
  };

  // Handle closing add items modal
  const handleCloseAddItemsModal = () => {
    setShowAddItemsModal(false);
    setTempCart([]);
  };

  // Add item to temp cart
  const addToTempCart = (item, type = 'item', quantity = 1) => {
    const cartItem = {
      id: item._id,
      name: item.name,
      price: item.price,
      type: type,
      quantity: quantity
    };

    setTempCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item._id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      }
      return [...prevCart, cartItem];
    });
  };

  // Remove item from temp cart
  const removeFromTempCart = (itemId) => {
    setTempCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  // Update quantity in temp cart
  const updateTempCartQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromTempCart(itemId);
      return;
    }
    setTempCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Get total price of temp cart
  const getTempCartTotal = () => {
    return tempCart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Submit new items to order
  const handleAddItemsToOrder = async () => {
    if (tempCart.length === 0) return;

    try {
      const orderItems = tempCart.map(item => ({
        itemId: item.id,
        quantity: item.quantity,
        type: item.type
      }));

      const response = await fetch(`http://localhost:5000/api/customer/orders/${orderId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderItems: orderItems
        })
      });

      const data = await response.json();
      if (data.success) {
        setOrder(data.data);
        handleCloseAddItemsModal();
      } else {
        alert('Lỗi thêm món: ' + data.message);
      }
    } catch (err) {
      alert('Lỗi thêm món');
    }
  };


  // Cancel order item
  const handleCancelItem = async (orderItemId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy món này?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/customer/orders/${orderId}/items/${orderItemId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        alert('Lỗi hủy món: ' + data.message);
      }
    } catch (err) {
      alert('Lỗi hủy món');
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
    <>
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
          <div className="order-items-header">
            <h3>Món đã đặt</h3>
            {order.status === 'pending' && (
              <button onClick={handleAddMoreItems} className="add-more-btn">
                + Gọi thêm món
              </button>
            )}
          </div>
          <div className="items-list">
            {groupOrderItems(order.orderItems || []).map((groupedItem, index) => (
              <div key={index} className="order-item">
                <div className="item-info">
                  <span className="item-name">
                    {groupedItem.itemName || 'Món ăn'}
                  </span>
                  <span className="item-price">
                    {groupedItem.price?.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
                <div className="item-quantity">
                  Số lượng: {groupedItem.totalQuantity}
                </div>
                {groupedItem.itemType && (
                  <div className="item-type">
                    Loại: {groupedItem.itemType === 'menu' ? 'Combo' : 'Món ăn'}
                  </div>
                )}
                <div className="item-status">
                  Trạng thái: <span className={`status-badge status-${Object.keys(groupedItem.statusCounts)[0]}`}>
                    {getGroupedStatusText(groupedItem.statusCounts)}
                  </span>
                </div>
                {Object.keys(groupedItem.statusCounts).includes('pending') && (
                  <div className="item-actions">
                    <button 
                      onClick={() => {
                        // Hủy tất cả OrderItem pending của món này
                        const pendingItems = groupedItem.orderItems.filter(item => item.status === 'pending');
                        if (pendingItems.length > 0) {
                          pendingItems.forEach(item => handleCancelItem(item._id));
                        }
                      }}
                      className="cancel-item-btn"
                    >
                      Hủy món
                    </button>
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
            Cập nhật thủ công
          </button>
        </div>
      </div>

      {/* Add Items Modal */}
      {showAddItemsModal && (
        <div className="add-items-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Gọi thêm món</h3>
              <button onClick={handleCloseAddItemsModal} className="close-btn">
                ✕
              </button>
            </div>
            
            <div className="modal-tabs">
              <button
                className={activeTab === 'menus' ? 'active' : ''}
                onClick={() => setActiveTab('menus')}
              >
                Combo
              </button>
              <button
                className={activeTab === 'items' ? 'active' : ''}
                onClick={() => setActiveTab('items')}
              >
                Món ăn
              </button>
            </div>

            <div className="modal-body">
              <div className="items-grid">
                {activeTab === 'menus' && menus.map(menu => (
                  <div key={menu._id} className="item-card">
                    <div className="item-image">
                      {menu.image ? (
                        <img src={menu.image} alt={menu.name} />
                      ) : (
                        <div className="no-image"></div>
                      )}
                    </div>
                    <div className="item-details">
                      <h4>{menu.name}</h4>
                      <p className="item-description">{menu.description}</p>
                      <div className="item-price">
                        {menu.price?.toLocaleString('vi-VN')} VNĐ
                      </div>
                      <button
                        onClick={() => addToTempCart(menu, 'menu')}
                        className="add-to-cart-btn"
                      >
                        Thêm vào giỏ
                      </button>
                    </div>
                  </div>
                ))}
                
                {activeTab === 'items' && items.map(item => (
                  <div key={item._id} className="item-card">
                    <div className="item-image">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <div className="no-image"></div>
                      )}
                    </div>
                    <div className="item-details">
                      <h4>{item.name}</h4>
                      <p className="item-description">{item.description}</p>
                      <div className="item-category">{item.category}</div>
                      <div className="item-price">
                        {item.price?.toLocaleString('vi-VN')} VNĐ
                      </div>
                      <button
                        onClick={() => addToTempCart(item, 'item')}
                        className="add-to-cart-btn"
                      >
                        Thêm vào giỏ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {tempCart.length > 0 && (
              <div className="temp-cart">
                <h4>Giỏ hàng tạm</h4>
                <div className="temp-cart-items">
                  {tempCart.map(item => (
                    <div key={item.id} className="temp-cart-item">
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <span className="item-price">
                          {item.price.toLocaleString('vi-VN')} VNĐ
                        </span>
                      </div>
                      <div className="item-controls">
                        <button onClick={() => updateTempCartQuantity(item.id, item.quantity - 1)}>
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateTempCartQuantity(item.id, item.quantity + 1)}>
                          +
                        </button>
                        <button onClick={() => removeFromTempCart(item.id)} className="remove-btn">
                          Hủy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="temp-cart-footer">
                  <div className="total-price">
                    Tổng: {getTempCartTotal().toLocaleString('vi-VN')} VNĐ
                  </div>
                  <button onClick={handleAddItemsToOrder} className="submit-btn">
                    Thêm vào đơn hàng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default OrderStatus;
