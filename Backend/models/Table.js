const mongoose = require("mongoose");
const { Schema } = mongoose;

const tableSchema = new Schema({
  tableNumber: Number,
  qrCode: String,
  status: {
    type: String,
    enum: ["available", "occupied"],
    default: "available",
  },
  // Cho phép 1 bàn có nhiều order cùng lúc (VD: chia order, nhiều khách)
  orderNow: [
    {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
});

module.exports = mongoose.model("Table", tableSchema);