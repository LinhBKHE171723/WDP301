import React, { useState } from 'react';
import './LoginModal.css';

const LoginModal = ({ isOpen, onClose, onLogin }) => {
  const [form, setForm] = useState({ usernameOrEmail: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usernameOrEmail: form.usernameOrEmail,
          password: form.password
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Chỉ cho phép customer đăng nhập
        if (data.user.role === "customer") {
          onLogin(data.user, data.token);
          onClose();
        } else {
          setError("Tài khoản này không phải là tài khoản khách hàng.");
        }
      } else {
        setError(data.message || "Tên đăng nhập/email hoặc mật khẩu không đúng.");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi kết nối server. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ usernameOrEmail: "", password: "" });
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        <div className="login-modal-header">
          <h2>Đăng nhập</h2>
          <button onClick={handleClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="login-modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="usernameOrEmail">Tên đăng nhập hoặc Email</label>
              <input
                type="text"
                id="usernameOrEmail"
                name="usernameOrEmail"
                value={form.usernameOrEmail}
                onChange={handleChange}
                required
                placeholder="Nhập tên đăng nhập hoặc email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Nhập mật khẩu"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="login-btn"
              disabled={loading}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="login-footer">
            <p>Chưa có tài khoản? <span className="register-link">Đăng ký ngay</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
