// routes/auth.route.js
const router = require("express").Router();
const authCtrl = require("../controllers/admin/auth.controller.js");

// /api/auth
router.get("/verify/:token", authCtrl.verifyEmail);



module.exports = router;
