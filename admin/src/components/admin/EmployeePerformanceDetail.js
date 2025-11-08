import React, { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, CalendarDays } from "lucide-react";

export default function ShiftDetail({ userId }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hàm tạo from/to theo tháng-năm
  const getRange = (month, year) => {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0); // ngày cuối tháng
    return {
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    };
  };

  // Gọi API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { from, to } = getRange(month, year);
      try {
        const res = await axios.get(
          `http://localhost:5000/api/admin/performance/shifts/${userId}?from=${from}&to=${to}`
        );
        if (res.data.success) setData(res.data.data);
        else throw new Error(res.data.message);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, month, year]);

  // loading & error
  if (loading)
    return (
      <div className="flex items-center justify-center py-10 text-gray-600">
        <Loader2 className="animate-spin mr-2" /> Đang tải dữ liệu...
      </div>
    );

  if (error)
    return (
      <div className="text-red-500 text-center py-10">
        ❌ Lỗi tải dữ liệu: {error}
      </div>
    );

  if (!data)
    return (
      <div className="text-gray-500 text-center py-10">
        Không có dữ liệu để hiển thị
      </div>
    );

  // ====== Tính toán hiển thị =======
  const totalHours = (data.totalWorkedMinutes / 60).toFixed(1);
  const validShifts = data.totalShifts - data.absentCount;
  const onTimeCount =
    validShifts -
    data.shifts.filter((s) => s.status === "late" || s.status === "early_leave")
      .length;
  const onTimeRate =
    data.totalShifts > 0
      ? ((onTimeCount / data.totalShifts) * 100).toFixed(1)
      : 0;

  // ====== Giao diện =======
  return (
    <div className="p-6 bg-white rounded-2xl shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold flex items-center">
          <CalendarDays className="w-6 h-6 mr-2 text-indigo-600" />
          Thống kê tháng {month}/{year}
        </h2>

        {/* Bộ chọn tháng + năm */}
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border rounded-lg px-3 py-1 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded-lg px-3 py-1 text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => today.getFullYear() - i).map(
              (y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Tổng quan tháng */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Tổng ca" value={data.totalShifts} />
        <Stat label="Giờ làm" value={`${totalHours}h`} />
        <Stat label="Đi trễ" value={`${data.totalLate} phút`} />
        <Stat label="Về sớm" value={`${data.totalEarly} phút`} />
        <Stat label="Nghỉ" value={`${data.absentCount} buổi`} />
        <Stat label="Tỉ lệ đúng giờ" value={`${onTimeRate}%`} />
      </div>

      {/* Bảng chi tiết */}
      <div className="overflow-x-auto border-t pt-4">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700 uppercase text-xs">
              <th className="py-2 px-3 text-left">Ngày</th>
              <th className="py-2 px-3 text-left">Ca làm</th>
              <th className="py-2 px-3 text-left">Giờ check-in</th>
              <th className="py-2 px-3 text-left">Giờ check-out</th>
              <th className="py-2 px-3 text-center">Trễ</th>
              <th className="py-2 px-3 text-center">Sớm</th>
              <th className="py-2 px-3 text-center">Trạng thái</th>
              <th className="py-2 px-3 text-left">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {data.shifts.map((shift, idx) => (
              <tr
                key={idx}
                className={`border-b ${
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <td className="py-2 px-3">
                  {new Date(shift.date).toLocaleDateString("vi-VN")}
                </td>
                <td className="py-2 px-3">{shift.workShiftId?.name}</td>
                <td className="py-2 px-3">
                  {shift.startTime
                    ? new Date(shift.startTime).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--"}
                </td>
                <td className="py-2 px-3">
                  {shift.endTime
                    ? new Date(shift.endTime).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--"}
                </td>
                <td className="py-2 px-3 text-center">
                  {shift.lateMinutes || 0}
                </td>
                <td className="py-2 px-3 text-center">
                  {shift.earlyLeaveMinutes || 0}
                </td>
                <td className="py-2 px-3 text-center">
                  <StatusBadge status={shift.status} />
                </td>
                <td className="py-2 px-3">{shift.note || "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* Components phụ */
const Stat = ({ label, value }) => (
  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center shadow-sm">
    <div className="text-indigo-600 text-sm">{label}</div>
    <div className="font-semibold text-lg">{value}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const colorMap = {
    checked_out: "bg-green-100 text-green-700",
    checked_in: "bg-blue-100 text-blue-700",
    late: "bg-yellow-100 text-yellow-700",
    early_leave: "bg-orange-100 text-orange-700",
    absent: "bg-red-100 text-red-700",
    pending: "bg-gray-100 text-gray-600",
  };
  const textMap = {
    checked_out: "Hoàn thành",
    checked_in: "Đang làm",
    late: "Đi trễ",
    early_leave: "Về sớm",
    absent: "Vắng",
    pending: "Chưa điểm danh",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${colorMap[status]}`}
    >
      {textMap[status] || status}
    </span>
  );
};
