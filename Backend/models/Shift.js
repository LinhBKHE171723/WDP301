const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Liên kết tới model User
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date, // có thể là Date nếu lưu timestamp check-in
    },
    endTime: {
      type: Date, // có thể là Date nếu lưu timestamp check-out
    },

    duration: {
      type: Number, // phút hoặc giờ
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "checked_in", "checked_out"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Middleware: tính duration khi checkout
shiftSchema.pre("save", function (next) {
  if (this.startTime && this.endTime) {
    const diffMs = this.endTime - this.startTime;
    this.duration = Math.round(diffMs / (1000 * 60)); // phút
  }
  next();
});

module.exports = mongoose.model("Shift", shiftSchema);
