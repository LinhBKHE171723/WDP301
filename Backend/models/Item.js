const mongoose = require("mongoose");
const { Schema } = mongoose;

const itemSchema = new Schema({
  name: String,
  description: String,
  category: String,
  price: Number, // giá bán ra ngoài thị trường tự set
  isAvailable: { type: Boolean, default: true },
  ingredients: [
    {
      ingredient: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
      quantity: { type: Number, required: true },
    },
  ],
  image: String,
});

module.exports = mongoose.model("Item", itemSchema);
