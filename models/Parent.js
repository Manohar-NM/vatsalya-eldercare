const mongoose = require("mongoose");

const parentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: Number,
    location: String,
    phone: String,
    conditions: String,
    bloodType: String,

    uniqueCode: {
        type: String,
        unique: true,
        sparse: true
    },

    // Link to child (caregiver)
    child: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // Medicines added by child
    medicines: [{
        name: { type: String, required: true },
        dosage: String,
        frequency: String,
        addedAt: { type: Date, default: Date.now }
    }],

    // Reminders configured by child/caregiver for the parent device
    reminders: {
        water: {
            enabled: { type: Boolean, default: false },
            intervalMinutes: { type: Number, default: 60 },
            startTime: { type: String, default: "08:00" },
            endTime: { type: String, default: "20:00" }
        },
        food: {
            breakfast: { type: String, default: "" },
            lunch: { type: String, default: "" },
            dinner: { type: String, default: "" }
        },
        medicines: [{
            name: { type: String, required: true },
            times: [{ type: String }],
            timesPerDay: { type: Number, default: 1 }
        }]
    },

    appointments: [{
        doctorName: { type: String, required: true },
        specialty: String,
        date: { type: String, required: true },
        time: { type: String, required: true },
        notes: String,
        createdAt: { type: Date, default: Date.now }
    }],

    activities: [{
        title: { type: String, required: true },
        targetMinutes: { type: Number, default: 15 },
        status: { type: String, enum: ["pending", "active", "completed"], default: "pending" },
        startedAt: Date,
        completedAt: Date,
        elapsedSeconds: { type: Number, default: 0 },
        score: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now }
    }],

    // Health data
    heartRate: { type: Number, default: 72 },
    spO2: { type: Number, default: 98 },
    bloodPressure: { type: String, default: "120/80" },
    activity: { type: String, default: "Normal" }

}, { timestamps: true });

module.exports = mongoose.model("Parent", parentSchema);
