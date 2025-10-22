const mongoose = require("mongoose");
const { Schema } = mongoose;

const purchaseOrderSchema = new Schema({
  ingredientId: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true }, 
  quantity: { type: Number, required: true }, 
  unit: { type: String, required: true },
  price: { type: Number, required: true }, 

  time: { type: Date, default: Date.now },

  expiryDate: { type: Date, required: true },
   
  usedQuantity: { type: Number, default: 0 }, 

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

purchaseOrderSchema.post("save", async function (doc, next) {
  try {
    const Ingredient = mongoose.model("Ingredient");
    const ingredient = await Ingredient.findById(doc.ingredientId);

    if (!ingredient) {
      console.warn(`⚠️ Không tìm thấy ingredient có id ${doc.ingredientId}`);
      return next();
    }

 
    const newUnitPrice = doc.price / doc.quantity;

    // 🔸 Công thức cập nhật trung bình có trọng số:
    // priceNow = (priceNow * stockQuantity + newUnitPrice * quantity) / (stockQuantity + quantity)
    const totalStockValue =
      ingredient.priceNow * ingredient.stockQuantity +
      newUnitPrice * doc.quantity;
    const totalStockQty = ingredient.stockQuantity + doc.quantity;

    ingredient.priceNow = totalStockValue / totalStockQty;
    ingredient.stockQuantity = totalStockQty;

    await ingredient.save();

    console.log(
      `📦 Đã cập nhật Ingredient "${ingredient.name}": priceNow = ${ingredient.priceNow.toFixed(
        2
      )}, stockQuantity = ${ingredient.stockQuantity}`
    );

    next();
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật Ingredient sau khi nhập hàng:", error);
    next(error);
  }
});

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);