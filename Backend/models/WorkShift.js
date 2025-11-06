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
