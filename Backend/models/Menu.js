const mongoose = require("mongoose");
const { Schema } = mongoose;

const menuSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  items: [{ type: Schema.Types.ObjectId, ref: "Item" }],
  price: Number,
  isAvailable: { type: Boolean, default: true },
});

module.exports = mongoose.model("Menu", menuSchema);
