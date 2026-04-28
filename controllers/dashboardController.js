const Parent = require("../models/Parent");
const Health = require("../models/Health");

exports.getDashboard = async (req, res) => {
    try {
        const childId = req.params.childId;

        const parents = await Parent.find({ child: childId });

        const result = [];

        for (let parent of parents) {
            const health = await Health.find({ parent: parent._id });

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