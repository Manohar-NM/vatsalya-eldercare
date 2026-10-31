const Health = require("../models/Health");

// add health data
exports.addHealth = async (req, res) => {
    try {
        const data = await Health.create(req.body);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// get health data for parent
exports.getHealth = async (req, res) => {
    try {
        const data = await Health.find({ parent: req.params.parentId });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};