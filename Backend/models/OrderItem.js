const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  itemId: { type: Schema.Types.ObjectId, ref: "Item" },
  itemName: String, // Lưu tên món để không cần populate
  itemType: String, // 'item' hoặc 'menu'
  quantity: Number,
  price: Number, // Giá tại thời điểm đặt món = price của item bán ra thị trường
  expense: Number, // Giá vốn tại thời điểm đặt món (tính từ giá thực tế FIFO - ingredientUsage)
  // Track chi tiết từng lô nguyên liệu đã dùng (FIFO - giá thực tế)
  ingredientUsage: [{
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
    ingredientId: { type: Schema.Types.ObjectId, ref: "Ingredient" },
    quantity: Number, // Số lượng nguyên liệu đã dùng từ lô này
    price: Number, // Giá mua ban đầu của lô (để tính expense chính xác)
    batchInfo: String // Thông tin lô (để trace)
  }],
  assignedChef: { type: Schema.Types.ObjectId, ref: "User" },
  servedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Nhân viên phục vụ món này
  status: {
    type: String,
    enum: ["pending", "preparing", "ready", "served", "cancelled"],
    default: "pending",
  },
  readyAt: Date, // Timestamp khi món chuyển sang "ready"
  note: String,
  // Mảng các món trong combo (chỉ có khi itemType === 'menu' và menu.type === 'combo')
  comboItems: [{
    itemId: { type: Schema.Types.ObjectId, ref: "Item" },
    itemName: String,
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "served", "cancelled"],
      default: "pending",
    },
    readyAt: Date, // Timestamp khi combo item chuyển sang "ready"
    assignedChef: { type: Schema.Types.ObjectId, ref: "User" },
    servedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Nhân viên phục vụ món combo này
  }],
});

module.exports = mongoose.model("OrderItem", orderItemSchema);