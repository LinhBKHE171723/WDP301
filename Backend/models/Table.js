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
  orderNow: { type: Schema.Types.ObjectId, ref: "Order", default: null },
});

module.exports = mongoose.model("Table", tableSchema);
