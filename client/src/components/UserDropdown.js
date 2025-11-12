import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCookie, setCookie } from '../utils/cookie';
import { API_ENDPOINTS } from '../utils/apiConfig';
import './UserDropdown.css';

const UserDropdown = ({ onLogout }) => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchLoyaltyInfo();
      setEditForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || ''
      });
    }
  }, [isOpen, user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchLoyaltyInfo = async () => {
    try {
      setLoadingLoyalty(true);
      const token = getCookie('customer_token');
      const response = await fetch(API_ENDPOINTS.CUSTOMER.LOYALTY_INFO, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setLoyaltyData(data.data);
      }
    } catch (err) {
      console.error('Error fetching loyalty info:', err);
    } finally {
      setLoadingLoyalty(false);
    }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const token = getCookie('customer_token');
      const response = await fetch(API_ENDPOINTS.USER.UPDATE_PROFILE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editForm.name,
          phone: editForm.phone
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update user in context
        login(data.user, data.token);
        setCookie('customer_user', JSON.stringify(data.user));
        setCookie('customer_token', data.token);
        setShowEditForm(false);
        alert('Cập nhật thông tin thành công!');
      } else {
        setError(data.message || 'Có lỗi xảy ra khi cập nhật');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setSaving(false);
    }
  };

  const getRankColor = (rankName) => {
    const colors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2',
      diamond: '#B9F2FF'
    };
    return colors[rankName] || '#6B7280';
  };

  if (!user) return null;

  return (
    <div className="user-dropdown" ref={dropdownRef}>
      <button 
        className="user-dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="user-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} />
          ) : (
            <span>{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          )}
        </div>
        <span className="user-name">{user.name || user.username}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="user-dropdown-menu">
          {/* User Info Section */}
          <div className="dropdown-section user-info-section">
            <div className="user-header">
              <div className="user-avatar-large">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  <span>{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="user-details">
                <h3>{user.name || user.username}</h3>
                <p className="user-email">{user.email}</p>
                {user.phone && <p className="user-phone">{user.phone}</p>}
              </div>
            </div>
          </div>

          {/* Loyalty Info Section */}
          {loyaltyData && (
            <div className="dropdown-section loyalty-section">
              <div className="loyalty-item">
                <span className="loyalty-label">Điểm tích lũy:</span>
                <span className="loyalty-value">{loyaltyData.points.toLocaleString('vi-VN')} điểm</span>
              </div>
              <div className="loyalty-item">
                <span className="loyalty-label">Hạng:</span>
                <span 
                  className="loyalty-rank"
                  style={{ 
                    color: getRankColor(loyaltyData.rank.name),
                    fontWeight: 'bold'
                  }}
                >
                  {loyaltyData.rank.label}
                </span>
              </div>
              <div className="loyalty-item">
                <span className="loyalty-label">Giảm giá:</span>
                <span className="loyalty-value">{loyaltyData.rank.discount}%</span>
              </div>
            </div>
          )}

          {/* Edit Profile Form */}
          {showEditForm ? (
            <div className="dropdown-section edit-form-section">
              <form onSubmit={handleEditProfile}>
                <div className="form-group">
                  <label>Tên:</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại:</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={editForm.email}
                    disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>Email không thể thay đổi</small>
                </div>
                {error && <div className="form-error">{error}</div>}
                <div className="form-actions">
                  <button type="submit" disabled={saving} className="save-btn">
                    {saving ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEditForm(false);
                      setError('');
                      setEditForm({
                        name: user.name || '',
                        phone: user.phone || '',
                        email: user.email || ''
                      });
                    }}
                    className="cancel-btn"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Menu Items */
            <div className="dropdown-section menu-section">
              <button 
                className="dropdown-item"
                onClick={() => {
                  navigate('/order-history');
                  setIsOpen(false);
                }}
              >
                <span>Lịch sử đơn hàng</span>
              </button>
              <button 
                className="dropdown-item"
                onClick={() => {
                  setShowEditForm(true);
                }}
              >
                <span>Chỉnh sửa thông tin</span>
              </button>
              <button 
                className="dropdown-item logout-item"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
              >
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDropdown;

