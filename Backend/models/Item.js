const mongoose = require("mongoose");
const { Schema } = mongoose;

const itemSchema = new Schema({
  name: String,
  description: String,
  category: String,
  price: Number, // giá bán ra ngoài thị trường tự set
  expense: Number, // giá vốn (bằng tổng giá ingredients ở dưới)
  isAvailable: { type: Boolean, default: true },
  ingredients: [
    {
      ingredient: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
      quantity: { type: Number, required: true },
    },
  ],
  image: String,
});

// 🔹 Tự động tính expense trước khi lưu
itemSchema.pre("save", async function (next) {
  try {
    const Ingredient = mongoose.model("Ingredient");
    let total = 0;

    for (const ing of this.ingredients) {
      const ingDoc = await Ingredient.findById(ing.ingredient);
      if (ingDoc) total += ingDoc.priceNow * ing.quantity;
    }

    this.expense = total;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Item", itemSchema);
