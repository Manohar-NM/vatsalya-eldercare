const Health = require("../models/Health");
const Parent = require("../models/Parent");
const mongoose = require("mongoose");
const { analyzeHealthTrends, getPeriodStartDate } = require("../services/healthTrendService");

// Validation helper for health measurements
const validateHealthMetrics = ({ heartRate, spO2, steps, bloodPressure, activity }) => {
    const payload = {};
    let hasMetric = false;

    if (heartRate !== undefined && heartRate !== null && heartRate !== "") {
        const hr = Number(heartRate);
        if (Number.isNaN(hr) || hr < 30 || hr > 250) {
            return { error: "Invalid heart rate. Must be a number between 30 and 250 bpm." };
        }
        payload.heartRate = Math.round(hr);
        hasMetric = true;
    }

    if (spO2 !== undefined && spO2 !== null && spO2 !== "") {
        const ox = Number(spO2);
        if (Number.isNaN(ox) || ox < 50 || ox > 100) {
            return { error: "Invalid SpO2 level. Must be a number between 50 and 100%." };
        }
        payload.spO2 = Math.round(ox);
        hasMetric = true;
    }

    if (steps !== undefined && steps !== null && steps !== "") {
        const st = Number(steps);
        if (Number.isNaN(st) || st < 0 || !Number.isFinite(st)) {
            return { error: "Invalid steps count. Must be a non-negative number." };
        }
        payload.steps = Math.round(st);
        hasMetric = true;
    }

    if (bloodPressure !== undefined && bloodPressure !== null && bloodPressure !== "") {
        if (typeof bloodPressure !== "string" || !/^\d{2,3}\/\d{2,3}$/.test(bloodPressure.trim())) {
            return { error: "Invalid blood pressure format. Must match SYS/DIA (e.g. 120/80)." };
        }
        payload.bloodPressure = bloodPressure.trim();
        hasMetric = true;
    }

    if (activity !== undefined && activity !== null && activity !== "") {
        if (typeof activity !== "string") {
            return { error: "Activity description must be a string." };
        }
        payload.activity = activity.trim().slice(0, 100);
        hasMetric = true;
    }

    if (!hasMetric) {
        return { error: "At least one valid health measurement (heartRate, spO2, bloodPressure, steps, or activity) must be provided." };
    }

    return { payload };
};

// add health data (authenticated, verified parent ownership)
exports.addHealth = async (req, res) => {
    try {
        const { parent: parentId, heartRate, spO2, steps, bloodPressure, activity, recordedBy } = req.body || {};

        if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
            return res.status(400).json({ message: "Valid parent ID is required" });
        }

        const parent = await Parent.findOne({ _id: parentId, child: req.user._id });
        if (!parent) {
            return res.status(403).json({ message: "Not authorized to add health data for this parent" });
        }

        const validation = validateHealthMetrics({ heartRate, spO2, steps, bloodPressure, activity });
        if (validation.error) {
            return res.status(400).json({ message: validation.error });
        }

        const healthDoc = await Health.create({
            parent: parent._id,
            ...validation.payload,
            recordedBy: ["caregiver", "parent_device", "manual"].includes(recordedBy) ? recordedBy : "caregiver",
            timestamp: new Date()
        });

        // Update latest vitals on Parent model
        const parentUpdates = {};
        if (validation.payload.heartRate !== undefined) parentUpdates.heartRate = validation.payload.heartRate;
        if (validation.payload.spO2 !== undefined) parentUpdates.spO2 = validation.payload.spO2;
        if (validation.payload.bloodPressure !== undefined) parentUpdates.bloodPressure = validation.payload.bloodPressure;
        if (validation.payload.activity !== undefined) parentUpdates.activity = validation.payload.activity;

        if (Object.keys(parentUpdates).length > 0) {
            await Parent.findByIdAndUpdate(parent._id, parentUpdates);
        }

        // Notify caregiver dashboard via socket if available
        const io = req.app?.get("io");
        if (io) {
            io.to(req.user._id.toString()).emit("HEALTH_UPDATE", {
                parentId: parent._id,
                ...parentUpdates,
                timestamp: healthDoc.timestamp
            });
        }

        res.status(201).json(healthDoc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// get health data for parent (authenticated, verified parent ownership)
exports.getHealth = async (req, res) => {
    try {
        const { parentId } = req.params;

        if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
            return res.status(400).json({ message: "Valid parent ID is required" });
        }

        const parent = await Parent.findOne({ _id: parentId, child: req.user._id });
        if (!parent) {
            return res.status(403).json({ message: "Not authorized to view health data for this parent" });
        }

        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
        const data = await Health.find({ parent: parentId }).sort({ timestamp: -1 }).limit(limit);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// get health trends and pattern analysis for parent (authenticated, verified parent ownership)
exports.getHealthTrends = async (req, res) => {
    try {
        const { parentId } = req.params;
        const requestedPeriod = String(req.query.period || "week").toLowerCase();

        const validPeriods = ["day", "week", "month", "all"];
        if (!validPeriods.includes(requestedPeriod)) {
            return res.status(400).json({
                success: false,
                message: "Invalid period. Must be one of: 'day', 'week', 'month', or 'all'."
            });
        }

        if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
            return res.status(400).json({ success: false, message: "Valid parent ID is required" });
        }

        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: "Caregiver authentication required" });
        }

        const parent = await Parent.findOne({ _id: parentId, child: req.user._id });
        if (!parent) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to view health trends for this parent or parent not found"
            });
        }

        const startDate = getPeriodStartDate(requestedPeriod);
        const query = { parent: parentId };
        if (startDate) {
            query.timestamp = { $gte: startDate };
        }

        const records = await Health.find(query).sort({ timestamp: 1 }).limit(300).lean();

        const analysis = analyzeHealthTrends({
            parent,
            healthRecords: records,
            period: requestedPeriod
        });

        res.json({
            success: true,
            parent: {
                id: parent._id,
                name: parent.name,
                age: parent.age
            },
            ...analysis
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.validateHealthMetrics = validateHealthMetrics;
