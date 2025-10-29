const express = require("express");
const { getProfile, updateProfile } = require("../controllers/user.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
// ✅ Lấy profile người dùng hiện tại
router.get("/profile", authRequired, getProfile);

// ✅ Chỉ người đã đăng nhập mới được cập nhật profile
router.put("/updateProfile", authRequired, upload.single("avatar"), updateProfile);

module.exports = router;
