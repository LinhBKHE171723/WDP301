const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workShiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkShift", // liên kết tới ca cố định
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },

    startTime: Date, // thời điểm check-in thực tế
    endTime: Date,   // thời điểm check-out thực tế

    lateMinutes: { type: Number, default: 0 },
    earlyLeaveMinutes: { type: Number, default: 0 },
    totalWorkedMinutes: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pending", "checked_in", "checked_out", "late", "early_leave", "absent"],
      default: "pending",
    },

    note: { type: String, default: "" },
  },
  { timestamps: true }
);

//
// 🧠 Middleware tự động tính toán và xác định trạng thái
//
shiftSchema.pre("save", async function (next) {
  try {
    const shift = this;
    // Lấy thông tin ca làm chuẩn từ WorkShift
    const WorkShift = mongoose.model("WorkShift");
    const ws = await WorkShift.findById(shift.workShiftId);

    if (!ws) return next(new Error("WorkShift not found"));

    // Convert "08:00" -> Date để so sánh
    const scheduledStart = new Date(shift.date);
    const [sh, sm] = ws.startTime.split(":").map(Number);
    scheduledStart.setHours(sh, sm, 0, 0);

    const scheduledEnd = new Date(shift.date);
    const [eh, em] = ws.endTime.split(":").map(Number);
    scheduledEnd.setHours(eh, em, 0, 0);

    // ✅ Tính tổng thời gian làm việc nếu có cả start & end
    if (shift.startTime && shift.endTime) {
      const diffMs = shift.endTime - shift.startTime;
      shift.totalWorkedMinutes = Math.round(diffMs / 60000);
    }

    // ✅ Tính đi trễ
    if (shift.startTime) {
      const diff = (shift.startTime - scheduledStart) / 60000;
      shift.lateMinutes = diff > 0 ? Math.round(diff) : 0;
    }

    // ✅ Tính về sớm
    if (shift.endTime) {
      const diff = (scheduledEnd - shift.endTime) / 60000;
      shift.earlyLeaveMinutes = diff > 0 ? Math.round(diff) : 0;
    }

    // ✅ Xác định trạng thái tổng
    if (!shift.startTime && !shift.endTime) {
      shift.status = "pending";
    } else if (shift.startTime && !shift.endTime) {
      shift.status = shift.lateMinutes > 0 ? "late" : "checked_in";
    } else if (shift.startTime && shift.endTime) {
      if (shift.earlyLeaveMinutes > 0) {
        shift.status = "early_leave";
      } else {
        shift.status = "checked_out";
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Shift", shiftSchema);
