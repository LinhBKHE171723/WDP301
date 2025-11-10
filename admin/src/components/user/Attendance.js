import React, { useEffect, useState } from 'react'
import Header from "../waiter/Header";
import userApi from "../../api/userApi";
import { toast } from "react-toastify";


function Attendance() {
    const [shift, setShift] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadShift = async () => {
        const res = await userApi.getTodayShift();
        setShift(res.shift);
        setLoading(false);
    };

    const handleCheckIn = async () => {
        try {
            await userApi.checkIn();
            toast.success("✅ Check-In thành công!");
            loadShift();
        } catch (err) {
            toast.error(err.response?.data?.message || "Check-in thất bại!");
        }
    };

    const handleCheckOut = async () => {
        try {
            await userApi.checkOut();
            toast.success("✅ Check-Out thành công!");
            loadShift();
        } catch (err) {
            toast.error(err.response?.data?.message || "Check-out thất bại!");
        }
    };

    // useEffect(() => {
    //     loadShift();
    // }, []);

    if (loading) return <p>Đang tải...</p>;

    const canCheckIn = shift && !shift.startTime;
    const canCheckOut = shift && shift.startTime && !shift.endTime;

    return (
        <div className="">
            <Header />

            <h1 className="text-2xl font-bold mb-4">Điểm danh hôm nay</h1>

            {shift ? (
                <div className="bg-white shadow rounded p-4">
                    <p><b>Ca làm:</b> {shift.workShiftId.name}</p>
                    <p><b>Giờ làm:</b> {shift.workShiftId.startTime} → {shift.workShiftId.endTime}</p>
                    <p><b>Trạng thái:</b> {shift.status}</p>
                    <p><b>Check-in:</b> {shift.startTime ? new Date(shift.startTime).toLocaleTimeString() : "Chưa"}</p>
                    <p><b>Check-out:</b> {shift.endTime ? new Date(shift.endTime).toLocaleTimeString() : "Chưa"}</p>

                    <div className="mt-4 flex gap-3">
                        {canCheckIn && (
                            <button
                                onClick={handleCheckIn}
                                className="px-4 py-2 bg-green-600 text-white rounded"
                            >
                                ✅ Check-In
                            </button>
                        )}

                        {canCheckOut && (
                            <button
                                onClick={handleCheckOut}
                                className="px-4 py-2 bg-red-600 text-white rounded"
                            >
                                🚪 Check-Out
                            </button>
                        )}

                        {!canCheckIn && !canCheckOut && (
                            <span className="text-gray-500 italic">Bạn đã hoàn thành điểm danh hôm nay</span>
                        )}
                    </div>
                </div>
            ) : (
                <p>❌ Hôm nay bạn không có ca làm.</p>
            )}
        </div>

    )
}

export default Attendance