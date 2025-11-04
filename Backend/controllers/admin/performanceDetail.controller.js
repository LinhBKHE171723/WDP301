const shiftService = require("../../services/admin/performanceDetail.service.js");

/**
 * ✅ Lấy toàn bộ ca làm việc của 1 nhân viên (dành cho Admin)
 * GET /api/admin/performance/shifts/:userId
 */
exports.getShiftDetailsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await shiftService.getAllShiftsByUser(userId);

    res.status(200).json({
      success: true,
      message: `Lấy danh sách ca làm việc của nhân viên ${userId} thành công.`,
      data,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy ca làm việc:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server khi lấy thông tin ca làm việc.",
    });
  }
};
