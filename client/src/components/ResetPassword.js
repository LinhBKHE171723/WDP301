import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './LoginModal.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Verify token khi component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Link không hợp lệ! Vui lòng yêu cầu link mới.");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:5000/api/auth/verifyResetToken?token=${token}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setEmail(data.email);
        } else {
          setError(data.message || "Link không hợp lệ hoặc đã hết hạn!");
        }
      } catch (err) {
        console.error(err);
        setError("Lỗi kết nối server. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới và nhập lại không giống nhau!");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("http://localhost:5000/api/auth/resetPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess("✅ Đổi mật khẩu thành công! Đang chuyển đến trang đăng nhập...");
        setTimeout(() => {
          navigate('/reservation');
        }, 2000);
      } else {
        setError(data.message || "Đổi mật khẩu thất bại!");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi kết nối server. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="login-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '30px', borderRadius: '10px' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
          <p>Đang xác thực link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="login-modal" style={{ maxWidth: '500px', width: '90%' }}>
        <div className="login-modal-header">
          <h2>Đổi mật khẩu</h2>
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

          {!success && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  disabled
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">Mật khẩu mới</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Nhập lại mật khẩu mới</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>

              <button 
                type="submit" 
                className="login-btn"
                disabled={isSubmitting || !!success}
              >
                {isSubmitting ? "Đang xử lý..." : "Cập nhật mật khẩu"}
              </button>
            </form>
          )}

          <div className="login-footer">
            <p>
              <span className="register-link" onClick={() => navigate('/reservation')} style={{ cursor: 'pointer' }}>
                Quay về trang chủ
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

