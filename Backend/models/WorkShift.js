const mongoose = require("mongoose");
const { Schema } = mongoose;

const workShiftSchema = new Schema(
  {
    name: {
      type: String, // "Ca sáng", "Ca tối"
      required: true,
      unique: true,
      trim: true,
    },
    startTime: {
      type: String, // "08:00"
      required: true,
    },
    endTime: {
      type: String, // "17:00"
      required: true,
    },
    daysOfWeek: {
      type: [Number], // [1, 2, 3, 4, 5] = Thứ 2 đến Thứ 6
      default: [0, 1, 2, 3, 4, 5, 6], // Mặc định: cả tuần
      validate: {
        validator: function(v) {
          return Array.isArray(v) && v.length > 0 && v.every(day => day >= 0 && day <= 6);
        },
        message: "daysOfWeek phải là mảng các số từ 0-6 (0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7)"
      }
    },
    employees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorkShift", workShiftSchema);
