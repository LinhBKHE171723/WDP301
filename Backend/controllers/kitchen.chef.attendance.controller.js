const User = require("../models/User");
const Shift = require("../models/Shift");
const WorkShift = require("../models/WorkShift");

/**
 * Lấy danh sách chef và trạng thái check-in hôm nay
 * GET /kitchen/chefs/attendance/today
 */
exports.getTodayChefAttendance = async (req, res) => {
  try {
    // Lấy tất cả chef (không filter status vì status dùng cho việc khác)
    // Chỉ filter accountStatus để loại bỏ tài khoản bị banned
    const chefs = await User.find({
      role: "chef",
      accountStatus: "active",
    }).select("name username email avatar");

    // Lấy ngày hiện tại (đầu ngày)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Lấy tất cả shift hôm nay của các chef
    const shifts = await Shift.find({
      userId: { $in: chefs.map((c) => c._id) },
      date: { $gte: today, $lt: tomorrow },
    }).populate("workShiftId", "name startTime endTime");

    // Gộp thông tin chef với shift
    const chefsWithAttendance = chefs.map((chef) => {
      const shift = shifts.find(
        (s) => s.userId.toString() === chef._id.toString()
      );

      return {
        _id: chef._id,
        name: chef.name,
        username: chef.username,
        email: chef.email,
        avatar: chef.avatar,
        shift: shift
          ? {
              _id: shift._id,
              workShift: shift.workShiftId,
              status: shift.status,
              startTime: shift.startTime,
              endTime: shift.endTime,
              lateMinutes: shift.lateMinutes,
              totalWorkedMinutes: shift.totalWorkedMinutes,
              isCheckedIn: !!shift.startTime,
              isCheckedOut: !!shift.endTime,
            }
          : null,
        isAvailable: shift && shift.startTime && !shift.endTime, // Đã check-in nhưng chưa check-out
      };
    });

    res.status(200).json({
      success: true,
      date: today,
      total: chefsWithAttendance.length,
      data: chefsWithAttendance,
    });
  } catch (error) {
    console.error("❌ Error in getTodayChefAttendance:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách điểm danh chef.",
      error: error.message,
    });
  }
};

/**
 * Check-in cho chef
 * POST /kitchen/chefs/:chefId/check-in
 * Body: { workShiftId }
 */
exports.checkInChef = async (req, res) => {
  try {
    const { chefId } = req.params;
    const { workShiftId } = req.body;

    // Kiểm tra chef tồn tại
    const chef = await User.findOne({ _id: chefId, role: "chef" });
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chef.",
      });
    }

    // Kiểm tra workShift tồn tại
    const workShift = await WorkShift.findById(workShiftId);
    if (!workShift) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ca làm việc.",
      });
    }

    // Lấy ngày hiện tại
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Kiểm tra đã có shift hôm nay chưa
    let shift = await Shift.findOne({
      userId: chefId,
      date: { $gte: today, $lt: tomorrow },
    });

    if (shift) {
      // Nếu đã có shift
      if (shift.startTime) {
        return res.status(400).json({
          success: false,
          message: "Chef đã check-in rồi.",
        });
      }

      // Cập nhật check-in
      shift.startTime = new Date();
      shift.workShiftId = workShiftId;
      await shift.save();
    } else {
      // Tạo shift mới
      shift = await Shift.create({
        userId: chefId,
        workShiftId: workShiftId,
        date: today,
        startTime: new Date(),
      });
    }

    // Populate để trả về thông tin đầy đủ
    await shift.populate("workShiftId", "name startTime endTime");

    res.status(200).json({
      success: true,
      message: `Chef ${chef.name} đã check-in thành công.`,
      shift,
    });
  } catch (error) {
    console.error("❌ Error in checkInChef:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi check-in chef.",
      error: error.message,
    });
  }
};

/**
 * Check-out cho chef
 * POST /kitchen/chefs/:chefId/check-out
 */
exports.checkOutChef = async (req, res) => {
  try {
    const { chefId } = req.params;

    // Kiểm tra chef tồn tại
    const chef = await User.findOne({ _id: chefId, role: "chef" });
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chef.",
      });
    }

    // Lấy ngày hiện tại
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Tìm shift hôm nay
    const shift = await Shift.findOne({
      userId: chefId,
      date: { $gte: today, $lt: tomorrow },
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ca làm việc hôm nay.",
      });
    }

    if (!shift.startTime) {
      return res.status(400).json({
        success: false,
        message: "Chef chưa check-in.",
      });
    }

    if (shift.endTime) {
      return res.status(400).json({
        success: false,
        message: "Chef đã check-out rồi.",
      });
    }

    // Cập nhật check-out
    shift.endTime = new Date();
    await shift.save();

    // Populate để trả về thông tin đầy đủ
    await shift.populate("workShiftId", "name startTime endTime");

    res.status(200).json({
      success: true,
      message: `Chef ${chef.name} đã check-out thành công.`,
      shift,
    });
  } catch (error) {
    console.error("❌ Error in checkOutChef:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi check-out chef.",
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách chef đang active (đã check-in, chưa check-out)
 * GET /kitchen/chefs/active
 */
exports.getActiveChefs = async (req, res) => {
  try {
    // Lấy ngày hiện tại
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(
      "🔍 Getting active chefs for date range:",
      today,
      "to",
      tomorrow
    );

    // Tìm các shift đã check-in nhưng chưa check-out
    const activeShifts = await Shift.find({
      date: { $gte: today, $lt: tomorrow },
      startTime: { $exists: true, $ne: null },
      endTime: null,
    }).populate("userId", "name username email avatar role");

    console.log("📋 Found shifts:", activeShifts.length);
    console.log("📋 Shifts details:", JSON.stringify(activeShifts, null, 2));

    const activeChefs = activeShifts
      .filter((shift) => shift.userId && shift.userId.role === "chef")
      .map((shift) => ({
        _id: shift.userId._id,
        name: shift.userId.name,
        username: shift.userId.username,
        email: shift.userId.email,
        avatar: shift.userId.avatar,
        checkInTime: shift.startTime,
      }));

    console.log("👨‍🍳 Active chefs:", activeChefs.length);

    res.status(200).json({
      success: true,
      total: activeChefs.length,
      data: activeChefs, // ✅ Đổi từ 'chefs' thành 'data' để consistent với API khác
    });
  } catch (error) {
    console.error("❌ Error in getActiveChefs:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách chef đang làm việc.",
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách ca làm việc
 * GET /kitchen/work-shifts
 */
exports.getWorkShifts = async (req, res) => {
  try {
    const workShifts = await WorkShift.find({ isActive: true }).select(
      "name startTime endTime daysOfWeek"
    );

    res.status(200).json({
      success: true,
      total: workShifts.length,
      data: workShifts,
    });
  } catch (error) {
    console.error("❌ Error in getWorkShifts:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách ca làm việc.",
      error: error.message,
    });
  }
};
