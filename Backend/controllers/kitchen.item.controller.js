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

exports.markItemUnavailable = async (req, res) => {
  // 1. Lấy ID món ăn từ tham số URL
  const { itemId } = req.params;

  // 2. Lấy lý do hết hàng từ Body (Tùy chọn, để phục vụ việc báo cáo sau này)
  const { reason } = req.body;

  try {
    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy món ăn." });
    }

    // 3. Kiểm tra nếu món đã hết hàng rồi
    if (item.isAvailable === false) {
      return res.status(200).json({
        message: `Món '${item.name}' đã được đánh dấu là hết hàng trước đó.`,
        data: item,
      });
    }

    // 4. Cập nhật trạng thái isAvailable
    item.isAvailable = false;
    // Tùy chọn: Lưu lý do hết hàng vào một trường mới nếu bạn thêm vào Item model
    // item.unavailableReason = reason;

    await item.save();

    res.status(200).json({
      message: `Món '${item.name}' đã được đánh dấu là HẾT HÀNG (86) thành công.`,
      data: {
        itemId: item._id,
        name: item.name,
        isAvailable: item.isAvailable,
        reason: reason || "Không rõ lý do",
      },
    });
  } catch (error) {
    console.error(error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID Món ăn không hợp lệ." });
    }
    res.status(500).json({
      message: "Lỗi Server khi đánh dấu món hết hàng",
      error: error.message,
    });
  }
};

// Hàm ngược lại để phục hồi món ăn (Tùy chọn)
exports.markItemAvailable = async (req, res) => {
  const { itemId } = req.params;
  try {
    const item = await Item.findByIdAndUpdate(
      itemId,
      { isAvailable: true },
      { new: true }
    );
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy món ăn." });
    }
    res.status(200).json({
      message: `Món '${item.name}' đã được CUNG CẤP LẠI thành công.`,
      data: item,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi Server khi phục hồi món ăn." });
  }
};
