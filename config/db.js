const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        console.error("Preview will stay online, but database-backed actions need MongoDB.");
    }
};

module.exports = connectDB;
