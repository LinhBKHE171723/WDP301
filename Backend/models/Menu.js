const mongoose = require("mongoose");
const { Schema } = mongoose;

const menuSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  items: [{ type: Schema.Types.ObjectId, ref: "Item" }],
  price: Number,
  type: {
    type: String,
    enum: ["single", "combo"],
    default: "single",
  },
  isAvailable: { type: Boolean, default: true },
  image: String,
});

module.exports = mongoose.model("Menu", menuSchema);
