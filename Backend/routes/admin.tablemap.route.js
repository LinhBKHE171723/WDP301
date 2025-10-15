const express = require("express");
const router = express.Router();

const tableController = require("../controllers/table.controller");

//

router.get("/", tableController.getTables);
router.get("/:id", tableController.getTableById);
// Add more admin-specific routes here

module.exports = router;