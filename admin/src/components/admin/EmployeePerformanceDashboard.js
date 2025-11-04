import React, { useState, useEffect } from "react";
import { Users, ChefHat, Calendar, BarChart2 } from "lucide-react";
import axios from "axios"; // ✅ 1. Import axios
import { Link } from "react-router-dom";

// Hàm helper để định dạng tiền tệ (giữ nguyên)
const formatCurrency = (amount) => {
  if (typeof amount !== "number" || isNaN(amount)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export default function EmployeePerformanceDashboard() {
  // === STATE MANAGEMENT (giữ nguyên) ===
  const [selectedRole, setSelectedRole] = useState("waiter");
  const [dates, setDates] = useState(() => {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setDate(today.getDate() - 30);
    return {
      from: lastMonth.toISOString().split("T")[0],
      to: today.toISOString().split("T")[0],
    };
  });
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // === DATA FETCHING (✅ 2. Sửa lại y hệt file mẫu) ===
useEffect(() => {
    setLoading(true);
    setError(null);

    const endpoint =
      selectedRole === "waiter"
        ? "/api/admin/waiters"
        : "/api/admin/chefs";

    // --- BẮT ĐẦU THAY ĐỔI ---

    // 1. Chuyển đổi chuỗi ngày thành đối tượng Date đầy đủ
    const fromDate = new Date(dates.from);
    const toDate = new Date(dates.to);

    // 2. Thiết lập thời gian cụ thể để bao trọn cả ngày
    // fromDate sẽ là 00:00:00 của ngày bắt đầu
    fromDate.setHours(0, 0, 0, 0); 
    // toDate sẽ là 23:59:59 của ngày kết thúc
    toDate.setHours(23, 59, 59, 999);

    // 3. Chuyển đổi thành chuỗi ISO chuẩn UTC để gửi đi
    // Ví dụ: "2025-10-27T16:59:59.999Z"
    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();

    // 4. Tạo URL với chuỗi ISO đã được mã hóa
    const url = `http://localhost:5000${endpoint}?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`;

    // --- KẾT THÚC THAY ĐỔI ---

    axios
      .get(url)
      .then((res) => {
        const apiData = res.data.data;
        setPerformanceData(Array.isArray(apiData) ? apiData : []);
      })
      .catch((err) => {
        console.error("Lỗi khi tải dữ liệu hiệu suất:", err);
        setError("Không thể tải dữ liệu. Vui lòng kiểm tra lại console.");
        setPerformanceData([]);
      })
      .finally(() => {
        setLoading(false);
      });
      
  }, [selectedRole, dates]);
  // === UI RENDERING (giữ nguyên) ===
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <BarChart2 className="mr-3 text-blue-600" size={32} />
          Báo cáo Hiệu suất Nhân viên
        </h1>
        <p className="text-gray-500 mt-1">
          Phân tích và so sánh hiệu suất làm việc của các nhân viên.
        </p>
      </header>

      {/* --- BỘ LỌC --- */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm flex flex-col md:flex-row gap-4 items-center">
        {/* Lọc theo vai trò */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedRole("waiter")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              selectedRole === "waiter"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <Users size={18} /> Nhân viên Phục vụ
          </button>
          <button
            onClick={() => setSelectedRole("chef")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              selectedRole === "chef"
                ? "bg-green-600 text-white shadow"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <ChefHat size={18} /> Đầu bếp
          </button>
        </div>
        
        {/* Lọc theo ngày */}
        <div className="flex items-center gap-4 ml-auto">
            <Calendar className="text-gray-500" size={20}/>
            <div className="flex items-center gap-2">
                <label htmlFor="from-date" className="text-sm font-medium text-gray-600">Từ:</label>
                <input
                    id="from-date"
                    type="date"
                    value={dates.from}
                    onChange={(e) => setDates({ ...dates, from: e.target.value })}
                    className="border rounded-md p-1.5 text-sm"
                />
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="to-date" className="text-sm font-medium text-gray-600">Đến:</label>
                <input
                    id="to-date"
                    type="date"
                    value={dates.to}
                    onChange={(e) => setDates({ ...dates, to: e.target.value })}
                    className="border rounded-md p-1.5 text-sm"
                />
            </div>
        </div>
      </div>

      {/* --- BẢNG HIỂN THỊ DỮ LIỆU --- */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading && <p className="p-6 text-center text-gray-500">Đang tải dữ liệu...</p>}
        {error && <p className="p-6 text-center text-red-500">Lỗi: {error}</p>}
        {!loading && !error && (
          <table className="w-full text-left">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Hạng</th>
                <th className="p-4 font-semibold text-gray-600">Tên Nhân viên</th>
                
                {selectedRole === "waiter" && (
                  <>
                    <th className="p-4 font-semibold text-gray-600 text-center">Số Món Đã Phục Vụ</th>
                    <th className="p-4 font-semibold text-gray-600 text-right">Món/Giờ</th>
                    <th className="p-4 font-semibold text-gray-600 text-center">Giờ Làm Việc</th>
                    <th className="p-4 font-semibold text-gray-600 text-center">Đánh Giá TB</th>
                  </>
                )}
                {selectedRole === "chef" && (
                  <>
                    <th className="p-4 font-semibold text-gray-600 text-center">Tổng Số Món Nấu</th>
                    <th className="p-4 font-semibold text-gray-600 text-right">Món/Giờ</th>
                    <th className="p-4 font-semibold text-gray-600 text-center">Giờ Làm Việc</th>
                    <th className="p-4 font-semibold text-gray-600 text-center">Đánh Giá TB</th>
                  </>
                )}

                <th className="p-4 font-semibold text-gray-600 text-center">Ngày Công</th>
                <th className="p-4 font-semibold text-gray-600 text-center">Chi tiết</th>

              </tr>
            </thead>
            <tbody>
              {performanceData.length > 0 ? (
                performanceData.map((item, index) => {
                  // Tính toán cảnh báo
                  const warnings = [];
                  const lateRate = item.attendance.daysWorked > 0 
                    ? (item.attendance.lateCount / item.attendance.daysWorked) * 100 
                    : 0;
                  const absentRate = item.attendance.daysWorked > 0 
                    ? (item.attendance.absentCount / item.attendance.daysWorked) * 100 
                    : 0;
                  
                  if (lateRate > 20) warnings.push('Đi muộn > 20%');
                  if (absentRate > 10) warnings.push('Vắng > 10%');
                  if (item.performance.averageRating !== null && item.performance.averageRating < 3.0) {
                    warnings.push('Đánh giá < 3.0');
                  }
                  
                  // Tính hiệu quả trung bình để so sánh
                  const avgEfficiency = performanceData.length > 0
                    ? performanceData.reduce((sum, d) => {
                        const eff = selectedRole === 'waiter' 
                          ? (d.performance.itemsPerHour || 0)
                          : (d.performance.itemsPerHour || 0);
                        return sum + eff;
                      }, 0) / performanceData.length
                    : 0;
                  
                  const currentEfficiency = selectedRole === 'waiter'
                    ? (item.performance.itemsPerHour || 0)
                    : (item.performance.itemsPerHour || 0);
                  
                  if (avgEfficiency > 0 && currentEfficiency < avgEfficiency * 0.5) {
                    warnings.push('Hiệu quả < 50% TB');
                  }
                  
                  return (
                    <tr key={item.employee._id} className={`border-b hover:bg-gray-50 ${warnings.length > 0 ? 'bg-red-50' : ''}`}>
                      <td className="p-4 font-bold text-lg text-center">{index + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-semibold text-gray-800">{item.employee.name}</p>
                            <p className="text-sm text-gray-500">{item.employee.email}</p>
                          </div>
                          {warnings.length > 0 && (
                            <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-full" title={warnings.join(', ')}>
                              ⚠️
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {selectedRole === 'waiter' && (
                        <>
                          <td className="p-4 text-center font-medium text-blue-600">
                            {item.performance.itemsServedCount || 0}
                          </td>
                          <td className="p-4 text-right">
                            {item.performance.itemsPerHour ? item.performance.itemsPerHour.toFixed(1) : '0.0'}
                          </td>
                          <td className="p-4 text-center">
                            {item.attendance.totalHours ? item.attendance.totalHours.toFixed(1) : '0.0'}h
                          </td>
                          <td className="p-4 text-center">
                            {item.performance.averageRating != null && 
                             !isNaN(item.performance.averageRating) && 
                             item.performance.averageRating > 0 ? (
                              <span className={`font-semibold ${
                                item.performance.averageRating >= 4 ? 'text-green-600' :
                                item.performance.averageRating >= 3 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {Number(item.performance.averageRating).toFixed(1)} ⭐
                                {item.performance.totalRatings > 0 && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({item.performance.totalRatings})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </>
                      )}
                      {selectedRole === 'chef' && (
                        <>
                          <td className="p-4 text-center font-medium text-green-600">
                            {item.performance.itemsCookedCount || 0}
                          </td>
                          <td className="p-4 text-right">
                            {item.performance.itemsPerHour ? item.performance.itemsPerHour.toFixed(1) : '0.0'}
                          </td>
                          <td className="p-4 text-center">
                            {item.attendance.totalHours ? item.attendance.totalHours.toFixed(1) : '0.0'}h
                          </td>
                          <td className="p-4 text-center">
                            {item.performance.averageRating != null && 
                             !isNaN(item.performance.averageRating) && 
                             item.performance.averageRating > 0 ? (
                              <span className={`font-semibold ${
                                item.performance.averageRating >= 4 ? 'text-green-600' :
                                item.performance.averageRating >= 3 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {Number(item.performance.averageRating).toFixed(1)} ⭐
                                {item.performance.totalRatings > 0 && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({item.performance.totalRatings})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </>
                      )}
                      
                      <td className="p-4 text-center">{item.attendance.daysWorked || 0}</td>
                      <td className="p-4 text-center">
                        <Link
                          to={`/performance/${item.employee._id}`}
                          className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all duration-150"
                        >
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={selectedRole === 'waiter' ? 9 : 9} className="p-6 text-center text-gray-500">
                    Không có dữ liệu trong khoảng thời gian này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}