const cron = require("node-cron");
const mongoose = require("mongoose");
const User = require("../models/User");
const WorkShift = require("../models/WorkShift");
const Shift = require("../models/Shift");

// Tự động chạy cron job mỗi ngày lúc 00:00 (nửa đêm)
/**
 * Vị trí   Giá trị     Ý nghĩa
Minute      0               phút thứ 0
Hour        0               giờ thứ 0
Day of month    *       mọi ngày trong tháng
Month       *            tháng
Day of week *           mọi ngày trong tuần
 */
/**
 * Cron job chạy mỗi ngày lúc 00:00 (nửa đêm)
 * - Reset trạng thái tất cả nhân viên thành "inactive"
 * - Tạo shift cho tất cả nhân viên theo ca làm
 */
cron.schedule("0 0 * * *", async () => {
    console.log("🌅 00:00 Cron job: Reset employee status và tạo shift mới...");

    try {
        // 1️⃣ Reset status tất cả nhân viên (chỉ staff, không reset customer)
        await User.updateMany(
            { role: { $in: ["waiter", "chef", "cashier", "kitchen_manager"] } },
            { status: "inactive" }
        );
        console.log("✅ Đã reset status tất cả nhân viên thành inactive");

        // 2️⃣ Lấy tất cả ca làm đang active
        const workShifts = await WorkShift.find({ isActive: true }).populate("employees");
        if (!workShifts.length) {
            console.log("⚠️ Không có ca làm active nào.");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // reset giờ để so sánh theo ngày

        // 3️⃣ Tạo shift cho từng nhân viên theo ca làm
        for (const ws of workShifts) {
            for (const employee of ws.employees) {
                await Shift.findOneAndUpdate(
                    { userId: employee._id, date: today },
                    { workShiftId: ws._id },
                    { upsert: true, new: true }
                );
            }
        }

        console.log("✅ Shift hôm nay đã được tạo cho tất cả nhân viên");

    } catch (err) {
        console.error("❌ Lỗi cron 00:00:", err.message);
    }
});

/**
 * Cron job chạy mỗi ngày lúc 23:59
 * - Tự động đánh dấu absent cho nhân viên chưa check-in
 */
cron.schedule("59 23 * * *", async () => {
    console.log("🌙 23:59 Cron job: Cập nhật trạng thái absent cho shift chưa check-in...");

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const shifts = await Shift.find({ 
            date: today,
            startTime: { $exists: false } // chưa check-in
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