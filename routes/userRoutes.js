const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimitMiddleware");

const { 
    getUsers, 
    registerUser, 
    loginUser 
} = require("../controllers/userController");

// 🔐 Auth routes (rate-limited against brute-force and spam)
router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);

// 🛡️ Protected routes (requires valid caregiver/admin JWT)
router.get("/all", protect, getUsers);

module.exports = router;
