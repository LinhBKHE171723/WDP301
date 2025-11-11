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

// verify reset token
router.get("/verifyResetToken", userController.verifyResetToken);

// reset password
router.post("/resetPassword", userController.resetPassword);

// get today's work shift
router.get("/today-shift", authRequired, userController.getTodayShift);

// check in
router.post("/checkIn", authRequired, userController.checkIn);

// check out
router.post("/checkOut", authRequired, userController.checkOut);


module.exports = router;
