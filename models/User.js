const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    age: Number,
    email: { type: String, unique: true },
    password: String,

    role: {
        type: String,
        enum: ["child", "parent"],
        default: "child"
    }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);