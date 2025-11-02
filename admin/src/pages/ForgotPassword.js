import { useState } from "react";
import userApi from "../api/userApi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await userApi.ForgotPassword(email);

            // ✅ Lưu email để dùng khi reset
            localStorage.setItem("resetEmail", email);

            toast.success("✅ Mật khẩu tạm đã được gửi đến email!");

            // ✅ Điều hướng sang trang reset password sau 2 giây
            setTimeout(() => navigate("/reset-password"), 2000);

        } catch (err) {
            toast.error(err.response?.data?.message || "Email không tồn tại!");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h2 className="text-xl font-bold text-center mb-5 text-orange-600">Quên mật khẩu</h2>

                <input
                    type="email"
                    placeholder="Nhập email của bạn..."
                    className="w-full border px-3 py-2 mb-4 rounded"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <button className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600">
                    Gửi mật khẩu mới
                </button>
            </form>
        </div>
    );
}
