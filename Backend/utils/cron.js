const cron = require("node-cron");
const User = require("../models/User");
const WorkShift = require("../models/WorkShift");
const Shift = require("../models/Shift");

/**
 * Helper: Lấy mốc thời gian đầu và cuối ngày hiện tại
 */
const getTodayRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 00:00:00
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1); // ngày mai
  return { startOfDay: today, endOfDay: tomorrow };
};

/**
 * Cron job test: chạy mỗi 1 phút (dễ test)
 * - Tạo shift cho tất cả nhân viên theo ca làm
 *
 * ⚠️ Đã XÓA phần reset status vì hệ thống dùng Shift model để quản lý check-in/out
 */
cron.schedule("*/1 * * * *", async () => {
  console.log(
    "⏱ Cron job test: Tạo shift mới cho nhân viên trong WorkShift..."
  );

  try {
    // Lấy tất cả ca làm active
    const workShifts = await WorkShift.find({ isActive: true }).populate(
      "employees"
    );
    if (!workShifts.length) {
      console.log("⚠️ Không có ca làm active nào.");
      return;
    }

    const { startOfDay, endOfDay } = getTodayRange();

    // Tạo shift cho từng nhân viên trong WorkShift.employees
    for (const ws of workShifts) {
      for (const employee of ws.employees) {
        await Shift.findOneAndUpdate(
          { userId: employee._id, date: { $gte: startOfDay, $lt: endOfDay } },
          {
            workShiftId: ws._id,
            status: "pending",
            startTime: null,
            endTime: null,
            date: startOfDay,
          },
          { upsert: true, new: true }
        );
      }
    }

    console.log(
      "✅ Shift hôm nay đã được tạo cho tất cả nhân viên trong WorkShift"
    );
  } catch (err) {
    console.error("❌ Lỗi cron test:", err.message);
  }
});

/**
 * Cron job chạy mỗi ngày lúc 23:59
 * - Đánh dấu absent cho các nhân viên chưa check-in
 */
cron.schedule("59 23 * * *", async () => {
  console.log("🌙 23:59 Cron job: Cập nhật absent cho shift chưa check-in...");

  const { startOfDay, endOfDay } = getTodayRange();

  try {
    const shifts = await Shift.find({
      date: { $gte: startOfDay, $lt: endOfDay },
      $or: [{ startTime: { $exists: false } }, { startTime: null }],
    });

    for (const shift of shifts) {
      shift.status = "absent";
      await shift.save();
    }

    console.log(
      `✅ ${shifts.length} shift chưa check-in đã được set thành absent`
    );
  } catch (err) {
    console.error("❌ Lỗi cron 23:59:", err.message);
  }
});
