const SOS = require("../models/SOS");
const Parent = require("../models/Parent");
const mongoose = require("mongoose");

// TRIGGER SOS (from parent device - no auth needed)
exports.createSOS = async (req, res) => {
    try {
        const { parentId, message } = req.body || {};

        if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
            return res.status(400).json({ message: "Valid parentId is required" });
        }

        const parent = await Parent.findById(parentId);
        if (!parent) {
            return res.status(404).json({ message: "Parent not found" });
        }

        const childId = parent.child ? parent.child.toString() : null;
        if (!childId) {
            return res.status(500).json({ message: "Parent record is missing associated caregiver link" });
        }

        const cleanMessage = typeof message === "string" && message.trim()
            ? message.trim().slice(0, 500)
            : "Emergency alert from " + parent.name;

        const sos = await SOS.create({
            parent: parent._id,
            message: cleanMessage,
            severity: "HIGH",
            channel: "ONLINE",
            status: "ACTIVE"
        });

        // Send alert to ONLY the corresponding child
        const io = req.app.get("io");
        if (io) {
            io.to(childId).emit("SOS_ALERT", {
                sosId: sos._id,
                parentId: parent._id.toString(),
                parentName: parent.name,
                location: parent.location || "",
                phone: parent.phone || "",
                message: sos.message,
                severity: sos.severity,
                time: new Date()
            });
        }

        console.log("🚨 SOS ALERT sent to child:", childId, "from parent:", parent.name);

        res.json({
            message: "SOS triggered successfully! Your caregiver has been alerted.",
            sos,
            childNotified: childId
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET SOS ALERTS (for logged-in child)
exports.getSOS = async (req, res) => {
    try {
        const childId = req.user._id;

        // Get all parents of this child
        const parents = await Parent.find({ child: childId });
        const parentIds = parents.map(p => p._id);

        // Get SOS alerts only for this child's parents
        const data = await SOS.find({ parent: { $in: parentIds } })
            .populate("parent", "name uniqueCode")
            .sort({ createdAt: -1 });

        res.json({
            count: data.length,
            sos: data
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🛡️ RESOLVE SOS (Authorized caregiver ownership check)
exports.resolveSOS = async (req, res) => {
    try {
        const { sosId } = req.params;

        if (!sosId || !mongoose.Types.ObjectId.isValid(sosId)) {
            return res.status(400).json({ message: "Valid sosId is required" });
        }

        const sos = await SOS.findById(sosId).populate("parent");
        if (!sos) {
            return res.status(404).json({ message: "SOS alert not found" });
        }

        // 🛡️ SECURITY FIX: Verify the SOS alert's parent belongs to the logged-in caregiver
        if (!sos.parent || !sos.parent.child || sos.parent.child.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to resolve this SOS alert" });
        }

        sos.status = "RESOLVED";
        await sos.save();

        const io = req.app.get("io");
        if (io) {
            io.to(req.user._id.toString()).emit("SOS_RESOLVED", {
                sosId: sos._id,
                parentId: sos.parent._id,
                resolvedAt: new Date()
            });
            io.to(`parent_${sos.parent._id}`).emit("SOS_RESOLVED", {
                sosId: sos._id,
                resolvedAt: new Date()
            });
        }

        res.json({ message: "SOS resolved successfully", sos });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

