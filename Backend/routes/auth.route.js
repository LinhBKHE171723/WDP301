// routes/auth.route.js
const router = require("express").Router();
const authCtrl = require("../controllers/auth.controller");

// /api/auth
router.get("/verify/:token", authCtrl.verifyEmail);



module.exports = router;
