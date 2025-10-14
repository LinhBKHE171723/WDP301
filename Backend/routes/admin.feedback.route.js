const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/admin/feedback.controller");
const { authRequired, roleRequired } = require("../middlewares/auth.middleware");

// router.use(authRequired, roleRequired("admin"));

router.get("/", feedbackController.getAll);
router.get("/:id", feedbackController.getOne);
router.delete("/:id", feedbackController.remove);

module.exports = router;
