import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Register({ onLogin }) {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            username: form.username,
            email: form.email,
            password: form.password,
            role: "customer",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Đăng ký thất bại");
      localStorage.setItem("token", data.token);
      onLogin?.();
      nav("/profile");
    } catch (err) {
      setErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light px-3">
      <div className="card shadow-lg p-4 w-100" style={{ maxWidth: "420px" }}>
        <h3 className="text-center mb-4 fw-bold text-warning">Đăng ký tài khoản</h3>

        {err && (
          <div className="alert alert-danger text-center py-2">{err}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Họ và tên</label>
            <input
              type="text"
              className="form-control form-control-lg"
              placeholder="Nhập họ và tên..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

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
            <label className="form-label fw-semibold">Email</label>
            <input
              type="email"
              className="form-control form-control-lg"
              placeholder="Nhập email..."
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
            disabled={loading}
          >
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <div className="text-center mt-3">
          <span className="text-muted">Đã có tài khoản?</span>{" "}
          <Link
            to="/login"
            className="text-warning fw-semibold text-decoration-none"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
