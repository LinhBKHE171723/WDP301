const mongoose = require("mongoose");
const { Schema } = mongoose;

const ingredientSchema = new Schema({
  name: String,
  unit: String,
  priceNow: Number, // (giá hiện tại sau khi nhập hàng = priceNow x stockQuantity + tổng giá mới nhập ở purchase order) / (stockQuantity + số lượng mới nhập ở purchase order)
  stockQuantity: Number,
  minStock: { type: Number, default: 0 },
});

module.exports = mongoose.model("Ingredient", ingredientSchema);