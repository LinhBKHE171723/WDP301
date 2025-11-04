import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function ShiftDetail({  }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Phân trang FE
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Số bản ghi mỗi trang
const { userId } = useParams();

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/admin/performance/shifts/${userId}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setData(json.data);
        } else {
          throw new Error(json.message || "Không có dữ liệu");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchShifts();
  }, [userId]);

  if (loading) return <p className="text-center mt-10 text-gray-600">⏳ Đang tải dữ liệu...</p>;
  if (error) return <p className="text-center text-red-600">Lỗi: {error}</p>;
  if (data.length === 0) return <p className="text-center text-gray-500">Không có ca làm việc nào.</p>;

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = data.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (iso) => new Date(iso).toLocaleDateString("vi-VN");
  const formatTime = (iso) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-4 text-gray-800"> Danh sách ca làm việc của </h2>

      <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
        <table className="min-w-full text-sm text-gray-700 border">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">Ngày</th>
              <th className="px-4 py-3 text-left">Giờ bắt đầu</th>
              <th className="px-4 py-3 text-left">Giờ kết thúc</th>
              <th className="px-4 py-3 text-left">Tổng thời gian</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((shift) => (
              <tr key={shift._id} className="border-t hover:bg-gray-50 transition">
                <td className="px-4 py-3">{formatDate(shift.date)}</td>
                <td className="px-4 py-3">{formatTime(shift.startTime)}</td>
                <td className="px-4 py-3">{formatTime(shift.endTime)}</td>
<td className="px-4 py-3">
  {shift.startTime && shift.endTime
    ? (() => {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        const diffMs = end - start;
        const diffMinutes = Math.floor(diffMs / 1000 / 60);
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return `${hours}h ${minutes}p`;
      })()
    : "Chưa hoàn thành"}
</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      shift.status === "checked_out"
                        ? "bg-green-100 text-green-700"
                        : shift.status === "checked_in"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {shift.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
          >
            ← Trang trước
          </button>

          <span className="text-sm text-gray-600">
            Trang {currentPage}/{totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
          >
            Trang sau →
          </button>
        </div>
      </div>
    </div>
  );
}
