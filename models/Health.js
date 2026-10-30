const mongoose = require("mongoose");

const healthSchema = new mongoose.Schema({
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Parent",
        required: true
    },
    heartRate: {
        type: Number,
        min: [30, "Heart rate must be at least 30 bpm"],
        max: [250, "Heart rate cannot exceed 250 bpm"]
    },
    spO2: {
        type: Number,
        min: [50, "SpO2 must be at least 50%"],
        max: [100, "SpO2 cannot exceed 100%"]
    },
    bloodPressure: {
        type: String,
        trim: true
    },
    steps: {
        type: Number,
        min: [0, "Steps cannot be negative"]
    },
    activity: {
        type: String,
        trim: true,
        maxLength: 100
    },
    recordedBy: {
        type: String,
        enum: ["caregiver", "parent_device", "manual"],
        default: "caregiver"
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Health", healthSchema);
