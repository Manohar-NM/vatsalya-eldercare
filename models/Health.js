const mongoose = require("mongoose");

const healthSchema = new mongoose.Schema({
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Parent"
    },
    heartRate: Number,
    steps: Number,
    activity: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Health", healthSchema);