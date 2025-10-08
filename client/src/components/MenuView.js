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
  const [priceFilter, setPriceFilter] = useState('all');
  const [itemPriceFilter, setItemPriceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

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

  const filterMenusByPrice = (menus) => {
    switch (priceFilter) {
      case 'under-100k':
        return menus.filter(menu => menu.price < 100000);
      case '100k-200k':
        return menus.filter(menu => menu.price >= 100000 && menu.price < 200000);
      case '200k-500k':
        return menus.filter(menu => menu.price >= 200000 && menu.price < 500000);
      case '500k-1000k':
        return menus.filter(menu => menu.price >= 500000 && menu.price < 1000000);
      case '1000k-2000k':
        return menus.filter(menu => menu.price >= 1000000 && menu.price < 2000000);
      case '2000k-5000k':
        return menus.filter(menu => menu.price >= 2000000 && menu.price < 5000000);
      case 'over-5000k':
        return menus.filter(menu => menu.price >= 5000000);
      default:
        return menus;
    }
  };

  const filterItemsByPriceAndCategory = (items) => {
    let filteredItems = items;

    // Filter by price
    switch (itemPriceFilter) {
      case 'under-50k':
        filteredItems = filteredItems.filter(item => item.price < 50000);
        break;
      case '50k-100k':
        filteredItems = filteredItems.filter(item => item.price >= 50000 && item.price < 100000);
        break;
      case '100k-200k':
        filteredItems = filteredItems.filter(item => item.price >= 100000 && item.price < 200000);
        break;
      case '200k-500k':
        filteredItems = filteredItems.filter(item => item.price >= 200000 && item.price < 500000);
        break;
      case 'over-500k':
        filteredItems = filteredItems.filter(item => item.price >= 500000);
        break;
      default:
        // No price filter
        break;
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.category === categoryFilter);
    }

    return filteredItems;
  };

  const getUniqueCategories = (items) => {
    const categories = [...new Set(items.map(item => item.category))];
    return categories.filter(category => category); // Remove empty/null categories
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
              {filterMenusByPrice(menus).map(menu => (
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
              {filterItemsByPriceAndCategory(items).map(item => (
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
