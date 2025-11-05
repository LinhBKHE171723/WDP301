const express = require("express");
const router = express.Router();
const { authRequired, roleRequired } = require("../middlewares/auth.middleware");

const userCtrl = require("../controllers/admin/user.controller");
const feedbackController = require("../controllers/admin/feedback.controller");
const preorderController = require("../controllers/admin/preorder.controller");
const statsCtrl = require("../controllers/admin/adminStats.controller");
const performanceController = require("../controllers/admin/performance.controller");
const itemCtrl = require("../controllers/admin/item.controller");
const itemTrendCtrl = require("../controllers/admin/itemTrend.controller");
const performanceDetailCtrl = require("../controllers/admin/performanceDetail.controller");
const customerReportCtrl = require("../controllers/admin/customerReport.controller");

// =======================================================
// NHÓM 1: CÁC ROUTE QUẢN LÝ CHUNG (Đã có & chạy tốt)
// =======================================================

// --- USERS ROUTES (/api/admin/users) ---
router.get("/users", userCtrl.list);
router.post("/users", userCtrl.create);
router.put("/users/:id", userCtrl.update);
router.patch("/users/:id/status", userCtrl.updateStatus);
router.patch("/users/:id/role", userCtrl.updateRole);
router.delete("/users/:id", userCtrl.remove);

// --- FEEDBACK ROUTES (/api/admin/feedbacks) ---
router.get("/feedbacks", feedbackController.getAll);
router.get("/feedbacks/:id", feedbackController.getOne);
router.delete("/feedbacks/:id", feedbackController.remove);

// --- PREORDER ROUTES (/api/admin/preorders) ---
router.get("/preorders", authRequired, roleRequired("admin"), preorderController.getPreOrders);
router.get("/customers/:userId/info", authRequired, roleRequired("admin"), preorderController.getCustomerInfo);
router.patch("/preorders/:orderId/approve", authRequired, roleRequired("admin"), preorderController.approvePreOrder);
router.patch("/preorders/:orderId/cancel", authRequired, roleRequired("admin"), preorderController.cancelPreOrder);
router.post("/preorders/:orderId/deposit", authRequired, roleRequired("admin"), preorderController.recordDeposit);
router.patch("/preorders/:orderId/items", authRequired, roleRequired("admin"), preorderController.modifyPreOrderItems);
router.patch("/preorders/:orderId", authRequired, roleRequired("admin"), preorderController.updatePreOrder);
router.post("/preorders/:orderId/notes", authRequired, roleRequired("admin"), preorderController.addAdminNote);
router.delete("/preorders/:orderId/notes/:noteId", authRequired, roleRequired("admin"), preorderController.deleteAdminNote);
router.patch("/preorders/:orderId/notes/:noteId", authRequired, roleRequired("admin"), preorderController.updateAdminNote);
router.get("/preorders/export", authRequired, roleRequired("admin"), preorderController.exportPreOrders);
router.post("/preorders/bulk-action", authRequired, roleRequired("admin"), preorderController.bulkActionPreOrders);

// =======================================================
// NHÓM 2: CÁC ROUTE THỐNG KÊ & BÁO CÁO
// =======================================================

// --- API cho Trang "Doanh thu Tổng quan" (Trang hiện tại của bạn) ---
router.get("/revenue", statsCtrl.getRevenueStats); // <-- API này bạn nói đang chạy mượt
router.get("/top-staff", statsCtrl.getTopStaff);
router.get("/stats/ingredient-waste", statsCtrl.getIngredientWasteStats);

// --- API cho Trang "Báo cáo Hiệu suất Món ăn" (Trang TỔNG QUAN mới) ---
//  Endpoint 1: Lấy danh sách món ăn để điền vào bộ lọc
router.get("/items/list-for-filter", itemCtrl.listForFilter);
//  Endpoint 2: Lấy dữ liệu báo cáo cho bảng so sánh (dùng lại API cũ của bạn)
router.get("/top-items", statsCtrl.getTopItems);

// --- API cho Trang "Phân tích Xu hướng" (Trang CHI TIẾT của bạn) ---
//  Endpoint 3: Lấy dữ liệu cho biểu đồ chi tiết của 1 món ăn
router.get("/items/trend", itemTrendCtrl.getItemTrendStats);
//  Endpoint 4: Lấy dữ liệu bán hàng của nhiều món theo thời gian (cho chart view)
router.get("/items/sales-by-time", statsCtrl.getItemsSalesByTimePeriod);

// trang khách hàng thân thiết
router.get("/reports/customers", customerReportCtrl.getCustomerReport);

// hieu suat nhan vien 
router.get("/waiters", performanceController.getWaiterStats);

// Test endpoint để trigger stale items reassignment (chỉ dùng để debug)
router.post("/test/reassign-stale-items", async (req, res) => {
  try {
    const { thresholdMinutes } = req.body;
    const { checkAndReassignStaleItems } = require("../utils/staleItemsChecker");
    const webSocketService = req.app.get("webSocketService");
    
    await checkAndReassignStaleItems(webSocketService, thresholdMinutes || 1);
    
    res.status(200).json({
      success: true,
      message: `Stale items check completed (threshold: ${thresholdMinutes || 1} minutes)`,
    });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
router.get("/chefs", performanceController.getChefStats);
router.get("/cashiers", performanceController.getCashierStats);
// ca lam viec
router.get("/performance/shifts/:userId", performanceDetailCtrl.getShiftDetailsByUser);

module.exports = router;