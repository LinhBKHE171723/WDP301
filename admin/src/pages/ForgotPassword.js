import { useState } from "react";
import userApi from "../api/userApi";
import { toast } from "react-toastify";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await userApi.ForgotPassword(email);

            toast.success("✅ Đã gửi link đặt lại mật khẩu vào email! Vui lòng kiểm tra hộp thư.");

            // Clear form sau khi gửi thành công
            setEmail("");

        } catch (err) {
            toast.error(err.message || "Email không tồn tại!");
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

                <button type="submit" className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600">
                    Yêu cầu đặt lại mật khẩu
                </button>
            </form>
        </div>
    );
}
