/**
 * Script tạo shift cho nhân viên theo ca làm
 * 
 * Script này tạo shift giống như cron job nhưng có thể chạy thủ công để test
 * 
 * Cách sử dụng:
 * 
 * Từ thư mục gốc của project:
 *   node Backend/scripts/createShifts.js
 * 
 * Hoặc từ thư mục Backend:
 *   node scripts/createShifts.js
 * 
 * Hoặc với date cụ thể (YYYY-MM-DD):
 *   node Backend/scripts/createShifts.js 2024-12-25
 *   node scripts/createShifts.js 2024-12-25
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const User = require("../models/User");
const WorkShift = require("../models/WorkShift");
const Shift = require("../models/Shift");

/**
 * Helper: Lấy mốc thời gian đầu và cuối ngày
 * @param {Date} date - Ngày cần tạo shift (mặc định là hôm nay)
 */
const getDayRange = (date = null) => {
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0); // 00:00:00
  const nextDay = new Date(targetDate);
  nextDay.setDate(targetDate.getDate() + 1); // ngày mai
  return { startOfDay: targetDate, endOfDay: nextDay };
};

async function createShifts() {
  try {
    // Lấy date từ command line argument (nếu có)
    const dateArg = process.argv[2];
    let targetDate = null;
    
    if (dateArg) {
      targetDate = new Date(dateArg);
      if (isNaN(targetDate.getTime())) {
        console.error("❌ Ngày không hợp lệ. Sử dụng format: YYYY-MM-DD");
        process.exit(1);
      }
      console.log(`📅 Tạo shift cho ngày: ${targetDate.toLocaleDateString('vi-VN')}`);
    } else {
      console.log(`📅 Tạo shift cho ngày hôm nay: ${new Date().toLocaleDateString('vi-VN')}`);
    }

    // Kết nối database
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant";
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Đã kết nối database");
    console.log("🔄 Bắt đầu tạo shift cho nhân viên...\n");

    // Lấy tất cả ca làm active
    const workShifts = await WorkShift.find({ isActive: true }).populate(
      "employees"
    );
    
    if (!workShifts.length) {
      console.log("⚠️ Không có ca làm active nào.");
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 Tìm thấy ${workShifts.length} ca làm active:\n`);
    workShifts.forEach((ws, index) => {
      console.log(`  ${index + 1}. ${ws.name} (${ws.startTime} - ${ws.endTime}) - ${ws.employees.length} nhân viên`);
    });
    console.log("");

    const { startOfDay, endOfDay } = getDayRange(targetDate);

    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Tạo shift cho từng nhân viên trong WorkShift.employees
    for (const ws of workShifts) {
      console.log(`\n📦 Xử lý ca làm: ${ws.name}`);
      console.log(`   └─ ${ws.employees.length} nhân viên`);
      
      for (const employee of ws.employees) {
        try {
          // ✅ Kiểm tra shift đã tồn tại chưa
          const existingShift = await Shift.findOne({
            userId: employee._id,
            date: { $gte: startOfDay, $lt: endOfDay }
          });

          const employeeName = employee.name || employee.email || employee._id.toString();

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
            console.log(`   ✅ Đã tạo shift mới cho ${employeeName}`);
          } else if (!existingShift.startTime) {
            // Có shift nhưng chưa check-in → chỉ update workShiftId nếu khác
            if (!existingShift.workShiftId || existingShift.workShiftId.toString() !== ws._id.toString()) {
              existingShift.workShiftId = ws._id;
              await existingShift.save();
              updatedCount++;
              console.log(`   🔄 Đã cập nhật workShiftId cho shift của ${employeeName}`);
            } else {
              skippedCount++;
              console.log(`   ⏭️ Bỏ qua ${employeeName} (shift đã tồn tại, chưa check-in)`);
            }
            // KHÔNG reset status, startTime, endTime vì shift đã tồn tại
          } else {
            // Đã check-in → KHÔNG làm gì cả (giữ nguyên shift hiện tại)
            skippedCount++;
            const checkInTime = new Date(existingShift.startTime).toLocaleTimeString('vi-VN');
            console.log(`   ⏭️ Bỏ qua ${employeeName} (đã check-in lúc ${checkInTime})`);
          }
        } catch (err) {
          errorCount++;
          const employeeName = employee.name || employee.email || employee._id.toString();
          console.error(`   ❌ Lỗi khi xử lý shift cho ${employeeName}:`, err.message);
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 TÓM TẮT:");
    console.log(`   ✅ Tạo mới: ${createdCount} shift`);
    console.log(`   🔄 Cập nhật: ${updatedCount} shift`);
    console.log(`   ⏭️ Bỏ qua: ${skippedCount} shift`);
    if (errorCount > 0) {
      console.log(`   ❌ Lỗi: ${errorCount} shift`);
    }
    console.log("=".repeat(60));

    await mongoose.disconnect();
    console.log("\n✅ Hoàn thành! Đã ngắt kết nối database.");
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Chạy script
createShifts();

