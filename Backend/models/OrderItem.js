const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  itemId: { type: Schema.Types.ObjectId, ref: "Item" },
  itemName: String, // Lưu tên món để không cần populate
  itemType: String, // 'item' hoặc 'menu'
  quantity: Number,
  price: Number, // Giá tại thời điểm đặt món
  assignedChef: { type: Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["pending", "preparing", "ready", "served"],
    default: "pending",
  },
  note: String,
});

module.exports = mongoose.model("OrderItem", orderItemSchema);
