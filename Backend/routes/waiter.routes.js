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
router.get("/tables", authRequired, waiterTableController.getAllTables);
router.get("/tables/details/:tableId", authRequired, waiterTableController.getTableDetails);
router.get("/tables/available", authRequired, waiterTableController.getAvailableTables);

// ===========================
// 📌 ORDER ROUTES
// ===========================
router.get("/orders/pending", authRequired, waiterOrderController.getPendingOrders);
router.get("/orders/active", authRequired, waiterOrderController.getActiveOrders);
router.post("/orders/:orderId/respond", authRequired, waiterOrderController.respondToOrder);
router.put("/orders/:orderId/status", authRequired, waiterOrderController.updateOrderStatus);

module.exports = router;
