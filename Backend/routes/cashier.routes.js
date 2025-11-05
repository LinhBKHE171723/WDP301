const router = require("express").Router();
const { authRequired, roleRequired } = require("../middlewares/auth.middleware");
const cashierCtrl = require("../controllers/cashier.controller");

router.get(
  "/orders/preparing",
  authRequired,
  roleRequired("cashier", "admin"),
  cashierCtrl.getPreparingOrders
);

router.post(
  "/orders/:orderId/pay",
  authRequired,
  roleRequired("cashier", "admin"),
  cashierCtrl.completeOrderPayment
);

module.exports = router;


