const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { addHealth, getHealth, getHealthTrends } = require("../controllers/healthController");

router.post("/add", protect, addHealth);
router.get("/:parentId/trends", protect, getHealthTrends);
router.get("/:parentId", protect, getHealth);

module.exports = router;
