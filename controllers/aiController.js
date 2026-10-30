const mongoose = require("mongoose");
const Parent = require("../models/Parent");
const Health = require("../models/Health");
const {
  generateHealthSummary,
  AiConfigError,
  AiTimeoutError,
  AiProviderError,
  MANDATORY_DISCLAIMER
} = require("../services/aiService");

/**
 * GET /api/ai/health-summary/:parentId
 * Caregiver-authorized AI health summary using NVIDIA Nemotron on Nebius AI Studio.
 */
exports.getHealthSummary = async (req, res) => {
  try {
    const { parentId } = req.params;

    if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ success: false, message: "Valid parent ID is required" });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Caregiver authentication required" });
    }

    // Caregiver IDOR check: verify parent is linked to logged-in caregiver
    const parent = await Parent.findOne({ _id: parentId, child: req.user._id });
    if (!parent) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access AI health summary for this parent or parent not found"
      });
    }

    // Fetch historical real health records
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const healthRecords = await Health.find({ parent: parentId }).sort({ timestamp: -1 }).limit(limit);

    // If no health data exists, return clear guidance without invoking LLM
    if (!healthRecords || healthRecords.length === 0) {
      return res.json({
        success: true,
        summary: `No health metrics (heart rate, SpO2, blood pressure, or steps) have been recorded yet for ${parent.name}. Record health measurements to generate an AI care summary.`,
        dataPoints: 0,
        requiresData: true,
        disclaimer: MANDATORY_DISCLAIMER
      });
    }

    // Call Nebius NVIDIA Nemotron AI service
    const aiResult = await generateHealthSummary({
      parent,
      healthRecords,
      medicines: parent.medicines || [],
      activities: parent.activities || []
    });

    res.json({
      success: true,
      summary: aiResult.summary,
      model: aiResult.model,
      dataPoints: healthRecords.length,
      lastRecordedAt: healthRecords[0]?.timestamp,
      disclaimer: aiResult.disclaimer,
      provider: aiResult.provider
    });
  } catch (err) {
    if (err instanceof AiConfigError) {
      return res.status(503).json({
        success: false,
        message: "AI health insights are temporarily unavailable. Provider is not configured."
      });
    }

    if (err instanceof AiTimeoutError) {
      return res.status(504).json({
        success: false,
        message: "AI health summary request timed out. Please try again."
      });
    }

    if (err instanceof AiProviderError) {
      return res.status(err.statusCode || 502).json({
        success: false,
        message: "Unable to complete AI summary with inference provider. Please retry shortly."
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal error processing health summary request"
    });
  }
};

