const mongoose = require("mongoose");
const { Schema } = mongoose;

const purchaseOrderSchema = new Schema(
  {
    ingredientId: { type: Schema.Types.ObjectId, ref: "Ingredient" },
    quantity: Number,
    unit: String,
    price: Number,
    time: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
