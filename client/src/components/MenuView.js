import React, { useState, useEffect } from 'react';
import ItemDetail from './ItemDetail';
import './MenuView.css';

const MenuView = ({ table, onBack }) => {
  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('menus');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemDetail, setShowItemDetail] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
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
      setError('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item, type = 'item', quantity = 1) => {
    const cartItem = {
      id: item._id,
      name: item.name,
      price: item.price,
      type: type,
      quantity: quantity
    };

    setCart(prevCart => {
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

  const handleViewDetail = (item, type) => {
    setSelectedItem({ item, type });
    setShowItemDetail(true);
  };

  const handleCloseDetail = () => {
    setShowItemDetail(false);
    setSelectedItem(null);
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
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
        quantity: item.quantity
      }));

      const response = await fetch('http://localhost:5000/api/customer/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableId: table._id,
          orderItems: orderItems,
          customerName: "Khách vãng lai",
          customerPhone: ""
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Đặt món thành công!');
        setCart([]);
        setShowCart(false);
      } else {
        alert('Lỗi đặt món: ' + data.message);
      }
    } catch (err) {
      alert('Lỗi đặt món');
    }
  };

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
          <p>Bàn số: {table.tableNumber}</p>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowCart(true)} className="cart-btn">
            Giỏ hàng ({cart.length})
          </button>
          <button onClick={onBack} className="back-btn">
            Đổi bàn
          </button>
        </div>
      </header>

      <div className="menu-tabs">
        <button
          className={activeTab === 'menus' ? 'active' : ''}
          onClick={() => setActiveTab('menus')}
        >
          Menu & Combo
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
          <div className="menu-grid">
            {menus.map(menu => (
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
        )}

        {activeTab === 'items' && (
          <div className="menu-grid">
            {items.map(item => (
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
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    <p>{item.price.toLocaleString('vi-VN')} VNĐ</p>
                  </div>
                  <div className="item-controls">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      +
                    </button>
                    <button onClick={() => removeFromCart(item.id)} className="remove-btn">
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
    </div>
  );
};

export default MenuView;
