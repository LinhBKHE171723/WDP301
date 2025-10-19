const express = require("express");
const router = express.Router();
const { login } = require("../controllers/auth.controller");
const { authRequired } = require("../middlewares/auth.middleware");

router.post("/login", login);
router.get("/checkme", authRequired, (req, res) => {
  res.json({ user: req.user }); // data trả về lấy từ authRequired
});

module.exports = router;
