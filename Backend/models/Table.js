const mongoose = require("mongoose");
const { Schema } = mongoose;

const tableSchema = new Schema({
  tableNumber: Number,
  qrCode: String,
  status: {
    type: String,
    enum: ["available", "occupied", "reserved"],
    default: "available",
  },
  orders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
});

module.exports = mongoose.model("Table", tableSchema);
