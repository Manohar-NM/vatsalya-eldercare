const mongoose = require("mongoose");
const Parent = require("../models/Parent");
const Health = require("../models/Health");
const {
  generateAssistantChat,
  ASSISTANT_DISCLAIMER
} = require("../services/aiAssistantService");
const {
  AiConfigError,
  AiTimeoutError,
  AiProviderError
} = require("../services/aiService");

/**
 * POST /api/ai/assistant/:parentId/chat
 * Authenticated conversational caregiver assistant.
 */
exports.chatWithAssistant = async (req, res) => {
  try {
    const { parentId } = req.params;
    const { message, conversationHistory } = req.body || {};

    // 1. Validate Parent ID format
    if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({
        success: false,
        message: "A valid parent ID is required."
      });
    }

    // 2. Validate User Authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Caregiver authentication required."
      });
    }

    // 3. Validate Message Content
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "A non-empty message is required."
      });
    }

    if (message.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message exceeds maximum allowed length of 1,000 characters."
      });
    }

    // 4. Caregiver Authorization (IDOR protection)
    const parent = await Parent.findOne({ _id: parentId, child: req.user._id });
    if (!parent) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access caregiver assistant for this parent or parent not found."
      });
    }

    // 5. Fetch genuine health records for this specific parent (latest 10)
    const healthRecords = await Health.find({ parent: parentId })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // 6. Generate Assistant Response
    const response = await generateAssistantChat({
      parent,
      healthRecords,
      message: message.trim(),
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : []
    });

    return res.json({
      success: true,
      ...response
    });
  } catch (err) {
    if (err instanceof AiConfigError) {
      return res.status(503).json({
        success: false,
        message: "AI assistant service is temporarily unconfigured."
      });
    }

    if (err instanceof AiTimeoutError) {
      return res.status(504).json({
        success: false,
        message: "AI assistant request timed out. Please try again."
      });
    }

    if (err instanceof AiProviderError) {
      return res.status(err.statusCode || 502).json({
        success: false,
        message: "Inference provider temporarily unavailable. Please retry shortly."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal error processing caregiver assistant request."
    });
  }
};

