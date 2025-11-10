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

// ✅ Sau khi lưu PurchaseOrder → cập nhật lại stockQuantity của Ingredient
purchaseOrderSchema.post("save", async function (doc, next) {
  try {
    const Ingredient = mongoose.model("Ingredient");
    const ingredient = await Ingredient.findById(doc.ingredientId);

    if (!ingredient) {
      console.warn(`⚠️ Không tìm thấy ingredient có id ${doc.ingredientId}`);
      return next();
    }

    // ✅ Cập nhật stockQuantity (giá thực tế được track qua PurchaseOrder.price)
    const oldQty = Number(ingredient.stockQuantity) || 0;
    const newQty = Number(doc.quantity) || 0;
    const totalStockQty = oldQty + newQty;

    ingredient.stockQuantity = totalStockQty;
    await ingredient.save();

    console.log(
      `📦 Đã cập nhật Ingredient "${ingredient.name}": ` +
        `stockQuantity = ${ingredient.stockQuantity} (giá nhập: ${doc.price.toLocaleString('vi-VN')}đ/${doc.unit})`
    );

    next();
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật Ingredient sau khi nhập hàng:", error);
    next(error);
  }
});

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
