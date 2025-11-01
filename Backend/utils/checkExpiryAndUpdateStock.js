// 📦 src/utils/checkExpiryAndUpdateStock.js

const Ingredient = require("../models/Ingredient");
const PurchaseOrder = require("../models/PurchaseOrder");

/**
 * ✅ Hàm tự động kiểm tra đơn nhập hết hạn
 * - Tìm các PurchaseOrder hết hạn (expiryDate < hôm nay)
 * - Trừ phần tồn kho chưa sử dụng (quantity - usedQuantity)
 * - Đánh dấu status = "expired"
 */
async function checkExpiryAndUpdateStock() {
  const now = new Date();

  // Tìm tất cả đơn nhập đã hết hạn nhưng chưa đánh dấu expired
  const expiredOrders = await PurchaseOrder.find({
    expiryDate: { $lt: now },
    status: "valid",
  });

  for (const po of expiredOrders) {
    const remaining = Math.max(po.quantity - po.usedQuantity, 0);

    if (remaining > 0) {
      const ing = await Ingredient.findById(po.ingredientId);
      if (ing) {
        // 🔹 Trừ đúng phần còn tồn (chưa sử dụng)
        ing.stockQuantity = Math.max(ing.stockQuantity - remaining, 0);
        await ing.save();
        console.log(
          `⚠️ ${ing.name}: Hết hạn (ngày ${po.expiryDate.toLocaleDateString()}) → trừ ${remaining} ${po.unit}`
        );
      }
    }

    // 🔸 Đánh dấu đã hết hạn
    po.status = "expired";
    await po.save();
  }

  console.log(`✅ Đã cập nhật ${expiredOrders.length} đơn hết hạn.`);
}

module.exports = { checkExpiryAndUpdateStock };
