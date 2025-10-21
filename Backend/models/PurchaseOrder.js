const mongoose = require("mongoose");
const { Schema } = mongoose;

const purchaseOrderSchema = new Schema({
  ingredientId: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true }, 
  quantity: { type: Number, required: true }, 
  unit: { type: String, required: true },
  price: { type: Number, required: true }, 

  time: { type: Date, default: Date.now },

  expiryDate: { type: Date, required: true }, 

  status: { 
    type: String,
    enum: ["valid", "expired"],
    default: "valid",
  },
});

purchaseOrderSchema.pre("save", function (next) {
  if (this.expiryDate && this.expiryDate < new Date()) {
    this.status = "expired";
  } else {
    this.status = "valid";
  }
  next();
});

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
