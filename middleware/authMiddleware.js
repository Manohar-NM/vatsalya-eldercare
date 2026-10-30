const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Parent = require("../models/Parent");
const { getJwtSecret } = require("../utils/jwtSecret");

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, getJwtSecret());

      // Get user from DB
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found or deleted" });
      }

      req.user = user;
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  return res.status(401).json({ message: "Not authorized, no token" });
};

// Middleware: Authenticate caregiver token OR parent device code
const authenticateDeviceOrCaregiver = async (req, res, next) => {
  try {
    const parentId = req.params.parentId || req.body?.parentId;
    if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ message: "Valid parent ID is required" });
    }

    // 1. Caregiver JWT authentication
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, getJwtSecret());
        const user = await User.findById(decoded.id).select("-password");
        if (user) {
          const parent = await Parent.findOne({ _id: parentId, child: user._id });
          if (!parent) {
            return res.status(403).json({ message: "Not authorized to access or modify this parent's health data" });
          }
          req.user = user;
          req.parent = parent;
          req.authType = "caregiver";
          return next();
        }
      } catch (err) {
        return res.status(401).json({ message: "Invalid or expired caregiver token" });
      }
    }

    // 2. Parent device code authentication
    const deviceCode = req.headers["x-parent-code"] || req.headers["x-device-code"] || req.body?.uniqueCode;
    if (deviceCode) {
      const parent = await Parent.findOne({ _id: parentId, uniqueCode: String(deviceCode).trim().toUpperCase() });
      if (parent) {
        req.parent = parent;
        req.authType = "parent_device";
        return next();
      }
      return res.status(403).json({ message: "Invalid parent device code for this parent" });
    }

    // 3. Unauthenticated request rejected
    return res.status(401).json({ message: "Authentication required: Provide a caregiver token or parent device code" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { protect, authenticateDeviceOrCaregiver };
