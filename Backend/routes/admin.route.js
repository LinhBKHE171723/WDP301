const express = require("express");
const router = express.Router();

// --- Controllers ---
// Controllers cũ đang dùng
const userCtrl = require("../controllers/admin/user.controller");
const feedbackController = require("../controllers/admin/feedback.controller");
const statsCtrl = require("../controllers/admin/adminStats.controller");

// Controllers MỚI cho các trang báo cáo món ăn
const itemCtrl = require("../controllers/admin/item.controller"); 
const itemTrendCtrl = require("../controllers/admin/itemTrend.controller"); 




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


// =======================================================
// NHÓM 2: CÁC ROUTE THỐNG KÊ & BÁO CÁO
// =======================================================

// --- API cho Trang "Doanh thu Tổng quan" (Trang hiện tại của bạn) ---
router.get("/revenue", statsCtrl.getRevenueStats); // <-- API này bạn nói đang chạy mượt
router.get("/top-staff", statsCtrl.getTopStaff);


// --- API cho Trang "Báo cáo Hiệu suất Món ăn" (Trang TỔNG QUAN mới) ---
//  Endpoint 1: Lấy danh sách món ăn để điền vào bộ lọc
router.get("/items/list-for-filter", itemCtrl.listForFilter);
//  Endpoint 2: Lấy dữ liệu báo cáo cho bảng so sánh (dùng lại API cũ của bạn)
router.get("/top-items", statsCtrl.getTopItems);


// --- API cho Trang "Phân tích Xu hướng" (Trang CHI TIẾT của bạn) ---
//  Endpoint 3: Lấy dữ liệu cho biểu đồ chi tiết của 1 món ăn
router.get("/items/trend", itemTrendCtrl.getItemTrendStats);


module.exports = router;