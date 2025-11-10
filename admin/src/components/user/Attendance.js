import React, { useEffect, useState } from "react";
import Header from "../waiter/Header";
import userApi from "../../api/userApi";
import { toast } from "react-toastify";

function Attendance() {
    const [shift, setShift] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load shift hôm nay từ server
    const loadShift = async () => {
        try {
            setLoading(true);
            const res = await userApi.getTodayShift();
            setShift(res.shift);
        } catch (err) {
            toast.error(err?.message || "Lỗi khi lấy ca làm hôm nay");
        } finally {
            setLoading(false);
        }
    };

    // Check-in
    const handleCheckIn = async () => {
        try {
            await userApi.checkIn();
            toast.success("✅ Check-in thành công!");
            loadShift();
        } catch (err) {
            toast.error(err?.message || "Check-in thất bại!");
        }
    };

    // Check-out
    const handleCheckOut = async () => {
        try {
            await userApi.checkOut();
            toast.success("✅ Check-out thành công!");
            loadShift();
        } catch (err) {
            toast.error(err?.message || "Check-out thất bại!");
        }
    };

    useEffect(() => {
        loadShift();
    }, []);

    if (loading) return (
        <div className="p-4">
            <Header />
            <p>Đang tải thông tin ca làm hôm nay...</p>
        </div>
    );

    if (!shift) return (
        <div className="p-4">
            <Header />
            <p>Bạn không có ca làm hôm nay.</p>
        </div>
    );

    const { workShiftId, status, startTime, endTime } = shift;

    // Xác định có thể check-in / check-out không
    const canCheckIn = status === "pending";
    const canCheckOut = status === "checked_in" || status === "late";

    const formatTime = (time) => (time ? new Date(time).toLocaleTimeString() : "Chưa");

    return (
        <div className="p-4">
            <Header />
            <h1 className="text-2xl font-bold mb-4">Điểm danh hôm nay</h1>

            <div className="bg-white shadow rounded p-4">
                <p><b>Ca làm:</b> {workShiftId?.name}</p>
                <p><b>Giờ làm:</b> {workShiftId?.startTime} → {workShiftId?.endTime}</p>
                <p><b>Trạng thái:</b> {status}</p>
                <p><b>Check-in:</b> {formatTime(startTime)}</p>
                <p><b>Check-out:</b> {formatTime(endTime)}</p>

                <div className="mt-4 flex gap-3">
                    <button
                        onClick={handleCheckIn}
                        disabled={!canCheckIn}
                        className={`px-4 py-2 rounded text-white ${canCheckIn ? "bg-green-600" : "bg-gray-400 cursor-not-allowed"}`}
                    >
                        ✅ Check-In
                    </button>

                    <button
                        onClick={handleCheckOut}
                        disabled={!canCheckOut}
                        className={`px-4 py-2 rounded text-white ${canCheckOut ? "bg-red-600" : "bg-gray-400 cursor-not-allowed"}`}
                    >
                        🚪 Check-Out
                    </button>

                    {!canCheckIn && !canCheckOut && status !== "pending" && (
                        <span className="text-gray-500 italic">Bạn đã hoàn thành điểm danh hôm nay</span>
                    )}
                </div>

                {status === "absent" && (
                    <p className="text-red-500 mt-2 font-bold">❌ Bạn đã bị đánh dấu vắng hôm nay</p>
                )}
            </div>
        </div>
    );
}

export default Attendance;