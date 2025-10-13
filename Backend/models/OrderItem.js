const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  itemId: { type: Schema.Types.ObjectId, ref: "Item" },
  quantity: Number,
  assignedChef: { type: Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["pending", "preparing", "ready", "served"],
    default: "pending",
  },
  note: String,
});

module.exports = mongoose.model("OrderItem", orderItemSchema);
