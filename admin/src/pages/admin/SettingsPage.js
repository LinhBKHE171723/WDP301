import { useState, useEffect } from "react";
import { Card } from "../../components/ui/admin/card";
import { Button } from "../../components/ui/admin/button";
import { Input } from "../../components/ui/admin/input";
import adminApi from "../../api/adminApi";
import { toast } from "react-toastify";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("preorder"); // "preorder" | "workshift"
  
  // Preorder settings state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [threshold, setThreshold] = useState(2000000);

  // Work shift state
  const [workShifts, setWorkShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    name: "",
    startTime: "",
    endTime: "",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Mặc định: cả tuần
    employees: [],
    isActive: true
  });
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    if (activeTab === "preorder") {
      loadSettings();
    } else if (activeTab === "workshift") {
      loadWorkShifts();
      loadEmployees();
    }
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getPreOrderSettings();
      const settings = response?.data || response;
      
      if (settings && "preorder.largeOrderThreshold" in settings) {
        const thresholdValue = settings["preorder.largeOrderThreshold"];
        const numValue = typeof thresholdValue === "number" ? thresholdValue : Number(thresholdValue);
        setThreshold(!isNaN(numValue) ? numValue : 2000000);
      } else {
        setThreshold(2000000);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Không thể tải cài đặt");
    } finally {
      setLoading(false);
    }
  };

  const loadWorkShifts = async () => {
    try {
      setLoadingShifts(true);
      const response = await adminApi.getWorkShifts();
      const shifts = Array.isArray(response?.data) ? response.data : [];
      setWorkShifts(shifts);
    } catch (error) {
      console.error("Error loading work shifts:", error);
      toast.error("Không thể tải danh sách ca làm việc");
    } finally {
      setLoadingShifts(false);
    }
  };

  const loadEmployees = async () => {
    try {
      // Lấy tất cả nhân viên (không phân trang) bằng cách set limit lớn
      const response = await adminApi.getUsers();
      // API trả về { items: [...], total, page, pages }
      const data = response?.data || response;
      const users = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      
      // Chỉ lấy nhân viên (waiter, chef, cashier, kitchen_manager) và status = active
      // Loại bỏ admin vì admin không cần gán vào ca làm việc
      const staff = users.filter(u => {
        const isStaff = ["waiter", "chef", "cashier", "kitchen_manager"].includes(u.role);
        const isActive = u.status === "active" || u.accountStatus === "active";
        return isStaff && isActive;
      });
      
      setEmployees(staff);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Không thể tải danh sách nhân viên");
    }
  };

  const handleSave = async () => {
    try {
      if (threshold < 0) {
        toast.error("Ngưỡng đơn lớn phải lớn hơn hoặc bằng 0");
        return;
      }

      setSaving(true);
      const thresholdNumber = typeof threshold === "number" ? threshold : Number(threshold);
      
      await adminApi.updateSetting(
        "preorder.largeOrderThreshold",
        thresholdNumber,
        "Ngưỡng giá trị để phân loại đơn lớn/nhỏ",
        "preorder"
      );

      toast.success("Đã lưu cài đặt thành công");
      setTimeout(() => {
        loadSettings();
      }, 500);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Không thể lưu cài đặt");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateShift = () => {
    setEditingShift(null);
    setShiftForm({
      name: "",
      startTime: "",
      endTime: "",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Mặc định: cả tuần
      employees: [],
      isActive: true
    });
    setShowShiftForm(true);
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name || "",
      startTime: shift.startTime || "",
      endTime: shift.endTime || "",
      daysOfWeek: shift.daysOfWeek && shift.daysOfWeek.length > 0 
        ? shift.daysOfWeek 
        : [0, 1, 2, 3, 4, 5, 6], // Default nếu không có
      employees: shift.employees?.map(e => e._id || e) || [],
      isActive: shift.isActive !== undefined ? shift.isActive : true
    });
    setShowShiftForm(true);
  };

  const handleSaveShift = async () => {
    try {
      if (!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) {
        toast.error("Vui lòng điền đầy đủ thông tin");
        return;
      }

      if (!shiftForm.daysOfWeek || shiftForm.daysOfWeek.length === 0) {
        toast.error("Vui lòng chọn ít nhất một ngày trong tuần");
        return;
      }

      if (editingShift) {
        await adminApi.updateWorkShift(editingShift._id, shiftForm);
        toast.success("Đã cập nhật ca làm việc thành công");
      } else {
        await adminApi.createWorkShift(shiftForm);
        toast.success("Đã tạo ca làm việc thành công");
      }

      setShowShiftForm(false);
      loadWorkShifts();
    } catch (error) {
      console.error("Error saving work shift:", error);
      toast.error(error.response?.data?.message || "Không thể lưu ca làm việc");
    }
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa ca làm việc này?")) {
      return;
    }

    try {
      await adminApi.deleteWorkShift(id);
      toast.success("Đã xóa ca làm việc thành công");
      loadWorkShifts();
    } catch (error) {
      console.error("Error deleting work shift:", error);
      toast.error("Không thể xóa ca làm việc");
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN").format(value);
  };

  const formatDaysOfWeek = (daysOfWeek) => {
    if (!daysOfWeek || daysOfWeek.length === 0) return "Không có";
    if (daysOfWeek.length === 7) return "Cả tuần";
    
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return daysOfWeek.map(day => dayNames[day]).join(", ");
  };

  const dayNames = [
    { value: 0, label: "Chủ nhật" },
    { value: 1, label: "Thứ 2" },
    { value: 2, label: "Thứ 3" },
    { value: 3, label: "Thứ 4" },
    { value: 4, label: "Thứ 5" },
    { value: 5, label: "Thứ 6" },
    { value: 6, label: "Thứ 7" }
  ];

  const handleDayToggle = (day) => {
    const currentDays = shiftForm.daysOfWeek || [];
    if (currentDays.includes(day)) {
      // Bỏ chọn ngày
      const newDays = currentDays.filter(d => d !== day);
      if (newDays.length === 0) {
        toast.warning("Phải chọn ít nhất một ngày trong tuần");
        return;
      }
      setShiftForm({
        ...shiftForm,
        daysOfWeek: newDays.sort()
      });
    } else {
      // Chọn thêm ngày
      const newDays = [...currentDays, day].sort();
      setShiftForm({
        ...shiftForm,
        daysOfWeek: newDays
      });
    }
  };

  if (loading && activeTab === "preorder") {
    return (
      <div className="space-y-6">
        <Card>
          <div className="p-6 text-center">Đang tải...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Card>
        <div className="p-4 border-b">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("preorder")}
              className={`px-4 py-2 font-medium ${
                activeTab === "preorder"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Cài đặt đơn đặt trước
            </button>
            <button
              onClick={() => setActiveTab("workshift")}
              className={`px-4 py-2 font-medium ${
                activeTab === "workshift"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Quản lý ca làm việc
            </button>
          </div>
        </div>
      </Card>

      {/* Preorder Settings Tab */}
      {activeTab === "preorder" && (
        <Card>
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Cài đặt đơn đặt trước</h2>

            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ngưỡng đơn lớn (VND)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Đơn có tổng giá trị lớn hơn ngưỡng này sẽ được gửi cho Admin. 
                  Đơn nhỏ hơn hoặc bằng ngưỡng sẽ được gửi cho Cashier.
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                    className="flex-1"
                    placeholder="Nhập ngưỡng..."
                  />
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    = {formatCurrency(threshold)} ₫
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Lưu ý:</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Admin chỉ thấy và xử lý đơn lớn (tổng tiền &gt; ngưỡng)</li>
                  <li>Cashier chỉ thấy và xử lý đơn nhỏ (tổng tiền ≤ ngưỡng)</li>
                  <li>Mỗi đơn chỉ hiển thị cho một role để tránh trùng lặp</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={loadSettings}
                  disabled={saving}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : "Lưu cài đặt"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Work Shift Management Tab */}
      {activeTab === "workshift" && (
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Quản lý ca làm việc</h2>
              <Button onClick={handleCreateShift}>
                + Thêm ca mới
              </Button>
            </div>

            {loadingShifts ? (
              <div className="text-center py-8">Đang tải...</div>
            ) : (
              <div className="space-y-4">
                {workShifts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Chưa có ca làm việc nào. Nhấn "Thêm ca mới" để tạo ca đầu tiên.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="p-3 text-left text-sm font-semibold">Tên ca</th>
                          <th className="p-3 text-left text-sm font-semibold">Giờ bắt đầu</th>
                          <th className="p-3 text-left text-sm font-semibold">Giờ kết thúc</th>
                          <th className="p-3 text-left text-sm font-semibold">Thứ trong tuần</th>
                          <th className="p-3 text-left text-sm font-semibold">Số nhân viên</th>
                          <th className="p-3 text-left text-sm font-semibold">Trạng thái</th>
                          <th className="p-3 text-left text-sm font-semibold">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workShifts.map((shift) => (
                          <tr key={shift._id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{shift.name}</td>
                            <td className="p-3">{shift.startTime}</td>
                            <td className="p-3">{shift.endTime}</td>
                            <td className="p-3 text-sm">{formatDaysOfWeek(shift.daysOfWeek)}</td>
                            <td className="p-3">{shift.employees?.length || 0}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                shift.isActive 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-800"
                              }`}>
                                {shift.isActive ? "✓ Hoạt động" : "✗ Tạm dừng"}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditShift(shift)}
                                >
                                  Sửa
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteShift(shift._id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Xóa
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Shift Form Modal */}
            {showShiftForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-xl font-bold mb-4">
                    {editingShift ? "Sửa ca làm việc" : "Thêm ca làm việc mới"}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tên ca *</label>
                      <Input
                        value={shiftForm.name}
                        onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                        placeholder="Ví dụ: Ca sáng, Ca chiều"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Giờ bắt đầu *</label>
                      <Input
                        type="time"
                        value={shiftForm.startTime}
                        onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Giờ kết thúc *</label>
                      <Input
                        type="time"
                        value={shiftForm.endTime}
                        onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Thứ trong tuần *
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {dayNames.map((day) => (
                          <label
                            key={day.value}
                            className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={shiftForm.daysOfWeek?.includes(day.value)}
                              onChange={() => handleDayToggle(day.value)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{day.label}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Chọn các ngày trong tuần mà ca làm việc này áp dụng. Mặc định: cả tuần.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Nhân viên <span className="text-gray-400 font-normal">(Tùy chọn)</span>
                      </label>
                      <select
                        multiple
                        value={shiftForm.employees}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          setShiftForm({ ...shiftForm, employees: selected });
                        }}
                        className="w-full p-2 border rounded"
                        size="5"
                      >
                        {employees.length === 0 ? (
                          <option disabled>Không có nhân viên nào</option>
                        ) : (
                          employees.map((emp) => (
                            <option key={emp._id} value={emp._id}>
                              {emp.name} ({emp.role === "waiter" ? "Waiter" : emp.role === "chef" ? "Chef" : emp.role === "cashier" ? "Cashier" : emp.role === "kitchen_manager" ? "Kitchen Manager" : emp.role})
                            </option>
                          ))
                        )}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Có thể tạo ca mà không gán nhân viên, sau đó gán nhân viên sau. 
                        Giữ Ctrl (Windows) hoặc Cmd (Mac) để chọn nhiều nhân viên. 
                        Chỉ hiển thị nhân viên có trạng thái "active".
                      </p>
                    </div>
                    
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shiftForm.isActive}
                          onChange={(e) => setShiftForm({ ...shiftForm, isActive: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <div>
                          <span className="block text-sm font-medium">Hoạt động</span>
                          <span className="text-xs text-gray-500">
                            Bật/tắt ca làm việc. Ca không hoạt động sẽ không được sử dụng khi tạo lịch làm việc mới.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowShiftForm(false)}
                    >
                      Hủy
                    </Button>
                    <Button onClick={handleSaveShift}>
                      {editingShift ? "Cập nhật" : "Tạo mới"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
