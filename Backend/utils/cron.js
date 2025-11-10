const cron = require("node-cron");
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
cron.schedule("*/3 * * * *", async () => {
    console.log("🌅 Creating daily shift records...");

    // Lấy tất cả ca làm việc đang hoạt động (isActive = true)
    const workShifts = await WorkShift.find({ isActive: true }).populate("employees");
    if (workShifts.length === 0) {
        console.log("⚠️ No active work shifts found.");
        return;
    }
    // Duyệt qua từng ca làm việc (ví dụ: Ca sáng, Ca tối)
    for (const ws of workShifts) {
        // Lấy ngày hiện tại, set giờ về 00:00:00 để đồng nhất (so sánh theo ngày) 
        const today = new Date();
        today.setHours(0, 0, 0, 0); // tránh duplicate ngày nhưng giờ khác nhau

        // Duyệt qua từng nhân viên trong ca làm việc này
        for (const user of ws.employees) {
            // Kiểm tra xem nhân viên này đã có record Shift cho ngày hôm nay chưa
            // Nếu chưa -> tạo mới
            // Nếu đã có -> cập nhật workShiftId (phòng khi thay đổi ca)
            await Shift.findOneAndUpdate(
                { userId: user._id, date: today }, // điều kiện tìm (1 user - 1 ngày duy nhất)
                { workShiftId: ws._id },           // dữ liệu cập nhật
                { upsert: true, new: true }        // upsert = true => tạo mới nếu chưa có
            );
        }
    }

    console.log("✅ Daily shift records created successfully!");
});
