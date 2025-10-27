const mongoose = require("mongoose");
const { Schema } = mongoose;

const purchaseOrderSchema = new Schema({
  ingredientId: {
    type: Schema.Types.ObjectId,
    ref: "Ingredient",
    required: true,
  },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  price: { type: Number, required: true },

  time: { type: Date, default: Date.now },
});

// ✅ Sau khi lưu PurchaseOrder → cập nhật lại Ingredient
purchaseOrderSchema.post("save", async function (doc, next) {
  try {
    const Ingredient = mongoose.model("Ingredient");
    const ingredient = await Ingredient.findById(doc.ingredientId);

    if (!ingredient) {
      console.warn(`⚠️ Không tìm thấy ingredient có id ${doc.ingredientId}`);
      return next();
    }

    // Ở đây doc.price là giá đơn vị (VNĐ / 1 đơn vị hàng)
    // => Không cần chia cho quantity nữa
    const newUnitPrice = doc.price;

    // Tổng giá trị kho cũ + tổng giá trị lô mới
    const totalStockValue =
      ingredient.priceNow * ingredient.stockQuantity +
      newUnitPrice * doc.quantity;

    // Tổng số lượng mới
    const totalStockQty = ingredient.stockQuantity + doc.quantity;

    // Cập nhật giá trung bình mới
    ingredient.priceNow =
      totalStockQty > 0 ? totalStockValue / totalStockQty : newUnitPrice;
    ingredient.stockQuantity = totalStockQty;

    await ingredient.save();

    console.log(
      `📦 Đã cập nhật Ingredient "${
        ingredient.name
      }": priceNow = ${ingredient.priceNow.toFixed(2)}, stockQuantity = ${
        ingredient.stockQuantity
      }`
    );

    next();
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật Ingredient sau khi nhập hàng:", error);
    next(error);
  }
});

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
