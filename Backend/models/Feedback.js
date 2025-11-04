const mongoose = require("mongoose");
const { Schema } = mongoose;

const feedbackSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    waiterRating: { type: Number, min: 1, max: 5 }, // Đánh giá riêng cho waiter (tùy chọn)
    chefRating: { type: Number, min: 1, max: 5 }, // Đánh giá riêng cho chef (tùy chọn)
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
