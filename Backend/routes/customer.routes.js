const express = require("express");
const router = express.Router();
const { authRequired } = require("../middlewares/auth.middleware");
const {
  getAvailableMenus,
  getAllMenus,
  getMenuById,
  getAvailableItems,
  getAllItems,
  getItemById,
  createOrder,
  createPreOrder,
  getTableByNumber,
  getOrderById,
  getUserOrders,
  addItemsToOrder,
  cancelOrderItem,
  updateOrderStatus,
  createFeedback,
  getOrderFeedback,
  getOrderEmployees,
  canFeedback,
  confirmOrder,
  updateOrderItemStatus,
  updateComboItemStatus,
  getLatestOrder,
  testUpdateOrderItemStatus,
  startEditOrder,
  requestPayment
} = require("../controllers/customer.controller");

// Routes cho khách hàng (không cần authentication)
// 1. Lấy thông tin bàn theo số bàn
router.get("/table/:tableNumber", getTableByNumber);

// 2. Lấy danh sách menu có sẵn
router.get("/menus", getAvailableMenus);

// 2.1. Lấy tất cả menu (không lọc stock - cho preorder)
router.get("/menus/all", getAllMenus);

// 3. Lấy chi tiết menu
router.get("/menus/:menuId", getMenuById);

// 4. Lấy danh sách món ăn có sẵn
router.get("/items", getAvailableItems);

// 4.1. Lấy tất cả món ăn (không lọc stock - cho preorder)
router.get("/items/all", getAllItems);

// 5. Lấy chi tiết món ăn
router.get("/items/:itemId", getItemById);

// 6. Tạo đơn hàng mới
router.post("/orders", createOrder);

// 6.1. Tạo đơn hàng đặt trước (preorder)
router.post("/preorders", createPreOrder);

// 7. Lấy đơn hàng mới nhất (cho testing) - phải đặt TRƯỚC route /orders/:orderId
router.get("/orders/latest", getLatestOrder);

// 7.1. Lấy thông tin đơn hàng theo ID
router.get("/orders/:orderId", getOrderById);

// 7.2. Lấy danh sách đơn hàng của user đã đăng nhập (cần authentication)
router.get("/user/orders", authRequired, getUserOrders);

// 8. Thêm món mới vào order hiện có
router.post("/orders/:orderId/items", addItemsToOrder);

// 9. Hủy món có status pending
router.delete("/orders/:orderId/items/:orderItemId", cancelOrderItem);

// 10. Cập nhật trạng thái đơn hàng
router.put("/orders/:orderId", updateOrderStatus);

// 10.1. Customer xác nhận đơn hàng sau khi waiter approve
router.post("/orders/:orderId/confirm", confirmOrder);

// 10.2. Customer bắt đầu sửa đơn hàng - xóa bàn và người phục vụ
router.post("/orders/:orderId/start-edit", startEditOrder);

// 10.3. Customer yêu cầu thanh toán
router.post("/orders/:orderId/request-payment", requestPayment);

// 11. Kiểm tra order có thể feedback không
router.get("/orders/:orderId/can-feedback", canFeedback);

// 12. Lấy feedback của một order
router.get("/orders/:orderId/feedback", getOrderFeedback);

// 12.1. Lấy danh sách waiter và chef đã tham gia order (để đánh giá)
router.get("/orders/:orderId/employees", getOrderEmployees);

// 13. Tạo feedback cho order đã thanh toán
router.post("/orders/:orderId/feedback", createFeedback);

// 14. Cập nhật trạng thái món ăn trong đơn hàng
router.put("/order-items/:orderItemId/status", updateOrderItemStatus);

// 14.1. Cập nhật trạng thái từng món trong combo
router.put("/order-items/:orderItemId/combo-items/:comboItemIndex/status", updateComboItemStatus);

// 15. Test endpoint để update order item status (cho testing)
router.put("/orders/:orderId/test-update-item-status", testUpdateOrderItemStatus);

module.exports = router;
