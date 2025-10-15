import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../../api";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem("token", res.token);
      navigate("/profile");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light px-3">
      <div className="card shadow-lg p-4 w-100" style={{ maxWidth: "420px" }}>
        <h3 className="text-center mb-4 fw-bold text-warning">Đăng nhập</h3>

        {error && (
          <div className="alert alert-danger text-center py-2">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Tên đăng nhập</label>
            <input
              type="text"
              className="form-control form-control-lg"
              placeholder="Nhập tên đăng nhập..."
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Mật khẩu</label>
            <input
              type="password"
              className="form-control form-control-lg"
              placeholder="Nhập mật khẩu..."
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-warning w-100 py-2 fw-semibold"
          >
            Đăng nhập
          </button>
        </form>

        <div className="text-center mt-3">
          <span className="text-muted">Chưa có tài khoản?</span>{" "}
          <Link to="/register" className="text-warning fw-semibold text-decoration-none">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
