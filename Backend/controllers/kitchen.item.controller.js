const Item = require("../models/Item");
exports.createItem = async (req, res) => {
  // Chỉ lấy các trường cần thiết từ body để tạo món ăn
  const { name, description, category, price, ingredients, image } = req.body;

  // Kiểm tra tính hợp lệ cơ bản
  if (!name || !price) {
    return res
      .status(400)
      .json({ message: "Tên và giá món ăn không được để trống." });
  }

  try {
    const newItem = new Item({
      name,
      description,
      category,
      price,
      ingredients: ingredients || [], // Khởi tạo mảng nguyên liệu
      image,
    });

    await newItem.save();
    res.status(201).json({
      message: "Tạo món ăn mới thành công.",
      data: newItem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi Server khi tạo món ăn.",
      error: error.message,
    });
  }
};

// --- 2. Lấy danh sách Món ăn (Read All)
exports.getAllItems = async (req, res) => {
  try {
    // Lấy tất cả món ăn, sắp xếp theo tên
    const items = await Item.find().sort({ name: 1 });

    res.status(200).json({
      message: `Tìm thấy ${items.length} món ăn.`,
      data: items,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi Server khi lấy danh sách món ăn.",
      error: error.message,
    });
  }
};

// --- 3. Lấy chi tiết Món ăn (Read One)
exports.getItemById = async (req, res) => {
  const { itemId } = req.params;

  try {
    // Lấy món ăn và populate (liên kết) thông tin nguyên liệu nếu cần
    // Giả sử Ingredient model đã được tạo
    const item = await Item.findById(itemId).populate(
      "ingredients",
      "name unit"
    );

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy món ăn." });
    }

    res.status(200).json({
      message: "Lấy chi tiết món ăn thành công.",
      data: item,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi Server khi lấy chi tiết món ăn.",
      error: error.message,
    });
  }
};

// --- 4. Cập nhật Món ăn (Update)
exports.updateItem = async (req, res) => {
  const { itemId } = req.params;
  const updateData = req.body;

  try {
    // Option 'new: true' trả về tài liệu đã cập nhật
    const updatedItem = await Item.findByIdAndUpdate(
      itemId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy món ăn để cập nhật." });
    }

    res.status(200).json({
      message: "Cập nhật món ăn thành công.",
      data: updatedItem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi Server khi cập nhật món ăn.",
      error: error.message,
    });
  }
};

// --- 5. Xóa Món ăn (Delete)
exports.deleteItem = async (req, res) => {
  const { itemId } = req.params;

  try {
    const deletedItem = await Item.findByIdAndDelete(itemId);

    if (!deletedItem) {
      return res.status(404).json({ message: "Không tìm thấy món ăn để xóa." });
    }

    // Tùy chọn: Xóa món ăn khỏi Menu nào có chứa nó (cần logic bổ sung)
    // await Menu.updateMany({ items: itemId }, { $pull: { items: itemId } });

    res.status(200).json({
      message: "Xóa món ăn thành công.",
      data: deletedItem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi Server khi xóa món ăn.",
      error: error.message,
    });
  }
};

// --- Đánh dấu món ăn HẾT HÀNG ---
exports.markItemUnavailable = async (req, res) => {
  const { itemId } = req.params;
  const { reason } = req.body;

  try {
    console.log("🧠 markItemUnavailable:", itemId);
    const item = await Item.findById(itemId);
    if (!item)
      return res.status(404).json({ message: "Không tìm thấy món ăn." });

    if (!item.isAvailable)
      return res
        .status(200)
        .json({ message: `Món '${item.name}' đã hết hàng.`, data: item });

    item.isAvailable = false;
    await item.save();

    res.status(200).json({
      message: `✅ Món '${item.name}' đã được đánh dấu là HẾT HÀNG.`,
      data: item,
    });
  } catch (error) {
    console.error("❌ markItemUnavailable ERROR:", error.message);
    res
      .status(500)
      .json({
        message: "Lỗi Server khi đánh dấu món hết hàng",
        error: error.message,
      });
  }
};

// --- Đánh dấu món ăn CÒN HÀNG ---
exports.markItemAvailable = async (req, res) => {
  const { itemId } = req.params;
  try {
    console.log("🧠 markItemAvailable:", itemId);
    const item = await Item.findByIdAndUpdate(
      itemId,
      { $set: { isAvailable: true } },
      { new: true, runValidators: true }
    );

    if (!item)
      return res.status(404).json({ message: "Không tìm thấy món ăn." });

    res.status(200).json({
      message: `✅ Món '${item.name}' đã được cung cấp lại.`,
      data: item,
    });
  } catch (error) {
    console.error("❌ markItemAvailable ERROR:", error.message);
    res
      .status(500)
      .json({
        message: "Lỗi Server khi phục hồi món ăn.",
        error: error.message,
      });
  }
};
