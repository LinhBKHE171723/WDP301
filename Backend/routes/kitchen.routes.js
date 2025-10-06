const express = require("express");
const router = express.Router();
const {
  authRequired,
  roleRequired,
} = require("../middlewares/auth.middleware");

const {
  getConfirmedOrders,
  startPreparingOrder,
  markItemReady,
  assignChefToItem,
  getMyPreparingItems, // Đảm bảo đã có hàm này trong controller
} = require("../controllers/kitchen.order.controller");

const KITCHEN_ROLES = ["chef"];

// router.use(authRequired, roleRequired(...KITCHEN_ROLES));
-(
  // 1. Order List (GET)
  router.get("/orders/confirmed", getConfirmedOrders)
);

// 2. Món đang làm của Chef (GET)
router.get("/my-preparing-items", getMyPreparingItems);

// 3. Bếp xác nhận bắt đầu chế biến Order (PATCH)
router.patch("/orders/:orderId/start-preparing", startPreparingOrder);

// 4. Đầu bếp xác nhận món hoàn thành (PATCH)
router.patch("/order-items/:orderItemId/ready", markItemReady);

// 5. Phân công món (PATCH)
router.patch("/order-items/:orderItemId/assign-chef", assignChefToItem);

module.exports = router;
