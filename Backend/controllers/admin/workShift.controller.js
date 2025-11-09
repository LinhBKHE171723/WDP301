const WorkShift = require("../../models/WorkShift");
const { success, error } = require("../../utils/response");

// Lấy danh sách tất cả ca làm việc
exports.getWorkShifts = async (req, res) => {
  try {
    const workShifts = await WorkShift.find()
      .populate("employees", "name email role")
      .sort({ createdAt: -1 });
    
    return success(res, workShifts);
  } catch (err) {
    console.error("Error getting work shifts:", err);
    return error(res, err.message);
  }
};

// Lấy chi tiết một ca làm việc
exports.getWorkShift = async (req, res) => {
  try {
    const { id } = req.params;
    const workShift = await WorkShift.findById(id)
      .populate("employees", "name email role");
    
    if (!workShift) {
      return error(res, "Không tìm thấy ca làm việc", 404);
    }
    
    return success(res, workShift);
  } catch (err) {
    console.error("Error getting work shift:", err);
    return error(res, err.message);
  }
};

// Tạo ca làm việc mới
exports.createWorkShift = async (req, res) => {
  try {
    const { name, startTime, endTime, daysOfWeek, employees = [], isActive = true } = req.body;
    
    // Validation - employees là optional, có thể tạo ca trống rồi gán nhân viên sau
    if (!name || !startTime || !endTime) {
      return error(res, "Tên ca, giờ bắt đầu và giờ kết thúc là bắt buộc", 400);
    }
    
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return error(res, "Định dạng giờ không hợp lệ. Vui lòng sử dụng định dạng HH:MM (ví dụ: 08:00)", 400);
    }
    
    // Validate daysOfWeek
    let validDaysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Default: cả tuần
    if (daysOfWeek !== undefined) {
      if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
        return error(res, "Phải chọn ít nhất một ngày trong tuần", 400);
      }
      const invalidDays = daysOfWeek.filter(day => day < 0 || day > 6 || !Number.isInteger(day));
      if (invalidDays.length > 0) {
        return error(res, "daysOfWeek phải là mảng các số từ 0-6 (0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7)", 400);
      }
      validDaysOfWeek = [...new Set(daysOfWeek)].sort(); // Remove duplicates and sort
    }
    
    // Check if name already exists
    const existing = await WorkShift.findOne({ name: name.trim() });
    if (existing) {
      return error(res, "Tên ca làm việc đã tồn tại", 400);
    }
    
    const workShift = new WorkShift({
      name: name.trim(),
      startTime,
      endTime,
      daysOfWeek: validDaysOfWeek,
      employees: Array.isArray(employees) ? employees : [],
      isActive
    });
    
    await workShift.save();
    await workShift.populate("employees", "name email role");
    
    return success(res, workShift, "Đã tạo ca làm việc thành công");
  } catch (err) {
    console.error("Error creating work shift:", err);
    if (err.code === 11000) {
      return error(res, "Tên ca làm việc đã tồn tại", 400);
    }
    return error(res, err.message);
  }
};

// Cập nhật ca làm việc
exports.updateWorkShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, daysOfWeek, employees, isActive } = req.body;
    
    const workShift = await WorkShift.findById(id);
    if (!workShift) {
      return error(res, "Không tìm thấy ca làm việc", 404);
    }
    
    // Validate time format if provided
    if (startTime || endTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (startTime && !timeRegex.test(startTime)) {
        return error(res, "Định dạng giờ bắt đầu không hợp lệ", 400);
      }
      if (endTime && !timeRegex.test(endTime)) {
        return error(res, "Định dạng giờ kết thúc không hợp lệ", 400);
      }
    }
    
    // Validate daysOfWeek if provided
    if (daysOfWeek !== undefined) {
      if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
        return error(res, "Phải chọn ít nhất một ngày trong tuần", 400);
      }
      const invalidDays = daysOfWeek.filter(day => day < 0 || day > 6 || !Number.isInteger(day));
      if (invalidDays.length > 0) {
        return error(res, "daysOfWeek phải là mảng các số từ 0-6 (0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7)", 400);
      }
      workShift.daysOfWeek = [...new Set(daysOfWeek)].sort(); // Remove duplicates and sort
    }
    
    // Check name uniqueness if changing name
    if (name && name.trim() !== workShift.name) {
      const existing = await WorkShift.findOne({ name: name.trim() });
      if (existing) {
        return error(res, "Tên ca làm việc đã tồn tại", 400);
      }
      workShift.name = name.trim();
    }
    
    if (startTime !== undefined) workShift.startTime = startTime;
    if (endTime !== undefined) workShift.endTime = endTime;
    if (employees !== undefined) workShift.employees = Array.isArray(employees) ? employees : [];
    if (isActive !== undefined) workShift.isActive = isActive;
    
    await workShift.save();
    await workShift.populate("employees", "name email role");
    
    return success(res, workShift, "Đã cập nhật ca làm việc thành công");
  } catch (err) {
    console.error("Error updating work shift:", err);
    if (err.code === 11000) {
      return error(res, "Tên ca làm việc đã tồn tại", 400);
    }
    return error(res, err.message);
  }
};

// Xóa ca làm việc
exports.deleteWorkShift = async (req, res) => {
  try {
    const { id } = req.params;
    
    const workShift = await WorkShift.findById(id);
    if (!workShift) {
      return error(res, "Không tìm thấy ca làm việc", 404);
    }
    
    await WorkShift.findByIdAndDelete(id);
    
    return success(res, null, "Đã xóa ca làm việc thành công");
  } catch (err) {
    console.error("Error deleting work shift:", err);
    return error(res, err.message);
  }
};

