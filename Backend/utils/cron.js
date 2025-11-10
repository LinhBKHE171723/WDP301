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
 * - Reset status tất cả nhân viên
 * - Tạo shift cho tất cả nhân viên theo ca làm
 */
cron.schedule("*/1 * * * *", async () => {
  console.log("⏱ Cron job test: Reset employee status + tạo shift mới...");

  try {
    // 1️⃣ Reset status tất cả nhân viên
    await User.updateMany(
      { role: { $in: ["waiter", "chef", "cashier", "kitchen_manager"] } },
      { status: "inactive" }
    );

    // 2️⃣ Lấy tất cả ca làm active
    const workShifts = await WorkShift.find({ isActive: true }).populate("employees");
    if (!workShifts.length) {
      console.log("⚠️ Không có ca làm active nào.");
      return;
    }

    const { startOfDay, endOfDay } = getTodayRange();

    // 3️⃣ Tạo shift cho từng nhân viên
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

    console.log("✅ Shift hôm nay đã được tạo cho tất cả nhân viên");
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

    console.log(`✅ ${shifts.length} shift chưa check-in đã được set thành absent`);
  } catch (err) {
    console.error("❌ Lỗi cron 23:59:", err.message);
  }
});
