const mongoose = require("mongoose");

const sanitizeLegacyParentDefaults = async () => {
    try {
        const Parent = require("../models/Parent");
        const Health = require("../models/Health");
        const parents = await Parent.find({});
        for (const parent of parents) {
            const hasHealth = await Health.exists({ parent: parent._id });
            if (!hasHealth && (parent.heartRate !== null || parent.spO2 !== null || parent.bloodPressure !== null || parent.activity !== null)) {
                await Parent.updateOne(
                    { _id: parent._id },
                    { $set: { heartRate: null, spO2: null, bloodPressure: null, activity: null } }
                );
            }
        }
    } catch {
        // non-blocking
    }
};

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
        await sanitizeLegacyParentDefaults();
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        console.error("Preview will stay online, but database-backed actions need MongoDB.");
    }
};

module.exports = connectDB;
