import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../utils/apiConfig';
import './ItemDetail.css';

const ItemDetail = ({ itemId, type, onClose, onAddToCart }) => {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchItemDetail();
  }, [itemId, type]);

  const fetchItemDetail = async () => {
    try {
      setLoading(true);
      const endpoint = type === 'menu' ? API_ENDPOINTS.CUSTOMER.MENU_BY_ID(itemId) : API_ENDPOINTS.CUSTOMER.ITEM_BY_ID(itemId);
      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success) {
        setItem(data.data);
      } else {
        setError(data.message || 'Không tìm thấy thông tin');
      }
    } catch (err) {
      setError('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(item, type, quantity);
    onClose();
  };

  if (loading) {
    return (
      <div className="item-detail-modal">
        <div className="item-detail-content">
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="item-detail-modal">
        <div className="item-detail-content">
          <div className="error-message">{error}</div>
          <button onClick={onClose} className="close-btn">Đóng</button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="item-detail-modal">
      <div className="item-detail-content">
        <div className="item-detail-header">
          <h2>{item.name}</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="item-detail-body">
          <div className="item-image">
            {item.image ? (
              <img src={item.image} alt={item.name} />
            ) : (
              <div className="placeholder-image">🍽️</div>
            )}
          </div>

          <div className="item-info">
            <div className="item-description">
              <h3>Mô tả</h3>
              <p>{item.description || 'Chưa có mô tả chi tiết'}</p>
            </div>

            {item.category && (
              <div className="item-category">
                <h3>Danh mục</h3>
                <span className="category-tag">{item.category}</span>
              </div>
            )}

            {item.ingredients && item.ingredients.length > 0 && (
              <div className="item-ingredients">
                <h3>Nguyên liệu</h3>
                <ul>
                  {item.ingredients.map((ingredient, index) => (
                    <li key={index}>
                      {ingredient.name} - {ingredient.stockQuantity} {ingredient.unit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item.items && item.items.length > 0 && (
              <div className="menu-items">
                <h3>Món trong combo</h3>
                <ul>
                  {item.items.map((menuItem, index) => (
                    <li key={index}>
                      {menuItem.name} - {menuItem.price?.toLocaleString('vi-VN')} VNĐ
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="item-price">
              <h3>Giá</h3>
              <span className="price-value">
                {item.price?.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>

            <div className="quantity-selector">
              <h3>Số lượng</h3>
              <div className="quantity-controls">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="quantity-btn"
                >
                  -
                </button>
                <span className="quantity-value">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="quantity-btn"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="item-detail-footer">
          <button onClick={onClose} className="cancel-btn">
            Hủy
          </button>
          <button onClick={handleAddToCart} className="add-to-cart-btn">
            Thêm vào giỏ ({quantity})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
