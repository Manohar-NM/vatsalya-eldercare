const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { aiLimiter } = require("../middleware/rateLimitMiddleware");
const { getHealthSummary } = require("../controllers/aiController");
const { chatWithAssistant } = require("../controllers/aiAssistantController");

// GET /api/ai/health-summary/:parentId (Caregiver protected, rate-limited against token exhaustion)
router.get("/health-summary/:parentId", protect, aiLimiter, getHealthSummary);

// POST /api/ai/assistant/:parentId/chat (Caregiver conversational assistant, rate-limited against token exhaustion)
router.post("/assistant/:parentId/chat", protect, aiLimiter, chatWithAssistant);

module.exports = router;
