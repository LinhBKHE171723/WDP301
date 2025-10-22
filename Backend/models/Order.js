const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" }, // khách hàng
    servedBy: { type: Schema.Types.ObjectId, ref: "User" }, // nhân viên phục vụ
    tableId: { type: Schema.Types.ObjectId, ref: "Table" },
    orderItems: [{ type: Schema.Types.ObjectId, ref: "OrderItem" }],
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "served",
        "paid",
        "cancelled",
      ],
      default: "pending",
    },
    totalAmount: Number,
    discount: Number,
    servedAt: Date,
    waiterResponse: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
      },
      reason: String,
      respondedAt: Date
    },
    customerConfirmed: {
      type: Boolean,
      default: false
    },
    confirmationHistory: [{
      action: String, 
      timestamp: Date,
      details: String
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);