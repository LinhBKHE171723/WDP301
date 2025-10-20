const express = require("express");
const router = express.Router();
const {
  authRequired,
  roleRequired,
} = require("../middlewares/auth.middleware");
const waiterTableController = require("../controllers/waiter.table.controller");

// ===========================
// 📌 TABLE ROUTES
// ===========================
router.get("/tables", waiterTableController.getAllTables);
router.get("/tables/:tableId", waiterTableController.getTableDetails);

module.exports = router;