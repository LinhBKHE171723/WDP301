import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Client from "../api/Client";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await Client.post("auth/login", form);
      login(res.user, res.token);
      if (res.user.role === "kitchen_manager") {
        navigate("/kitchen/dashboard");
      } else if (res.user.role === "waiter") {
        navigate("/waiter/dashboard");
      }
      else {
        setError("Tài khoản này không có quyền truy cập Kitchen.");
      }
    } catch (err) {
      console.error(err);
      setError("Email hoặc mật khẩu không đúng.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md"
      >
        <h1 className="text-2xl font-bold text-center mb-6 text-orange-600">
          Đăng nhập
        </h1>

        {error && <p className="text-red-600 text-center mb-3">{error}</p>}

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 mb-4 rounded"
        />
        <input
          name="password"
          type="password"
          placeholder="Mật khẩu"
          value={form.password}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 mb-4 rounded"
        />
        <button
          type="submit"
          className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600"
        >
          Đăng nhập
        </button>
      </form>
    </div>
  );
}
