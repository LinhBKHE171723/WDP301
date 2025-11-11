import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCookie } from '../utils/cookie';
import { API_ENDPOINTS } from '../utils/apiConfig';
import './LoyaltyInfo.css';

const LoyaltyInfo = ({ onBack }) => {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      fetchLoyaltyInfo();
    } else {
      setError('Vui lòng đăng nhập để xem thông tin loyalty');
      setLoading(false);
    }
  }, [isLoggedIn]);

  const fetchLoyaltyInfo = async () => {
    try {
      setLoading(true);
      const token = getCookie('customer_token');
      const response = await fetch(API_ENDPOINTS.CUSTOMER.LOYALTY_INFO, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setLoyaltyData(data.data);
      } else {
        setError(data.message || 'Không thể tải thông tin loyalty');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
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

  if (!isLoggedIn) {
    return (
      <div className="loyalty-info">
        <div className="loyalty-header">
          <h2>Thông tin Loyalty</h2>
          <button onClick={onBack} className="back-btn">Quay lại</button>
        </div>
        <div className="no-access">
          <div className="no-access-icon">🔒</div>
          <h3>Vui lòng đăng nhập</h3>
          <p>Vui lòng đăng nhập để xem thông tin điểm tích lũy và rank của bạn</p>
          <button onClick={onBack} className="back-to-menu-btn">
            Quay lại menu
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loyalty-info">
        <div className="loyalty-header">
          <h2>Thông tin Loyalty</h2>
          <button onClick={onBack} className="back-btn">Quay lại</button>
        </div>
        <div className="loading">
          <p>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loyalty-info">
        <div className="loyalty-header">
          <h2>Thông tin Loyalty</h2>
          <button onClick={onBack} className="back-btn">Quay lại</button>
        </div>
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchLoyaltyInfo} className="retry-btn">Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="loyalty-info">
      <div className="loyalty-header">
        <h2>Thông tin Loyalty của {user?.name || user?.username}</h2>
        <button onClick={onBack} className="back-btn">Quay lại</button>
      </div>

      {loyaltyData && (
        <div className="loyalty-content">
          {/* Points Section */}
          <div className="loyalty-card points-card">
            <div className="card-header">
              <h3>Điểm tích lũy</h3>
            </div>
            <div className="card-body">
              <div className="points-display">
                <span className="points-value">{loyaltyData.points.toLocaleString('vi-VN')}</span>
                <span className="points-label">điểm</span>
              </div>
              <p className="points-description">
                Điểm của bạn sẽ được tích lũy tự động khi đơn hàng được thanh toán
              </p>
            </div>
          </div>

          {/* Rank Section */}
          <div className="loyalty-card rank-card">
            <div className="card-header">
              <h3>Cấp độ hiện tại</h3>
            </div>
            <div className="card-body">
              <div 
                className="rank-badge"
                style={{ 
                  backgroundColor: getRankColor(loyaltyData.rank.name),
                  color: loyaltyData.rank.name === 'gold' || loyaltyData.rank.name === 'silver' ? '#000' : '#fff'
                }}
              >
                <span className="rank-label">{loyaltyData.rank.label}</span>
              </div>
              <div className="rank-info">
                <p><strong>Điểm tối thiểu:</strong> {loyaltyData.rank.minPoints.toLocaleString('vi-VN')} điểm</p>
                <p><strong>Giảm giá:</strong> {loyaltyData.rank.discount}%</p>
              </div>
            </div>
          </div>

          {/* Discount Example */}
          <div className="loyalty-card discount-card">
            <div className="card-header">
              <h3>Ưu đãi của bạn</h3>
            </div>
            <div className="card-body">
              <div className="discount-info">
                <p className="discount-percent">
                  Bạn được giảm <strong>{loyaltyData.sampleDiscount.discountPercent}%</strong> cho mỗi đơn hàng
                </p>
                <p className="discount-example">
                  {loyaltyData.sampleDiscount.example}
                </p>
              </div>
              <div className="discount-note">
                <p>💡 Giảm giá sẽ được áp dụng tự động khi bạn đặt món, không cần nhập mã!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyInfo;

