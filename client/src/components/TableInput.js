import React, { useState } from 'react';
import './TableInput.css';

const TableInput = ({ onTableSubmit }) => {
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tableNumber) {
      setError('Vui lòng nhập số bàn');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:5000/api/customer/table/${tableNumber}`);
      const data = await response.json();

      if (data.success) {
        onTableSubmit(data.data);
      } else {
        setError(data.message || 'Không tìm thấy bàn');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="table-input-container">
      <div className="table-input-card">
        <h2>Chào mừng đến với nhà hàng</h2>
        <p>Vui lòng nhập số bàn của bạn</p>
        
        <form onSubmit={handleSubmit} className="table-form">
          <div className="input-group">
            <label htmlFor="tableNumber">Số bàn:</label>
            <input
              type="number"
              id="tableNumber"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Nhập số bàn..."
              min="1"
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Đang kiểm tra...' : 'Xem thực đơn'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TableInput;