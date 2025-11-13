import { useState, useEffect } from "react";
import userApi from "../api/userApi";
import { toast } from "react-toastify";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Verify token khi component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        toast.error(" Link không hợp lệ! Vui lòng yêu cầu link mới.");
        setTimeout(() => navigate("/forgot-password"), 2000);
        return;
      }

      try {
        setIsLoading(true);
        const response = await userApi.VerifyResetToken(token);
        setEmail(response.email);
      } catch (err) {
        toast.error(err.message || "Link không hợp lệ hoặc đã hết hạn!");
        setTimeout(() => navigate("/forgot-password"), 2000);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      return toast.error(" Mật khẩu mới và nhập lại không giống nhau!");
    }

    if (newPassword.length < 6) {
      return toast.error(" Mật khẩu phải có ít nhất 6 ký tự!");
    }

    try {
      setIsVerifying(true);
      await userApi.ResetPassword(token, newPassword);
      toast.success(" Đổi mật khẩu thành công! Hãy đăng nhập lại.");

      setTimeout(() => navigate("/auth/login"), 1500);
    } catch (err) {
      toast.error(err.message || "Đổi mật khẩu thất bại!");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang xác thực link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md"
      >
        <h2 className="text-xl font-bold text-center mb-6 text-orange-600">
          Đổi mật khẩu
        </h2>

        <p className="text-sm text-gray-500 mb-4">
          Email: <b>{email}</b>
        </p>

        {/* Mật khẩu mới */}
        <div className="relative mb-4">
          <input
            type={showNewPass ? "text" : "password"}
            placeholder="Mật khẩu mới"
            className="w-full border px-3 py-2 rounded"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
            onClick={() => setShowNewPass(!showNewPass)}
          >
            {showNewPass ? (
              <EyeSlashIcon className="w-5" />
            ) : (
              <EyeIcon className="w-5" />
            )}
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
            minLength={6}
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
            onClick={() => setShowConfirmPass(!showConfirmPass)}
          >
            {showConfirmPass ? (
              <EyeSlashIcon className="w-5" />
            ) : (
              <EyeIcon className="w-5" />
            )}
          </span>
        </div>

        <button
          type="submit"
          disabled={isVerifying}
          className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? "Đang xử lý..." : "Cập nhật"}
        </button>
      </form>
    </div>
  );
}
