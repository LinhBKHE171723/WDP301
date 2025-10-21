const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" }, 
    servedBy: { type: Schema.Types.ObjectId, ref: "User" }, 
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
