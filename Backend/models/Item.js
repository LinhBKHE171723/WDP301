const mongoose = require("mongoose");
const { Schema } = mongoose;

const itemSchema = new Schema({
  name: String,
  description: String,
  category: String,
  price: Number,
  isAvailable: { type: Boolean, default: true },
  ingredients: [{ type: Schema.Types.ObjectId, ref: "Ingredient" }],
  image: String,
});

module.exports = mongoose.model("Item", itemSchema);
