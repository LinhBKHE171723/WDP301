// routes/admin.user.route.js
const router = require("express").Router();
const userCtrl = require("../controllers/admin/user.controller");
const { authRequired, roleRequired } = require("../middlewares/auth.middleware");

// "/api/admin"
router.get("/users",  userCtrl.list);
router.post("/users",  userCtrl.create);
router.put("/users/:id",  userCtrl.update);
router.patch("/users/:id/status",  userCtrl.updateStatus);
router.patch("/users/:id/role",  userCtrl.updateRole);
router.delete("/users/:id",  userCtrl.remove);

module.exports = router;
