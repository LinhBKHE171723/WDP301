const express = require("express");
const router = express.Router();
const {
  authRequired,
  roleRequired,
} = require("../middlewares/auth.middleware");
const waiterTableController = require("../controllers/waiter.table.controller");
const waiterOrderController = require("../controllers/waiter.order.controller");

// ===========================
// 📌 TABLE ROUTES
// ===========================
router.get("/tables", waiterTableController.getAllTables);
router.get("/tables/:tableId", waiterTableController.getTableDetails);

// ===========================
// 📌 ORDER ROUTES
// ===========================
router.get("/orders/pending", waiterOrderController.getPendingOrders);
router.get("/orders/active", waiterOrderController.getActiveOrders);
router.post("/orders/:orderId/respond", waiterOrderController.respondToOrder);
router.put("/orders/:orderId/status", waiterOrderController.updateOrderStatus);

module.exports = router;