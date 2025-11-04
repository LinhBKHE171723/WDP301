const service = require("../../services/admin/adminStats.service.js");

exports.getRevenueStats = async (req, res) => {
  try {
    const { type = "daily", from, to } = req.query;
    const data = await service.getRevenueStats({ type, from, to });
    res.json(data);
  } catch (err) {
    console.error("getRevenueStats:", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};

exports.getTopItems = async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const data = await service.getTopItems({ from, to, limit });
    res.json(data);
  } catch (err) {
    console.error("getTopItems:", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};

exports.getTopStaff = async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const data = await service.getTopStaff({ from, to, limit });
    res.json(data);
  } catch (err) {
    console.error("getTopStaff:", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};

exports.getIngredientWasteStats = async (req, res) => {
  try {
    const data = await service.getIngredientWasteStats();
    res.json(data);
  } catch (err) {
    console.error("getIngredientWasteStats:", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};

exports.getItemsSalesByTimePeriod = async (req, res) => {
  try {
    const { type = "daily", from, to, topN = 10, itemIds } = req.query;
    const data = await service.getItemsSalesByTimePeriod({ type, from, to, topN, itemIds });
    res.json(data);
  } catch (err) {
    console.error("getItemsSalesByTimePeriod:", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
};