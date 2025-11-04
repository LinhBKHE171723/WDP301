const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" }, // khách hàng
    tableId: { type: Schema.Types.ObjectId, ref: "Table" },
    orderItems: [{ type: Schema.Types.ObjectId, ref: "OrderItem" }],
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    status: {
      type: String,
      enum: [
        "pending",
        "preorder",
        "confirmed",
        "preparing",
        "served",
        "paid",
        "cancelled",
      ],
      default: "pending",
    },
    totalAmount: Number,
    discount: Number,
    servedAt: Date,
    scheduledTime: Date, // Thời gian khách muốn đến ăn (cho đặt trước)
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
      action: String, // 'waiter_approved', 'waiter_rejected', 'customer_confirmed', 'order_modified'
      timestamp: Date,
      details: String
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);