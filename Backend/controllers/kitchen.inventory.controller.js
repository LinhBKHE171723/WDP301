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

// ✅ Tạo mới đơn nhập kho
exports.createPurchaseOrder = async (req, res) => {
  try {
    const { ingredientId, quantity, unit, price } = req.body;

    const order = await PurchaseOrder.create({
      ingredientId,
      quantity,
      unit,
      price,
    });

    // Cập nhật tồn kho sau khi nhập hàng
    await Ingredient.findByIdAndUpdate(ingredientId, {
      $inc: { stockQuantity: quantity },
    });

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không thể tạo đơn nhập kho." });
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
    const { name, unit, stockQuantity, minStock } = req.body;

    if (!name || !unit) {
      return res
        .status(400)
        .json({ message: "Thiếu tên hoặc đơn vị nguyên liệu." });
    }

    const ingredient = await Ingredient.create({
      name,
      unit,
      stockQuantity: stockQuantity || 0,
      minStock: minStock || 0,
    });

    res.status(201).json(ingredient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không thể tạo nguyên liệu mới." });
  }
};
