const express = require("express");
const router = express.Router();
const {
  getAvailableMenus,
  getMenuById,
  getAvailableItems,
  getItemById,
  createOrder,
  getTableByNumber,
  getOrderById,
  addItemsToOrder,
  cancelOrderItem,
  updateOrderStatus,
  createFeedback,
  getOrderFeedback,
  canFeedback
} = require("../controllers/customer.controller");

// Routes cho khách hàng (không cần authentication)
// 1. Lấy thông tin bàn theo số bàn
router.get("/table/:tableNumber", getTableByNumber);

// 2. Lấy danh sách menu có sẵn
router.get("/menus", getAvailableMenus);

// 3. Lấy chi tiết menu
router.get("/menus/:menuId", getMenuById);

// 4. Lấy danh sách món ăn có sẵn
router.get("/items", getAvailableItems);

// 5. Lấy chi tiết món ăn
router.get("/items/:itemId", getItemById);

// 6. Tạo đơn hàng mới
router.post("/orders", createOrder);

// 7. Lấy thông tin đơn hàng theo ID
router.get("/orders/:orderId", getOrderById);

// 8. Thêm món mới vào order hiện có
router.post("/orders/:orderId/items", addItemsToOrder);

// 9. Hủy món có status pending
router.delete("/orders/:orderId/items/:orderItemId", cancelOrderItem);

// 10. Cập nhật trạng thái đơn hàng
router.put("/orders/:orderId", updateOrderStatus);

// 11. Kiểm tra order có thể feedback không
router.get("/orders/:orderId/can-feedback", canFeedback);

// 12. Lấy feedback của một order
router.get("/orders/:orderId/feedback", getOrderFeedback);

// 13. Tạo feedback cho order đã thanh toán
router.post("/orders/:orderId/feedback", createFeedback);

module.exports = router;
