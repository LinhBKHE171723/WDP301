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
 * Cron job chạy mỗi 40 phút
 * - Tạo shift cho tất cả nhân viên theo ca làm
 * - CHỈ tạo shift mới nếu chưa có hoặc chưa check-in
 * - KHÔNG reset shift đã check-in (giữ nguyên startTime, endTime, status)
 */
cron.schedule("*/40 * * * *", async () => {
  console.log(
    "⏱ Cron job (mỗi 40 phút): Tạo shift mới cho nhân viên trong WorkShift..."
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

    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    // Tạo shift cho từng nhân viên trong WorkShift.employees
    for (const ws of workShifts) {
      for (const employee of ws.employees) {
        try {
          // ✅ Kiểm tra shift đã tồn tại chưa
          const existingShift = await Shift.findOne({
            userId: employee._id,
            date: { $gte: startOfDay, $lt: endOfDay }
          });

          if (!existingShift) {
            // Chưa có shift → tạo mới
            await Shift.create({
              userId: employee._id,
              workShiftId: ws._id,
              date: startOfDay,
              status: "pending",
              startTime: null,
              endTime: null,
            });
            createdCount++;
            console.log(`✅ Đã tạo shift mới cho ${employee.name || employee._id || employee.email}`);
          } else if (!existingShift.startTime) {
            // Có shift nhưng chưa check-in → chỉ update workShiftId nếu khác
            if (!existingShift.workShiftId || existingShift.workShiftId.toString() !== ws._id.toString()) {
              existingShift.workShiftId = ws._id;
              await existingShift.save();
              updatedCount++;
              console.log(`✅ Đã cập nhật workShiftId cho shift của ${employee.name || employee._id || employee.email}`);
            } else {
              skippedCount++;
            }
            // KHÔNG reset status, startTime, endTime vì shift đã tồn tại
          } else {
            // Đã check-in → KHÔNG làm gì cả (giữ nguyên shift hiện tại)
            skippedCount++;
            console.log(`⏭️ Bỏ qua shift của ${employee.name || employee._id || employee.email} (đã check-in lúc ${existingShift.startTime})`);
          }
        } catch (err) {
          console.error(`❌ Lỗi khi xử lý shift cho ${employee._id}:`, err.message);
        }
      }
    }

    console.log(
      `✅ Cron job hoàn thành: Tạo ${createdCount} shift mới, cập nhật ${updatedCount} shift, bỏ qua ${skippedCount} shift đã check-in`
    );
  } catch (err) {
    console.error("❌ Lỗi cron (40 phút):", err.message);
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
