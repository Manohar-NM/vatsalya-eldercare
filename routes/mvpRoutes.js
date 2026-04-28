const express = require("express");
const Parent = require("../models/Parent");
const SOS = require("../models/SOS");

const router = express.Router();

const translations = {
    kn: "Kannada request translated: Please call me, I need help.",
    hi: "Hindi request translated: Please call me, I need help.",
    ta: "Tamil request translated: Please call me, I need help.",
    te: "Telugu request translated: Please call me, I need help.",
    ml: "Malayalam request translated: Please call me, I need help.",
    mr: "Marathi request translated: Please call me, I need help.",
    bn: "Bengali request translated: Please call me, I need help.",
    gu: "Gujarati request translated: Please call me, I need help.",
    pa: "Punjabi request translated: Please call me, I need help.",
    or: "Odia request translated: Please call me, I need help.",
    as: "Assamese request translated: Please call me, I need help.",
    en: "English request: Please call me, I need help."
};

const getSeverity = (message = "") => {
    const text = message.toLowerCase();
    return text.includes("help") || text.includes("emergency") ? "HIGH" : "NORMAL";
};

const findParentByCode = async (uniqueCode) => Parent.findOne({ uniqueCode });

router.post("/parent/activate", async (req, res) => {
    try {
        const { uniqueCode } = req.body || {};
        const parent = await findParentByCode(uniqueCode);

        if (!parent) {
            return res.status(404).json({ message: "Invalid parent code" });
        }

        res.json({
            message: "Parent device activated",
            parent
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/parent/:code/sos", async (req, res) => {
    try {
        const parent = await findParentByCode(req.params.code);
        if (!parent) {
            return res.status(404).json({ message: "Invalid parent code" });
        }

        const { message = "Emergency help needed", offline = false } = req.body || {};
        const childId = parent.child?.toString();
        const severity = getSeverity(message);
        const channel = offline ? "SMS_2G_FALLBACK" : "ONLINE_SOCKET";

        const sos = await SOS.create({
            parent: parent._id,
            message,
            severity,
            channel
        });

        const payload = {
            parentId: parent._id.toString(),
            parentName: parent.name,
            childId,
            message,
            severity,
            channel,
            sosId: sos._id.toString(),
            time: new Date()
        };

        req.app.get("io").to(childId).emit("sosAlert", payload);

        res.json({
            message: offline ? "SOS sent via SMS (2G fallback)" : "SOS sent to caregiver",
            childNotified: childId,
            severity,
            channel,
            sos
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/parent/:code/voice", async (req, res) => {
    try {
        const parent = await findParentByCode(req.params.code);
        if (!parent) {
            return res.status(404).json({ message: "Invalid parent code" });
        }

        const { spokenText = "Nanage sahaya beku", language = "kn" } = req.body || {};
        const translatedText = translations[language] || translations.en;
        const childId = parent.child?.toString();

        const payload = {
            parentId: parent._id.toString(),
            parentName: parent.name,
            childId,
            language,
            spokenText,
            translatedText,
            time: new Date()
        };

        req.app.get("io").to(childId).emit("voiceRequest", payload);

        res.json({
            message: "Voice request translated and sent",
            childNotified: childId,
            request: payload
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/parent/:code/reminder", async (req, res) => {
    try {
        const parent = await findParentByCode(req.params.code);
        if (!parent) {
            return res.status(404).json({ message: "Invalid parent code" });
        }

        const { type = "Medicine" } = req.body || {};
        res.json({
            message: `${type} reminder played on parent device`,
            parentId: parent._id,
            type,
            mode: "Audio + visual alert"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/caregiver/:childId/anomaly", async (req, res) => {
    try {
        const { type = "Heart spike", vitals = {} } = req.body || {};
        const payload = {
            childId: req.params.childId,
            type,
            vitals,
            severity: type.toLowerCase().includes("missed") ? "MEDIUM" : "HIGH",
            time: new Date()
        };

        req.app.get("io").to(req.params.childId).emit("anomalyAlert", payload);

        res.json({
            message: "Anomaly detected and caregiver notified",
            alert: payload
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/caregiver/:childId/service", async (req, res) => {
    try {
        const { service = "doctor", parentId } = req.body || {};
        const message = service === "medicine"
            ? "PharmEasy order placed"
            : "Practo booked";

        res.json({
            message,
            childId: req.params.childId,
            parentId,
            provider: service === "medicine" ? "PharmEasy/1mg" : "Practo"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/caregiver/:childId/alerts", async (req, res) => {
    try {
        const parents = await Parent.find({ child: req.params.childId }).select("_id");
        const parentIds = parents.map((parent) => parent._id);
        const alerts = await SOS.find({ parent: { $in: parentIds } })
            .populate("parent")
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({
            count: alerts.length,
            alerts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
