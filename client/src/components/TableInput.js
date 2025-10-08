import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TableInput.css';

const TableInput = () => {
  const [tableNumber, setTableNumber] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!tableNumber.trim()) {
      setError('Vui lòng nhập số bàn');
      return;
    }

    if (isNaN(tableNumber) || parseInt(tableNumber) <= 0) {
      setError('Số bàn phải là số dương');
      return;
    }

    // Lưu số bàn vào localStorage và chuyển đến trang menu
    localStorage.setItem('tableNumber', tableNumber);
    navigate('/menu');
  };

  return (
    <div className="table-input-container">
      <div className="table-input-card">
        <div className="qr-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="7" height="7" fill="currentColor"/>
            <rect x="14" y="3" width="7" height="7" fill="currentColor"/>
            <rect x="3" y="14" width="7" height="7" fill="currentColor"/>
            <rect x="14" y="14" width="3" height="3" fill="currentColor"/>
            <rect x="18" y="14" width="3" height="3" fill="currentColor"/>
            <rect x="14" y="18" width="3" height="3" fill="currentColor"/>
          </svg>
        </div>
        
        <h1>Chào mừng đến với nhà hàng</h1>
        <p className="subtitle">Vui lòng nhập số bàn của bạn</p>
        
        <form onSubmit={handleSubmit} className="table-form">
          <div className="input-group">
            <label htmlFor="tableNumber">Số bàn</label>
            <input
              type="number"
              id="tableNumber"
              value={tableNumber}
              onChange={(e) => {
                setTableNumber(e.target.value);
                setError('');
              }}
              placeholder="Nhập số bàn..."
              min="1"
              className={error ? 'error' : ''}
            />
            {error && <span className="error-message">{error}</span>}
          </div>
          
          <button type="submit" className="submit-btn">
            Xem thực đơn
          </button>
        </form>
      </div>
    </div>
  );
};

export default TableInput;
