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
    const menus = await Menu.find().populate("items");
    res.status(200).json({
      message: "Lấy danh sách thực đơn thành công",
      data: menus, // ✅ Bọc trong key 'data'
    });
  } catch (error) {
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
