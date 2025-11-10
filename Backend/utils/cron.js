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
* Cron job 00:10
* - Reset tất cả nhân viên thành inactive
* - Tạo shift cho từng nhân viên theo ca làm
* - Atomic: dùng transaction
*/
ccron.schedule("0 10 * * *", async () => {
    console.log("🌅 00:10 Cron job: Reset employee status + tạo shift...");

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Reset status nhân viên
        await User.updateMany(
            { role: { $in: ["waiter", "chef", "cashier", "kitchen_manager"] } },
            { status: "inactive" },
            { session }
        );

        // Lấy ca làm active
        const workShifts = await WorkShift.find({ isActive: true }).populate("employees").session(session);
        if (!workShifts.length) {
            console.log("⚠️ Không có ca làm active nào.");
            await session.commitTransaction();
            session.endSession();
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Tạo shift cho từng nhân viên
        for (const ws of workShifts) {
            for (const employee of ws.employees) {
                await Shift.findOneAndUpdate(
                    { userId: employee._id, date: { $gte: today, $lt: tomorrow } },
                    { workShiftId: ws._id, status: "pending", startTime: null, endTime: null, date: today },
                    { upsert: true, new: true, session }
                );
            }
        }

        await session.commitTransaction();
        console.log("✅ Shift hôm nay đã được tạo cho tất cả nhân viên (transaction OK)");
    } catch (err) {
        await session.abortTransaction();
        console.error("❌ Lỗi cron 00:10:", err.message);
    } finally {
        session.endSession();
    }
});


/**
 * Cron job 23:59
 * - Đánh dấu absent cho nhân viên chưa check-in
 * - Không cần reset user.status
 */
cron.schedule("59 23 * * *", async () => {
    console.log("🌙 23:59 Cron job: Cập nhật absent cho các shift chưa check-in...");

    // Lấy ngày hôm nay, reset giờ về 00:00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Lấy ngày mai để dùng trong điều kiện tìm kiếm
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    try {
        // Tìm tất cả shift hôm nay mà nhân viên chưa check-in
        // Điều kiện:
        // - date >= today và date < tomorrow => ca làm hôm nay
        // - startTime không tồn tại hoặc null => chưa check-in
        const shifts = await Shift.find({
            date: { $gte: today, $lt: tomorrow },
            $or: [{ startTime: { $exists: false } }, { startTime: null }]
        });

        // Duyệt từng shift và đặt trạng thái là "absent"
        for (const shift of shifts) {
            shift.status = "absent";
            await shift.save(); // lưu lại thay đổi
        }

        console.log(`✅ ${shifts.length} shift chưa check-in đã được set thành absent`);
    } catch (err) {
        console.error("❌ Lỗi cron 23:59:", err.message);
    }
});