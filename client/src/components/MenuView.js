import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCookie, setCookie, eraseCookie, addOrderIdToCookie, getGuestOrderIds, validateAndCleanGuestOrderIds } from '../utils/cookie';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import ItemDetail from './ItemDetail';
import OrderStatus from './OrderStatus';
import { filterMenusByPrice, filterItemsByPriceAndCategory, getUniqueCategories } from '../utils/priceFilters';
import { API_ENDPOINTS } from '../utils/apiConfig';
import './MenuView.css';

const MenuView = ({ table, onBack }) => {
  const navigate = useNavigate();
  const { user, isLoggedIn, login, logout } = useAuth();
  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('menus');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [priceFilter, setPriceFilter] = useState('all');
  const [itemPriceFilter, setItemPriceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentOrderId, setCurrentOrderId] = useState(null);

  useEffect(() => {
    // Khôi phục và validate order id từ cookie
    const validateAndSetOrderId = async () => {
      // Dọn dẹp guest order IDs trước
      await validateAndCleanGuestOrderIds();
      
      const savedOrderId = getCookie('current_order_id');
      
      if (savedOrderId) {
        try {
          // Kiểm tra order có tồn tại trong database không
          const response = await fetch(API_ENDPOINTS.CUSTOMER.ORDER_BY_ID(savedOrderId));
          const data = await response.json();
          
          if (data.success) {
            // Order tồn tại, set currentOrderId
            setCurrentOrderId(savedOrderId);
            console.log('Valid order found in cookie:', savedOrderId);
          } else {
            // Order không tồn tại, xóa khỏi cookie
            console.log('Invalid order ID in cookie, removing:', savedOrderId);
            eraseCookie('current_order_id');
          }
        } catch (err) {
          // Lỗi kết nối, xóa cookie để tránh lỗi
          console.log('Error validating order, removing from cookie:', savedOrderId);
          eraseCookie('current_order_id');
        }
      }
    };

    validateAndSetOrderId();
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [menusRes, itemsRes] = await Promise.all([
        fetch(API_ENDPOINTS.CUSTOMER.MENUS),
        fetch(API_ENDPOINTS.CUSTOMER.ITEMS)
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
      setError('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item, type = 'item', quantity = 1, note = '') => {
    const cartItem = {
      id: item._id,
      name: item.name,
      price: item.price,
      type: type,
      quantity: quantity,
      note: note
    };

    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item._id && cartItem.note === note);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item._id && cartItem.note === note
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      }
      return [...prevCart, cartItem];
    });
  };

  const handleViewDetail = (item, type) => {
    setSelectedItem({ item, type });
    setShowItemDetail(true);
  };

  const handleCloseDetail = () => {
    setShowItemDetail(false);
    setSelectedItem(null);
  };

  const handleNoteChange = (item, newNote) => {
    setCart(prevCart =>
      prevCart.map(cartItem =>
        cartItem.id === item.id && cartItem.note === item.note
          ? { ...cartItem, note: newNote }
          : cartItem
      )
    );
  };

  const removeFromCart = (itemId, note = '') => {
    setCart(prevCart => prevCart.filter(item => 
      !(item.id === itemId && item.note === note)
    ));
  };

  const updateQuantity = (itemId, newQuantity, note = '') => {
    if (newQuantity <= 0) {
      removeFromCart(itemId, note);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId && item.note === note ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleOrder = async () => {
    if (cart.length === 0) return;

    try {
      const orderItems = cart.map(item => ({
        itemId: item.id,
        quantity: item.quantity,
        type: item.type, // Thêm type để phân biệt Menu và Item
        note: item.note || "" // Thêm note
      }));

      const response = await fetch(API_ENDPOINTS.CUSTOMER.ORDERS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
         body: JSON.stringify({
           tableId: table?._id || null,
           orderItems: orderItems,
           userId: user?.id || null
         })
      });

      const data = await response.json();
      if (data.success) {
        setCurrentOrderId(data.data._id);
        // Lưu order id vào cookie trong 2 ngày (cho order hiện tại)
        setCookie('current_order_id', data.data._id, 2);
        // Thêm order ID vào danh sách guest order history
        addOrderIdToCookie(data.data._id);
        setCart([]);
        setShowCart(false);
      } else {
        alert('Lỗi đặt món: ' + data.message);
      }
    } catch (err) {
      alert('Lỗi đặt món');
    }
  };

  const handleLogin = (userData, token) => {
    login(userData, token);
    alert(`Chào mừng ${userData.name}!`);
  };

  const handleRegister = (userData, token) => {
    login(userData, token);
    alert(`Chào mừng ${userData.name}! Đăng ký thành công!`);
  };

  const handleLogout = () => {
    logout();
    alert('Đã đăng xuất thành công!');
  };

  const handleSwitchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  const handleBackFromOrder = () => {
    setCurrentOrderId(null);
    eraseCookie('current_order_id');
  };

  // Hiển thị OrderStatus nếu có orderId
  if (currentOrderId) {
    return (
      <OrderStatus 
        orderId={currentOrderId} 
        onBack={handleBackFromOrder} 
      />
    );
  }

  if (loading) {
    return (
      <div className="menu-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải thực đơn...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="menu-error">
        <p>{error}</p>
        <button onClick={fetchData}>Thử lại</button>
      </div>
    );
  }

  return (
    <div className="menu-view">
      <header className="menu-header">
        <div className="header-info">
          <h1>Thực đơn nhà hàng</h1>
        </div>
        <div className="header-actions">
          {isLoggedIn ? (
            <div className="user-info">
              <span className="welcome-text">Xin chào, {user?.name || user?.username || 'Khách hàng'}!</span>
              <button onClick={() => navigate('/order-history')} className="order-history-btn">
                📋 Lịch sử đơn hàng
              </button>
              <button onClick={handleLogout} className="logout-btn">
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="guest-actions">
              <button onClick={() => setShowLoginModal(true)} className="login-btn">
                Đăng nhập
              </button>
              {getGuestOrderIds().length > 0 && (
                <button onClick={() => navigate('/guest-order-history')} className="guest-order-history-btn">
                  📋 Đơn hàng đã đặt ({getGuestOrderIds().length})
                </button>
              )}
            </div>
          )}
          <button onClick={() => setShowCart(true)} className="cart-btn">
            Giỏ hàng ({cart.length})
          </button>
        </div>
      </header>

      <div className="menu-tabs">
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

      <div className="menu-content">
        {activeTab === 'menus' && (
          <>
            <div className="price-filter">
              <h3>Lọc theo giá:</h3>
              <div className="filter-buttons">
                <button
                  className={priceFilter === 'all' ? 'active' : ''}
                  onClick={() => setPriceFilter('all')}
                >
                  Tất cả
                </button>
                <button
                  className={priceFilter === 'under-100k' ? 'active' : ''}
                  onClick={() => setPriceFilter('under-100k')}
                >
                  Dưới 100k
                </button>
                <button
                  className={priceFilter === '100k-200k' ? 'active' : ''}
                  onClick={() => setPriceFilter('100k-200k')}
                >
                  100k - 200k
                </button>
                <button
                  className={priceFilter === '200k-500k' ? 'active' : ''}
                  onClick={() => setPriceFilter('200k-500k')}
                >
                  200k - 500k
                </button>
                <button
                  className={priceFilter === '500k-1000k' ? 'active' : ''}
                  onClick={() => setPriceFilter('500k-1000k')}
                >
                  500k - 1000k
                </button>
                <button
                  className={priceFilter === '1000k-2000k' ? 'active' : ''}
                  onClick={() => setPriceFilter('1000k-2000k')}
                >
                  1000k - 2000k
                </button>
                <button
                  className={priceFilter === '2000k-5000k' ? 'active' : ''}
                  onClick={() => setPriceFilter('2000k-5000k')}
                >
                  2000k - 5000k
                </button>
                <button
                  className={priceFilter === 'over-5000k' ? 'active' : ''}
                  onClick={() => setPriceFilter('over-5000k')}
                >
                  Trên 5000k
                </button>
              </div>
            </div>
            <div className="menu-grid">
              {filterMenusByPrice(menus, priceFilter).map(menu => (
              <div key={menu._id} className="menu-card">
                <div 
                  className="menu-image clickable"
                  onClick={() => handleViewDetail(menu, 'menu')}
                >
                  {menu.image ? (
                    <img src={menu.image} alt={menu.name} />
                  ) : (
                    <div></div>
                  )}
                  <div className="view-detail-overlay">
                    <span></span>
                  </div>
                </div>
                <div className="menu-info">
                  <h3 
                    className="clickable"
                    onClick={() => handleViewDetail(menu, 'menu')}
                  >
                    {menu.name}
                  </h3>
                  <p className="menu-description">{menu.description}</p>
                  <div className="menu-price">
                    {menu.price?.toLocaleString('vi-VN')} VNĐ
                  </div>
                  <div className="menu-actions">
                    <button
                      onClick={() => handleViewDetail(menu, 'menu')}
                      className="view-detail-btn"
                    >
                      Chi tiết
                    </button>
                    <button
                      onClick={() => addToCart(menu, 'menu')}
                      className="add-to-cart-btn"
                    >
                      Thêm vào giỏ
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </>
        )}

        {activeTab === 'items' && (
          <>
            <div className="item-filters">
              <div className="filter-group">
                <label htmlFor="price-filter">Lọc theo giá:</label>
                <select
                  id="price-filter"
                  value={itemPriceFilter}
                  onChange={(e) => setItemPriceFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Tất cả giá</option>
                  <option value="under-50k">Dưới 50k</option>
                  <option value="50k-100k">50k - 100k</option>
                  <option value="100k-200k">100k - 200k</option>
                  <option value="200k-500k">200k - 500k</option>
                  <option value="over-500k">Trên 500k</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label htmlFor="category-filter">Lọc theo loại:</label>
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Tất cả loại</option>
                  {getUniqueCategories(items).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="menu-grid">
              {filterItemsByPriceAndCategory(items, itemPriceFilter, categoryFilter).map(item => (
              <div key={item._id} className="menu-card">
                <div 
                  className="menu-image clickable"
                  onClick={() => handleViewDetail(item, 'item')}
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : (
                    <div></div>
                  )}
                  <div className="view-detail-overlay">
                    <span></span>
                  </div>
                </div>
                <div className="menu-info">
                  <h3 
                    className="clickable"
                    onClick={() => handleViewDetail(item, 'item')}
                  >
                    {item.name}
                  </h3>
                  <p className="menu-description">{item.description}</p>
                  <div className="menu-category">{item.category}</div>
                  <div className="menu-price">
                    {item.price?.toLocaleString('vi-VN')} VNĐ
                  </div>
                  <div className="menu-actions">
                    <button
                      onClick={() => handleViewDetail(item, 'item')}
                      className="view-detail-btn"
                    >
                      Chi tiết
                    </button>
                    <button
                      onClick={() => addToCart(item, 'item')}
                      className="add-to-cart-btn"
                    >
                      Thêm vào giỏ
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </div>

      {showCart && (
        <div className="cart-modal">
          <div className="cart-content">
            <div className="cart-header">
              <h3>Giỏ hàng</h3>
              <button onClick={() => setShowCart(false)} className="close-btn">
                ✕
              </button>
            </div>
             <div className="cart-items">
               {cart.map((item, index) => (
                 <div key={`${item.id}-${index}`} className="cart-item">
                   <div className="item-info">
                     <h4>{item.name}</h4>
                     <p>{item.price.toLocaleString('vi-VN')} VNĐ</p>
                     <div className="note-input-container">
                       <input
                         type="text"
                         value={item.note || ''}
                         onChange={(e) => handleNoteChange(item, e.target.value)}
                         placeholder="Ghi chú cho món này..."
                         className="note-input"
                         maxLength="100"
                       />
                     </div>
                   </div>
                   <div className="item-controls">
                     <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.note)}>
                       -
                     </button>
                     <input
                       type="number"
                       min="1"
                       max="99"
                       value={item.quantity}
                       onChange={(e) => {
                         const newQuantity = parseInt(e.target.value) || 1;
                         if (newQuantity >= 1 && newQuantity <= 99) {
                           updateQuantity(item.id, newQuantity, item.note);
                         }
                       }}
                       className="quantity-input"
                     />
                     <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.note)}>
                       +
                     </button>
                     <button onClick={() => removeFromCart(item.id, item.note)} className="remove-btn">
                       Xóa
                     </button>
                   </div>
                 </div>
               ))}
             </div>
            <div className="cart-footer">
              <div className="total-price">
                Tổng: {getTotalPrice().toLocaleString('vi-VN')} VNĐ
              </div>
              <button onClick={handleOrder} className="order-btn">
                Đặt món
              </button>
            </div>
          </div>
        </div>
      )}

       {showItemDetail && selectedItem && (
         <ItemDetail
           itemId={selectedItem.item._id}
           type={selectedItem.type}
           onClose={handleCloseDetail}
           onAddToCart={addToCart}
         />
       )}

       {/* Login Modal */}
       <LoginModal 
         isOpen={showLoginModal}
         onClose={() => setShowLoginModal(false)}
         onLogin={handleLogin}
         onSwitchToRegister={handleSwitchToRegister}
       />

       {/* Register Modal */}
       <RegisterModal 
         isOpen={showRegisterModal}
         onClose={() => setShowRegisterModal(false)}
         onRegister={handleRegister}
         onSwitchToLogin={handleSwitchToLogin}
       />
     </div>
  );
};

export default MenuView;
