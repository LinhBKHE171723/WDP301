import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../utils/apiConfig';
import ItemDetail from './ItemDetail';
import './PreOrder.css';

const PreOrder = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // State cho chọn món
  const [activeTab, setActiveTab] = useState('menus');
  const [selectedItems, setSelectedItems] = useState([]); // Array of {itemId, name, price, type, quantity}
  const [scheduledTime, setScheduledTime] = useState('');
  
  // State cho date/time picker
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  // State cho ItemDetail modal
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState(null);
  
  // State cho pagination
  const [currentMenuPage, setCurrentMenuPage] = useState(1);
  const [currentItemPage, setCurrentItemPage] = useState(1);
  const itemsPerPage = 6; // Số món hiển thị mỗi trang

  useEffect(() => {
    fetchData();
    // Set default date (tomorrow) and time (12:00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setSelectedTime('12:00');
    updateScheduledTime(dateStr, '12:00');
  }, []);

  const updateScheduledTime = (date, time) => {
    if (date && time) {
      const datetime = new Date(`${date}T${time}:00`);
      setScheduledTime(datetime.toISOString());
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Sử dụng endpoint /all để lấy TẤT CẢ menus và items (không lọc stock)
      // Vì đặt trước có thời gian chuẩn bị nên không cần kiểm tra stock ngay
      const [menusRes, itemsRes] = await Promise.all([
        fetch(API_ENDPOINTS.CUSTOMER.ALL_MENUS),
        fetch(API_ENDPOINTS.CUSTOMER.ALL_ITEMS)
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    updateScheduledTime(date, selectedTime);
  };

  const handleTimeChange = (e) => {
    const time = e.target.value;
    setSelectedTime(time);
    updateScheduledTime(selectedDate, time);
  };

  const addToSelectedItems = (item, type) => {
    const existingIndex = selectedItems.findIndex(
      si => si.itemId === item._id && si.type === type
    );

    if (existingIndex >= 0) {
      // Đã có, tăng số lượng
      const updated = [...selectedItems];
      updated[existingIndex].quantity += 1;
      setSelectedItems(updated);
    } else {
      // Chưa có, thêm mới
      setSelectedItems([...selectedItems, {
        itemId: item._id,
        name: item.name,
        price: item.price,
        type: type,
        quantity: 1
      }]);
    }
  };

  const removeFromSelectedItems = (itemId, type) => {
    setSelectedItems(prev => prev.filter(
      si => !(si.itemId === itemId && si.type === type)
    ));
  };

  const updateQuantity = (itemId, type, delta) => {
    setSelectedItems(prev => prev.map(si => {
      if (si.itemId === itemId && si.type === type) {
        const newQuantity = si.quantity + delta;
        if (newQuantity <= 0) {
          return null; // Will be filtered out
        }
        return { ...si, quantity: newQuantity };
      }
      return si;
    }).filter(Boolean));
  };

  const handleViewDetail = (item, type) => {
    setSelectedItemForDetail({ item, type });
    setShowItemDetail(true);
  };

  const handleCloseDetail = () => {
    setShowItemDetail(false);
    setSelectedItemForDetail(null);
  };

  // Tính toán pagination cho menus
  const totalMenuPages = Math.ceil(menus.length / itemsPerPage);
  const startMenuIndex = (currentMenuPage - 1) * itemsPerPage;
  const endMenuIndex = startMenuIndex + itemsPerPage;
  const displayedMenus = menus.slice(startMenuIndex, endMenuIndex);

  // Tính toán pagination cho items
  const totalItemPages = Math.ceil(items.length / itemsPerPage);
  const startItemIndex = (currentItemPage - 1) * itemsPerPage;
  const endItemIndex = startItemIndex + itemsPerPage;
  const displayedItems = items.slice(startItemIndex, endItemIndex);

  // Reset về trang 1 khi chuyển tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'menus') {
      setCurrentMenuPage(1);
    } else {
      setCurrentItemPage(1);
    }
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    // Validation
    if (!formData.name || !formData.email || !formData.phone) {
      setError('Vui lòng điền đầy đủ thông tin liên hệ');
      setSubmitting(false);
      return;
    }

    if (selectedItems.length === 0) {
      setError('Vui lòng chọn ít nhất một món');
      setSubmitting(false);
      return;
    }

    if (!scheduledTime) {
      setError('Vui lòng chọn thời gian đến ăn');
      setSubmitting(false);
      return;
    }

    // Validate scheduledTime is in the future
    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate < new Date()) {
      setError('Thời gian đặt trước phải trong tương lai');
      setSubmitting(false);
      return;
    }

    // Prepare orderItems for API
    const orderItems = selectedItems.map(item => ({
      itemId: item.itemId,
      type: item.type,
      quantity: item.quantity
    }));

    try {
      const response = await fetch(API_ENDPOINTS.CUSTOMER.PREORDERS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          orderItems: orderItems,
          scheduledTime: scheduledTime
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Redirect sau 3 giây
        setTimeout(() => {
          navigate('/reservation');
        }, 3000);
      } else {
        setError(data.message || 'Có lỗi xảy ra khi đặt trước');
      }
    } catch (err) {
      setError('Lỗi kết nối đến server');
      console.error('Preorder error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="preorder-container">
        <div className="loading-spinner">Đang tải...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="preorder-container">
        <div className="success-message">
          <h2>Đặt trước thành công!</h2>
          <p>Thông tin chi tiết đơn đặt trước của bạn đã được gửi đến email.</p>
          <p>Vui lòng kiểm tra email để xem chi tiết đơn đặt trước.</p>
          <p>Đang chuyển về trang chủ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="preorder-container">
      <header className="preorder-header">
        <button onClick={() => navigate('/reservation')} className="back-btn">
          ← Quay lại
        </button>
        <h1>Đặt bàn trước</h1>
        <div></div>
      </header>

      <form onSubmit={handleSubmit} className="preorder-form">
        <div className="form-layout">
          {/* Cột trái: Chọn món */}
          <div className="form-left-column">
            <div className="form-section menu-selection-section">
              <h2>Chọn món</h2>
              
              {/* Tabs */}
              <div className="menu-tabs">
                <button
                  type="button"
                  className={activeTab === 'menus' ? 'active' : ''}
                  onClick={() => handleTabChange('menus')}
                >
                  Combo
                </button>
                <button
                  type="button"
                  className={activeTab === 'items' ? 'active' : ''}
                  onClick={() => handleTabChange('items')}
                >
                  Món ăn
                </button>
              </div>

              {/* Menu/Item Grid */}
              <div className="menu-content" style={{marginTop: '2%'}}>
                {activeTab === 'menus' && (
                  <>
                    <div className="menu-grid">
                      {displayedMenus.map(menu => {
                      const selected = selectedItems.find(
                        si => si.itemId === menu._id && si.type === 'menu'
                      );
                      return (
                        <div
                          key={menu._id}
                          className={`menu-card ${selected ? 'selected' : ''}`}
                          onClick={() => addToSelectedItems(menu, 'menu')}
                        >
                          <div className="menu-image">
                            <img src={menu.image || '/api/placeholder/300/200'} alt={menu.name} />
                          </div>
                          <div className="menu-content">
                            <h5>{menu.name}</h5>
                            <p className="menu-description">{menu.description}</p>
                            <div className="menu-price-row">
                              <button
                                className="view-detail-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetail(menu, 'menu');
                                }}
                              >
                                Xem chi tiết
                              </button>
                              <div className="menu-price">{menu.price.toLocaleString('vi-VN')} VNĐ</div>
                            </div>
                            {selected && (
                              <div className="selected-badge">Đã chọn x{selected.quantity}</div>
                            )}
                          </div>
                        </div>
                      );
                      })}
                    </div>
                    
                    {/* Pagination Controls cho Menus */}
                    {totalMenuPages > 1 && (
                      <div className="pagination-controls">
                        <button
                          type="button"
                          className="pagination-btn"
                          onClick={() => setCurrentMenuPage(prev => Math.max(1, prev - 1))}
                          disabled={currentMenuPage === 1}
                        >
                          ← Trước
                        </button>
                        <span className="pagination-info">
                          Trang {currentMenuPage} / {totalMenuPages}
                        </span>
                        <button
                          type="button"
                          className="pagination-btn"
                          onClick={() => setCurrentMenuPage(prev => Math.min(totalMenuPages, prev + 1))}
                          disabled={currentMenuPage === totalMenuPages}
                        >
                          Sau →
                        </button>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'items' && (
                  <>
                    <div className="item-grid">
                      {displayedItems.map(item => {
                      const selected = selectedItems.find(
                        si => si.itemId === item._id && si.type === 'item'
                      );
                      return (
                        <div
                          key={item._id}
                          className={`item-card ${selected ? 'selected' : ''}`}
                          onClick={() => addToSelectedItems(item, 'item')}
                        >
                          <div className="item-image">
                            <img src={item.image || '/api/placeholder/300/200'} alt={item.name} />
                          </div>
                          <div className="item-content">
                            <h5>{item.name}</h5>
                            <p className="item-description">{item.description}</p>
                            <div className="item-price">{item.price.toLocaleString('vi-VN')} VNĐ</div>
                            {selected && (
                              <div className="selected-badge">Đã chọn x{selected.quantity}</div>
                            )}
                          </div>
                        </div>
                      );
                      })}
                    </div>
                    
                    {/* Pagination Controls cho Items */}
                    {totalItemPages > 1 && (
                      <div className="pagination-controls">
                        <button
                          type="button"
                          className="pagination-btn"
                          onClick={() => setCurrentItemPage(prev => Math.max(1, prev - 1))}
                          disabled={currentItemPage === 1}
                        >
                          ← Trước
                        </button>
                        <span className="pagination-info">
                          Trang {currentItemPage} / {totalItemPages}
                        </span>
                        <button
                          type="button"
                          className="pagination-btn"
                          onClick={() => setCurrentItemPage(prev => Math.min(totalItemPages, prev + 1))}
                          disabled={currentItemPage === totalItemPages}
                        >
                          Sau →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Cột phải: Thông tin đơn hàng, Món đã chọn */}
          <div className="form-right-column">
            {/* Thông tin đơn hàng */}
            <div className="form-section">
              <h2>Thông tin đơn hàng</h2>
              
              {/* Thông tin liên hệ */}
              <div className="form-subsection">
                <h3>Thông tin liên hệ</h3>
                <div className="form-row">
                  <div className="form-group" style={{marginBottom: '0'}}>
                    <label>Tên của bạn *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Nhập tên của bạn"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{marginBottom: '0'}}>
                    <label>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="form-group" style={{marginBottom: '0'}}>
                    <label>Số điện thoại *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="0123456789"
                    />
                  </div>
                </div>
              </div>

              {/* Thời gian đến ăn */}
              <div className="form-subsection">
                <h3>Thời gian đến ăn</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ngày *</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={handleDateChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Giờ *</label>
                    <input
                      type="time"
                      value={selectedTime}
                      onChange={handleTimeChange}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Items Summary */}
            {selectedItems.length > 0 && (
              <div className="form-section selected-items-section">
                <h2>Món đã chọn</h2>
                
                {/* Header Row - Fixed */}
                <div className="selected-items-header">
                  <div className="header-item-name">Tên món</div>
                  <div className="header-quantity">Số lượng</div>
                  <div className="header-total">Tổng tiền</div>
                  <div className="header-action"></div>
                </div>
                
                {/* Scrollable Items List */}
                <div className="selected-items-list">
                  {selectedItems.map((item, index) => (
                    <div key={index} className="selected-item-row">
                      <span className="item-name">{item.name}</span>
                      <div className="quantity-controls">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(item.itemId, item.type, -1);
                          }}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(item.itemId, item.type, 1);
                          }}
                        >
                          +
                        </button>
                      </div>
                      <span className="item-total">
                        {(item.price * item.quantity).toLocaleString('vi-VN')} VNĐ
                      </span>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromSelectedItems(item.itemId, item.type);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="total-amount">
                  <strong>Tổng tiền: {calculateTotal().toLocaleString('vi-VN')} VNĐ</strong>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="form-actions form-actions-right">
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting}
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận đặt trước'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ItemDetail Modal */}
      {showItemDetail && selectedItemForDetail && (
        <ItemDetail
          itemId={selectedItemForDetail.item._id}
          type={selectedItemForDetail.type}
          onClose={handleCloseDetail}
          onAddToCart={(item, type, quantity, note) => {
            addToSelectedItems(item, type);
            handleCloseDetail();
          }}
        />
      )}
    </div>
  );
};

export default PreOrder;

