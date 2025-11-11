const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" }, // khách hàng
    tableId: { type: Schema.Types.ObjectId, ref: "Table" }, // Giữ lại để backward compatibility (sẽ = tableIds[0])
    tableIds: [{ type: Schema.Types.ObjectId, ref: "Table" }], // Mảng các bàn (hỗ trợ nhiều bàn cho 1 order)
    orderItems: [{ type: Schema.Types.ObjectId, ref: "OrderItem" }],
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" }, // Giữ lại để backward compatibility
    paymentIds: [{ type: Schema.Types.ObjectId, ref: "Payment" }], // Mảng nhiều payments (tiền cọc + thanh toán)
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
    preorderName: String, // Tên khách hàng lúc đặt preorder (có thể khác với tên trong User)
    preparationStartTime: Date, // Thời gian bắt đầu chuẩn bị (admin nhập khi approve)
    reservedEndTime: Date, // Thời gian kết thúc dành bàn (admin nhập khi approve)
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
    }],
    adminNotes: [{
      note: String,
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

// Middleware: Tự động sync tableId = tableIds[0] để backward compatibility
orderSchema.pre('save', function(next) {
  // Nếu có tableIds và tableIds.length > 0, sync tableId = tableIds[0]
  if (this.tableIds && this.tableIds.length > 0) {
    // Chỉ update nếu tableId khác với tableIds[0]
    if (!this.tableId || this.tableId.toString() !== this.tableIds[0].toString()) {
      this.tableId = this.tableIds[0];
    }
  } else if (this.tableId && (!this.tableIds || this.tableIds.length === 0)) {
    // Nếu có tableId nhưng không có tableIds, tạo tableIds từ tableId
    this.tableIds = [this.tableId];
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);