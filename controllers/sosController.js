const SOS = require("../models/SOS");
const Parent = require("../models/Parent");

// TRIGGER SOS (from parent device - no auth needed)
exports.createSOS = async (req, res) => {
    try {
        const { parentId, message } = req.body;

        if (!parentId) {
            return res.status(400).json({ message: "parentId is required" });
        }

        const parent = await Parent.findById(parentId);
        if (!parent) {
            return res.status(404).json({ message: "Parent not found" });
        }

        const childId = parent.child.toString();

        const sos = await SOS.create({
            parent: parent._id,
            message: message || "Emergency alert from " + parent.name,
            severity: "HIGH",
            channel: "ONLINE",
            status: "ACTIVE"
        });

        // Send alert to ONLY the corresponding child
        const io = req.app.get("io");
        io.to(childId).emit("SOS_ALERT", {
            sosId: sos._id,
            parentId: parent._id.toString(),
            parentName: parent.name,
            message: sos.message,
            severity: sos.severity,
            time: new Date()
        });

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

// RESOLVE SOS
exports.resolveSOS = async (req, res) => {
    try {
        const sos = await SOS.findByIdAndUpdate(
            req.params.sosId,
            { status: "RESOLVED" },
            { new: true }
        );
        if (!sos) return res.status(404).json({ message: "SOS not found" });

        res.json({ message: "SOS resolved", sos });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
