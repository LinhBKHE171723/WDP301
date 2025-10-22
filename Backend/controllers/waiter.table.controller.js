const Table = require("../models/Table");
const Order = require("../models/Order");
const User = require("../models/User");


const waiterTableController = {
  /**
   * @desc Lấy danh sách tất cả các bàn
   * @route GET /api/waiter/tables
   * @access waiter
   */
  getAllTables: async (req, res) => {
    try {
      const tables = await Table.find()
        .populate({
          path: "orderNow",
          populate: [
            { path: "servedBy", select: "name email" },
            { path: "userId", select: "name email" },
            {
              path: "orderItems",
              populate: { path: "itemId", select: "name price" },
            },
          ],
        })
        .lean();

      res.status(200).json({ success: true, tables });
    } catch (error) {
      console.error("❌ Lỗi khi lấy danh sách bàn:", error);
      res.status(500).json({ success: false, message: "Không thể lấy danh sách bàn" });
    }
  },

  /**
   * @desc Lấy chi tiết 1 bàn (bao gồm các order và chi tiết món)
   * @route GET /api/waiter/tables/:tableId
   * @access waiter
   */
  getTableDetails: async (req, res) => {
    try {
      const { tableId } = req.params;

      const table = await Table.findById(tableId)
        .populate({
          path: "orderNow",
          populate: [
            { path: "servedBy", select: "name email" },
            { path: "userId", select: "name email" },
            {
              path: "orderItems",
              populate: { path: "itemId", select: "name price" },
            },
            { path: "paymentId", select: "status amountPaid paymentMethod" },
          ],
        })
        .lean();

      if (!table)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy bàn" });

      res.status(200).json({ success: true, table });
    } catch (error) {
      console.error("❌ Lỗi khi lấy chi tiết bàn:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  },

  // Lấy danh sách bàn trống
  getAvailableTables: async (req, res) => {
    try {
      const availableTables = await Table.find({ status: 'available' });
      res.status(200).json(availableTables);
    }
    catch (error) {
      console.error("❌ Lỗi khi lấy danh sách bàn trống:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  },
};

module.exports = waiterTableController;