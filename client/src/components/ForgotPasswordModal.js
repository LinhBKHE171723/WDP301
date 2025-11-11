import React, { useState } from 'react';
import './LoginModal.css';
import { API_ENDPOINTS } from '../utils/apiConfig';

const ForgotPasswordModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(data.message || "✅ Đã gửi link đặt lại mật khẩu vào email!");
        setEmail("");
      } else {
        setError(data.message || "Email không tồn tại!");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi kết nối server. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setSuccess("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        <div className="login-modal-header">
          <h2>Quên mật khẩu</h2>
          <button onClick={handleClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="login-modal-body">
          {success && (
            <div className="success-message" style={{ 
              backgroundColor: "#d4edda", 
              color: "#155724", 
              padding: "10px", 
              borderRadius: "5px", 
              marginBottom: "15px" 
            }}>
              {success}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={handleChange}
                required
                placeholder="Nhập email của bạn"
                disabled={loading || !!success}
              />
              <div className="form-text" style={{ marginTop: "5px", fontSize: "12px", color: "#666" }}>
                Chúng tôi sẽ gửi link đặt lại mật khẩu vào email của bạn
              </div>
            </div>

            <button 
              type="submit" 
              className="login-btn"
              disabled={loading || !!success}
            >
              {loading ? "Đang gửi..." : success ? "Đã gửi" : "Gửi link đặt lại mật khẩu"}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Nhớ mật khẩu? <span className="register-link" onClick={onSwitchToLogin}>Đăng nhập ngay</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;

