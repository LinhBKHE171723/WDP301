const Shift = require("../../models/Shift");

/**
 * ✅ Lấy toàn bộ ca làm việc của 1 nhân viên
 * Trả về danh sách các shift, không kèm thông tin user để nhẹ dữ liệu
 */
exports.getAllShiftsByUser = async (userId) => {
  if (!userId) throw new Error("Thiếu userId");

  const shifts = await Shift.find({ userId }).sort({ date: -1 }); // sắp xếp mới nhất trước

  return shifts.map((s) => ({
    _id: s._id,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    duration: s.duration,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    formattedDuration: s.duration
      ? `${Math.floor(s.duration / 60)}h ${s.duration % 60}p`
      : "0 phút",
  }));
};
