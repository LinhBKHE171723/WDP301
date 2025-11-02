import { useState } from "react";
import userApi from "../api/userApi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function ResetPassword() {
    const resetEmail = localStorage.getItem("resetEmail");
    const navigate = useNavigate();

    const [tempPassword, setTempPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showTempPass, setShowTempPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            return toast.error("❌ Mật khẩu mới và nhập lại không giống nhau!");
        }

        try {
            await userApi.ResetPassword(resetEmail, tempPassword, newPassword);
            toast.success("✅ Đổi mật khẩu thành công! Hãy đăng nhập lại.");

            localStorage.removeItem("resetEmail");
            setTimeout(() => navigate("/auth/login"), 1500);

        } catch (err) {
            toast.error(err.response?.data?.message || "Sai mật khẩu tạm!");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h2 className="text-xl font-bold text-center mb-6 text-orange-600">Đổi mật khẩu</h2>

                <p className="text-sm text-gray-500 mb-4">Email: <b>{resetEmail}</b></p>

                {/* Mật khẩu tạm */}
                <div className="relative mb-4">
                    <input
                        type={showTempPass ? "text" : "password"}
                        placeholder="Mật khẩu tạm trong email"
                        className="w-full border px-3 py-2 rounded"
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        required
                    />
                    <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
                        onClick={() => setShowTempPass(!showTempPass)}
                    >
                        {showTempPass ? <EyeSlashIcon className="w-5" /> : <EyeIcon className="w-5" />}
                    </span>
                </div>

                {/* Mật khẩu mới */}
                <div className="relative mb-4">
                    <input
                        type={showNewPass ? "text" : "password"}
                        placeholder="Mật khẩu mới"
                        className="w-full border px-3 py-2 rounded"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                    <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
                        onClick={() => setShowNewPass(!showNewPass)}
                    >
                        {showNewPass ? <EyeSlashIcon className="w-5" /> : <EyeIcon className="w-5" />}
                    </span>
                </div>

                {/* Nhập lại mật khẩu */}
                <div className="relative mb-6">
                    <input
                        type={showConfirmPass ? "text" : "password"}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full border px-3 py-2 rounded"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                    >
                        {showConfirmPass ? <EyeSlashIcon className="w-5" /> : <EyeIcon className="w-5" />}
                    </span>
                </div>

                <button className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600">
                    Cập nhật
                </button>
            </form>
        </div>
    );
}
