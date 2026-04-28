const mongoose = require("mongoose");

const sosSchema = new mongoose.Schema({
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Parent"
    },
    message: String,
    severity: {
        type: String,
        default: "NORMAL"
    },
    channel: {
        type: String,
        default: "ONLINE"
    },
    status: {
        type: String,
        default: "ACTIVE"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("SOS", sosSchema);
