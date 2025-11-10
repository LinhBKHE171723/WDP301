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
const settingsController = require("../controllers/admin/settings.controller");
const workShiftController = require("../controllers/admin/workShift.controller");
const { checkPreOrderPermission } = require("../middlewares/preorderPermission.middleware");

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

// --- SETTINGS ROUTES (/api/admin/settings) ---
router.get("/settings", authRequired, roleRequired("admin"), settingsController.getSettings);
router.get("/settings/preorder", authRequired, roleRequired("admin"), settingsController.getPreOrderSettings);
router.get("/settings/:key", authRequired, roleRequired("admin"), settingsController.getSetting);
router.put("/settings/:key", authRequired, roleRequired("admin"), settingsController.updateSetting);

// --- WORK SHIFT ROUTES (/api/admin/work-shifts) ---
router.get("/work-shifts", authRequired, roleRequired("admin"), workShiftController.getWorkShifts);
router.get("/work-shifts/:id", authRequired, roleRequired("admin"), workShiftController.getWorkShift);
router.post("/work-shifts", authRequired, roleRequired("admin"), workShiftController.createWorkShift);
router.put("/work-shifts/:id", authRequired, roleRequired("admin"), workShiftController.updateWorkShift);
router.delete("/work-shifts/:id", authRequired, roleRequired("admin"), workShiftController.deleteWorkShift);

// --- PREORDER ROUTES (/api/admin/preorders) ---
router.get("/preorders", authRequired, roleRequired("admin", "cashier"), preorderController.getPreOrders);
router.get("/customers/:userId/info", authRequired, roleRequired("admin", "cashier"), preorderController.getCustomerInfo);
router.patch("/preorders/:orderId/approve", authRequired, roleRequired("admin", "cashier"), checkPreOrderPermission, preorderController.approvePreOrder);
router.patch("/preorders/:orderId/cancel", authRequired, roleRequired("admin", "cashier"), checkPreOrderPermission, preorderController.cancelPreOrder);
router.post("/preorders/:orderId/deposit", authRequired, roleRequired("admin", "cashier"), checkPreOrderPermission, preorderController.recordDeposit);
router.patch("/preorders/:orderId/items", authRequired, roleRequired("admin", "cashier"), checkPreOrderPermission, preorderController.modifyPreOrderItems);
router.patch("/preorders/:orderId", authRequired, roleRequired("admin", "cashier"), checkPreOrderPermission, preorderController.updatePreOrder);
router.post("/preorders/:orderId/notes", authRequired, roleRequired("admin", "cashier"), checkPreOrderPermission, preorderController.addAdminNote);
router.delete("/preorders/:orderId/notes/:noteId", authRequired, roleRequired("admin", "cashier"), checkPreOrderPermission, preorderController.deleteAdminNote);
router.patch("/preorders/:orderId/notes/:noteId", authRequired, roleRequired("admin", "cashier"), checkPreOrderPermission, preorderController.updateAdminNote);
router.get("/preorders/export", authRequired, roleRequired("admin"), preorderController.exportPreOrders);
router.post("/preorders/bulk-action", authRequired, roleRequired("admin", "cashier"), preorderController.bulkActionPreOrders);

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
// hieu suat nhan vien 
router.get("/waiters", performanceController.getWaiterStats);
router.get("/chefs", performanceController.getChefStats);
router.get("/cashiers", performanceController.getCashierStats);


// ca lam viec
router.get("/performance/shifts/:userId", performanceDetailCtrl.getUserShifts);

module.exports = router;