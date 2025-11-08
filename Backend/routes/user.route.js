const express = require("express");
const userController = require("../controllers/user.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const router = express.Router();

// ✅ Lấy profile người dùng hiện tại
router.get("/profile", authRequired, userController.getProfile);

// ✅ Chỉ người đã đăng nhập mới được cập nhật profile
router.put("/updateProfile", authRequired, userController.updateProfile);

// forgot password
router.post("/forgotPassword", userController.forgotPassword);

// reset password
router.post("/resetPassword", userController.resetPassword);

module.exports = router;
