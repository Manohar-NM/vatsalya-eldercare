const express = require("express");
const router = express.Router();
const { createSOS, getSOS, resolveSOS } = require("../controllers/sosController");
const { protect } = require("../middleware/authMiddleware");
const { sosLimiter } = require("../middleware/rateLimitMiddleware");

// Parent device triggers SOS (rate-limited against flood/DoS while allowing emergency bursts)
router.post("/trigger", sosLimiter, createSOS);

// Child gets their SOS alerts (protected)
router.get("/", protect, getSOS);

// Child resolves an SOS (protected)
router.put("/:sosId/resolve", protect, resolveSOS);

module.exports = router;
