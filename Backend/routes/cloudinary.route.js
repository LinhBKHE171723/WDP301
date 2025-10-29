const express = require("express");
const {
  getCloudinarySignature,
} = require("../controllers/cloudinary.controller");
const {
  isAuthenticatedUser,
  authorizeRoles,
} = require("../middlewares/auth.middleware");

const router = express.Router();

// chỉ admin được phép lấy chữ ký upload
// router.get(
//   "/upload/signature",
//   isAuthenticatedUser,
//   authorizeRoles("kitchen_manager"),
//   getCloudinarySignature
// );
router.get("/upload/signature", getCloudinarySignature);

module.exports = router;
