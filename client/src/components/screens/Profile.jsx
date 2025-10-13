import React, { useEffect, useState } from "react";
import { apiFetch } from "../../api";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch("/users/me")
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (!user) return <div className="text-center mt-5">Đang tải...</div>;

  return (
    <div className="container mt-5">
      <div className="card mx-auto shadow" style={{ maxWidth: "500px" }}>
        <div className="card-body text-center">
          <h5 className="card-title mb-3">Thông tin người dùng</h5>
          <p><strong>Tên:</strong> {user.name}</p>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Vai trò:</strong> {user.role}</p>
          {user.role === "customer" && (
            <p><strong>Điểm tích luỹ:</strong> {user.point}</p>
          )}
          <button className="btn btn-outline-danger mt-3" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
