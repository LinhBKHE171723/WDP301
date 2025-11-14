const Menu = require("../models/Menu");

exports.createMenu = async (req, res) => {
  try {
    const menu = new Menu(req.body);
    await menu.save();
    res.status(201).json({ message: "Menu created successfully", menu });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllMenus = async (req, res) => {
  try {
    // Lấy toàn bộ menu và populate items
    const menus = await Menu.find().populate("items");

    // Duyệt qua từng menu để xác định trạng thái khả dụng
    const updatedMenus = menus.map((menu) => {
      // Nếu không có item nào trong menu, xem là không khả dụng
      if (!menu.items || menu.items.length === 0) {
        menu.isAvailable = false;
        return menu;
      }

      // Nếu có ít nhất 1 item hết hàng thì menu cũng hết hàng
      const hasUnavailableItem = menu.items.some(
        (item) => item && item.isAvailable === false
      );

      menu.isAvailable = !hasUnavailableItem;
      return menu;
    });

    res.status(200).json({
      message: "Lấy danh sách thực đơn thành công",
      data: updatedMenus,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách menu:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getMenuById = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id).populate("items");
    if (!menu) return res.status(404).json({ message: "Menu not found" });
    res.json(menu);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMenu = async (req, res) => {
  try {
    const menu = await Menu.findByIdAndUpdate(req.params.menuId, req.body, {
      new: true,
    });
    if (!menu) return res.status(404).json({ message: "Menu not found" });
    res.json({ message: "Menu updated successfully", menu });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMenu = async (req, res) => {
  try {
    const menu = await Menu.findByIdAndDelete(req.params.menuId);
    if (!menu) return res.status(404).json({ message: "Menu not found" });
    res.json({ message: "Menu deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markMenuAvailable = async (req, res) => {
  try {
    const menu = await Menu.findByIdAndUpdate(
      req.params.menuId,
      { isAvailable: true },
      { new: true }
    );
    res.status(200).json(menu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markMenuUnavailable = async (req, res) => {
  try {
    const menu = await Menu.findByIdAndUpdate(
      req.params.menuId,
      { isAvailable: false },
      { new: true }
    );
    res.status(200).json(menu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
