const Table = require("../models/Table");

// Lấy toàn bộ danh sách bàn

exports.getTables = async (req, res) => {
  try {
    const tables = await Table.find();
    res.json(tables);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy chi tiết 1 bàn
exports.getTableById = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id).populate("orders");
    if (!table) return res.status(404).json({ message: "Table not found" });
    res.json(table);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};