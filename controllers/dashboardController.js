const Parent = require("../models/Parent");
const Health = require("../models/Health");

exports.getDashboard = async (req, res) => {
    try {
        const childId = req.params.childId;

        // 🛡️ SECURITY FIX: Verify logged-in caregiver can only access their own dashboard
        if (!req.user || req.user._id.toString() !== childId) {
            return res.status(403).json({ message: "Not authorized to access this caregiver dashboard" });
        }

        const parents = await Parent.find({ child: childId });

        const result = [];
        for (let parent of parents) {
            const health = await Health.find({ parent: parent._id }).sort({ timestamp: -1 }).limit(10);
            result.push({
                parent,
                health
            });
        }

        res.json(result);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};