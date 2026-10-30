const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../utils/jwtSecret");

// 🔐 REGISTER
exports.registerUser = async (req, res) => {
    try {
        const { name, age, email, password } = req.body || {};

        if (!name || typeof name !== "string" || name.trim().length < 2) {
            return res.status(400).json({ message: "Full name is required (minimum 2 characters)" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
            return res.status(400).json({ message: "A valid email address is required" });
        }

        if (!password || typeof password !== "string" || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const parsedAge = age !== undefined && age !== "" ? Number(age) : undefined;
        if (parsedAge !== undefined && (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130)) {
            return res.status(400).json({ message: "Please provide a valid age" });
        }

        const user = await User.create({
            name: name.trim(),
            age: parsedAge,
            email: normalizedEmail,
            password: hashedPassword
        });

        // 🛡️ SECURITY FIX: Never return password or password hash
        res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: user._id,
                name: user.name,
                age: user.age,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🔑 LOGIN
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(String(password), user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: user._id },
            getJwtSecret(),
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🛡️ SAFE CREATE USER (delegates to registerUser rules with hashing and validation)
exports.createUser = async (req, res) => {
    return exports.registerUser(req, res);
};

// 🆕 GET USERS (sanitized query - excludes password hashes)
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
