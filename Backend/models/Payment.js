const mongoose = require("mongoose");
const { Schema } = mongoose;

const paymentSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  payTime: Date,
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "momo", "zaloPay"],
    default: "cash",
  },
  status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
  amountPaid: Number,
  cashierId: { type: Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("Payment", paymentSchema);
