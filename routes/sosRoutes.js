const express = require("express");
const router = express.Router();
const { createSOS, getSOS, resolveSOS } = require("../controllers/sosController");
const { protect } = require("../middleware/authMiddleware");

// Parent device triggers SOS (no auth - uses parentId)
router.post("/trigger", createSOS);

// Child gets their SOS alerts (protected)
router.get("/", protect, getSOS);

// Child resolves an SOS (protected)
router.put("/:sosId/resolve", protect, resolveSOS);

module.exports = router;