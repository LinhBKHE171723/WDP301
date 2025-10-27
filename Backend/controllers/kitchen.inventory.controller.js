const Ingredient = require("../models/Ingredient");
const PurchaseOrder = require("../models/PurchaseOrder");

// ✅ Lấy danh sách toàn bộ nguyên liệu
exports.getAllIngredients = async (req, res) => {
  try {
    const ingredients = await Ingredient.find();
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi tải danh sách nguyên liệu." });
  }
};
// ✅ Tạo đơn nhập kho
exports.createPurchaseOrder = async (req, res) => {
  try {
    let { ingredientId, quantity, unit, price, supplier, note } = req.body;

    if (!ingredientId || !quantity || quantity <= 0) {
      return res.status(400).json({
        message: "Thiếu thông tin ingredientId hoặc quantity không hợp lệ.",
      });
    }

    quantity = Number(quantity);
    price = Number(price) || 0;

    // Lấy nguyên liệu hiện tại
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) {
      return res.status(404).json({ message: "Không tìm thấy nguyên liệu." });
    }

    // ✅ Tạo đơn nhập hàng
    const order = await PurchaseOrder.create({
      ingredientId,
      quantity,
      unit,
      price,
      supplier: supplier || "Nhập trực tiếp",
      note: note || "",
    });

    // ✅ Tính giá trung bình mới (Weighted Average)
    const totalOld = ingredient.stockQuantity * (ingredient.priceNow || 0);
    const totalNew = quantity * price;
    const newStock = ingredient.stockQuantity + quantity;
    const newAvgPrice = newStock > 0 ? (totalOld + totalNew) / newStock : price;

    res.status(201).json({
      message: "✅ Nhập hàng thành công!",
      order,
    });
  } catch (err) {
    console.error("❌ Lỗi tạo đơn nhập kho:", err);
    res
      .status(500)
      .json({ message: err.message || "Không thể tạo đơn nhập kho." });
  }
};

// ✅ Cập nhật số lượng tồn thủ công
exports.updateStock = async (req, res) => {
  try {
    const { ingredientId } = req.params;
    const { stockQuantity } = req.body;
    const updated = await Ingredient.findByIdAndUpdate(
      ingredientId,
      { stockQuantity },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi cập nhật tồn kho." });
  }
};

// ✅ Xem chi tiết lịch sử nhập hàng
exports.getPurchaseHistory = async (req, res) => {
  try {
    const list = await PurchaseOrder.find().populate("ingredientId");
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi tải lịch sử nhập kho." });
  }
};
// ✅ Tạo mới nguyên liệu
exports.createIngredient = async (req, res) => {
  try {
    const { name, unit, stockQuantity, minStock, priceNow } = req.body;
    const ingredient = await Ingredient.create({
      name,
      unit,
      stockQuantity,
      minStock,
      priceNow,
    });
    res.status(201).json(ingredient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không thể tạo nguyên liệu." });
  }
};

// ✅ Sửa thông tin nguyên liệu
exports.updateIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, stockQuantity, minStock, priceNow } = req.body;

    const updated = await Ingredient.findByIdAndUpdate(
      id,
      { name, unit, stockQuantity, minStock, priceNow },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy nguyên liệu." });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi cập nhật nguyên liệu." });
  }
};

// ✅ Xóa nguyên liệu
exports.deleteIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Ingredient.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy nguyên liệu." });
    }

    res.json({ message: "Đã xóa nguyên liệu thành công." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi xóa nguyên liệu." });
  }
};
