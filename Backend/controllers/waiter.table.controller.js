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
          path: "orders",
          select: "status totalAmount createdAt",
          options: { sort: { createdAt: -1 }, limit: 1 }, // lấy order mới nhất
        })
        .lean();

      res.status(200).json({ success: true, tables });
    } catch (error) {
      console.error("❌ Lỗi khi lấy danh sách bàn:", error);
      res.status(500).json({ success: false, message: "Server error" });
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
          path: "orders",
          populate: [
            {
              path: "orderItems",
              populate: {
                path: "itemId",
                select: "name price image category",
              },
            },
            {
              path: "paymentId",
              select: "status amountPaid paymentMethod",
            },
            {
              path: "userId",
              select: "name email phone",
            },
            {
              path: "servedBy",
              select: "name",
            },
          ],
        })
        .lean();

      if (!table)
        return res.status(404).json({ success: false, message: "Không tìm thấy bàn" });

      res.status(200).json({ success: true, table });
    } catch (error) {
      console.error("❌ Lỗi khi lấy chi tiết bàn:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
};

module.exports = waiterTableController;