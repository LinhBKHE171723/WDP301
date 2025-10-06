const express = require("express");
const router = express.Router();
const userController = require("../controllers/admin.user.controller");
const { authRequired, roleRequired } = require("../middlewares/auth.middleware");

router.use(authRequired, roleRequired("admin")); // Chỉ admin mới truy cập

router.get("/users", userController.getAll);
router.post("/users", userController.create);
router.put("/users/:id", userController.update);
router.delete("/users/:id", userController.remove);

module.exports = router;
