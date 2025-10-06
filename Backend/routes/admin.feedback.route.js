const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/admin.feedback.controller");
const { authRequired, roleRequired } = require("../middlewares/auth.middleware");

router.use(authRequired, roleRequired("admin"));

router.get("/feedbacks", feedbackController.getAll);
router.get("/feedbacks/:id", feedbackController.getOne);
router.delete("/feedbacks/:id", feedbackController.remove);

module.exports = router;
