import React, { useState, useEffect } from "react";
import kitchenApi from "../../api/kitchenApi";

const ChefAttendanceManager = () => {
  const [chefs, setChefs] = useState([]);
  const [workShifts, setWorkShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attendanceRes, shiftsRes] = await Promise.all([
        kitchenApi.getTodayChefAttendance(),
        kitchenApi.getWorkShifts(),
      ]);

      // Backend trả về data trực tiếp trong response.data
      const chefsData = attendanceRes?.data || [];
      const shiftsData = shiftsRes?.data || [];

      setChefs(chefsData);
      setWorkShifts(shiftsData);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      setChefs([]);
      setWorkShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (chefId) => {
    const shiftId = selectedShift[chefId];
    if (!shiftId) {
      alert("Vui lòng chọn ca làm việc!");
      return;
    }

    try {
      await kitchenApi.checkInChef(chefId, shiftId);
      await fetchData();
    } catch (error) {
      console.error("Error checking in chef:", error);
      alert(error.response?.data?.message || "Lỗi khi check-in!");
    }
  };

  const handleCheckOut = async (chefId) => {
    try {
      await kitchenApi.checkOutChef(chefId);
      await fetchData();
    } catch (error) {
      console.error("Error checking out chef:", error);
      alert(error.response?.data?.message || "Lỗi khi check-out!");
    }
  };

  const handleShiftChange = (chefId, shiftId) => {
    setSelectedShift((prev) => ({
      ...prev,
      [chefId]: shiftId,
    }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "checked_in":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Đang làm việc
          </span>
        );
      case "checked_out":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            Đã kết thúc
          </span>
        );
      case "late":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Đi muộn
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Chưa check-in
          </span>
        );
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Quản lý Điểm danh Nhân viên Bếp
        </h1>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Nhân viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Ca làm việc
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Check-in
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Check-out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!chefs || chefs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Không có nhân viên bếp nào
                    </td>
                  </tr>
                ) : (
                  chefs.map((chef) => (
                    <tr key={chef._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {chef.avatar ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={chef.avatar}
                                alt={chef.name}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                {chef.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {chef.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {chef.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {chef.shift?.isCheckedIn ? (
                          <div className="text-sm text-gray-900">
                            {chef.shift?.workShift?.name || "N/A"}
                            <div className="text-xs text-gray-500">
                              {chef.shift?.workShift?.startTime} -{" "}
                              {chef.shift?.workShift?.endTime}
                            </div>
                          </div>
                        ) : (
                          <select
                            value={selectedShift[chef._id] || ""}
                            onChange={(e) =>
                              handleShiftChange(chef._id, e.target.value)
                            }
                            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Chọn ca</option>
                            {workShifts && workShifts.length > 0 ? (
                              workShifts.map((shift) => (
                                <option key={shift._id} value={shift._id}>
                                  {shift.name} ({shift.startTime} -{" "}
                                  {shift.endTime})
                                </option>
                              ))
                            ) : (
                              <option disabled>Chưa có ca làm việc</option>
                            )}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(chef.shift?.status || "absent")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(chef.shift?.startTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(chef.shift?.endTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!chef.shift?.isCheckedIn || chef.shift?.endTime ? (
                          // Chưa check-in HOẶC đã check-out
                          chef.shift?.endTime ? (
                            <span className="text-gray-400">Đã kết thúc</span>
                          ) : (
                            <button
                              onClick={() => handleCheckIn(chef._id)}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition duration-200"
                            >
                              Check-in
                            </button>
                          )
                        ) : (
                          // Đã check-in và chưa check-out
                          <button
                            onClick={() => handleCheckOut(chef._id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition duration-200"
                          >
                            Check-out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 uppercase">
              Tổng nhân viên
            </div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {chefs?.length || 0}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 uppercase">
              Đang làm việc
            </div>
            <div className="mt-2 text-3xl font-semibold text-green-600">
              {chefs?.filter(
                (c) => c.shift?.isCheckedIn && c.shift?.status !== "checked_out"
              ).length || 0}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 uppercase">
              Chưa check-in
            </div>
            <div className="mt-2 text-3xl font-semibold text-red-600">
              {chefs?.filter((c) => !c.shift?.isCheckedIn).length || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChefAttendanceManager;
