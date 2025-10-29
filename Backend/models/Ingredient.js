const mongoose = require("mongoose");
const { Schema } = mongoose;

const ingredientSchema = new Schema({
  name: String,
  unit: String,
  priceNow: Number, 
  stockQuantity: Number,
  minStock: { type: Number, default: 0 },
});

module.exports = mongoose.model("Ingredient", ingredientSchema);