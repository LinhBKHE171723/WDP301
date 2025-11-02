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
  expiryDate: { type: Date }, // Ngày hết hạn của lô nhập
  usedQuantity: { type: Number, default: 0 }, // Số lượng đã sử dụng từ lô này
  status: {
    type: String,
    enum: ["valid", "expired"],
    default: "valid",
  }, // Trạng thái: valid (còn hạn) hoặc expired (đã hết hạn)
  note: { type: String, default: "" },
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

    // ✅ Ép kiểu an toàn để tránh NaN
    const oldPrice = Number(ingredient.priceNow) || 0;
    const oldQty = Number(ingredient.stockQuantity) || 0;
    const newPrice = Number(doc.price) || 0;
    const newQty = Number(doc.quantity) || 0;

    // ✅ Tính tổng giá trị kho cũ + mới
    const totalStockValue = oldPrice * oldQty + newPrice * newQty;
    const totalStockQty = oldQty + newQty;

    // ✅ Tính giá trung bình có kiểm tra an toàn
    ingredient.priceNow =
      totalStockQty > 0 ? totalStockValue / totalStockQty : newPrice;
    ingredient.stockQuantity = totalStockQty;

    await ingredient.save();

    console.log(
      `📦 Đã cập nhật Ingredient "${ingredient.name}": ` +
        `priceNow = ${ingredient.priceNow.toFixed(2)}, ` +
        `stockQuantity = ${ingredient.stockQuantity}`
    );

    next();
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật Ingredient sau khi nhập hàng:", error);
    next(error);
  }
});

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
