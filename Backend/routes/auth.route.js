const express = require("express");
const router = express.Router();
const { login } = require("../controllers/auth.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const authCtrl = require("../controllers/admin/auth.controller.js");

// /api/auth
router.get("/verify/:token", authCtrl.verifyEmail);
router.post("/login", login);
router.get("/checkme", authRequired, (req, res) => {
  res.json({ user: req.user }); // data trả về lấy từ authRequired
});

module.exports = router;
