const express = require("express");
const router = express.Router();

const { 
    createUser, 
    getUsers, 
    registerUser, 
    loginUser 
} = require("../controllers/userController");

// existing routes
router.post("/create", createUser);
router.get("/all", getUsers);

// 🔐 new auth routes
router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;