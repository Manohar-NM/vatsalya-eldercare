const express = require("express");
const router = express.Router();
const { protect, authenticateDeviceOrCaregiver } = require("../middleware/authMiddleware");
const { deviceLoginLimiter } = require("../middleware/rateLimitMiddleware");

const {
    createParent,
    getMyParents,
    getParentById,
    updateParentProfile,
    addMedicine,
    removeMedicine,
    updateReminders,
    addAppointment,
    loginByCode,
    orderMedicines,
    sendVoiceMessage,
    addActivity,
    updateActivity,
    updateHealth
} = require("../controllers/parentController");

// ===== CHILD (CAREGIVER) ROUTES - Protected =====
router.post("/", protect, createParent);
router.get("/my-parents", protect, getMyParents);
router.put("/reminders/:parentId", protect, updateReminders);
router.post("/:parentId/appointments", protect, addAppointment);
router.put("/:parentId", protect, updateParentProfile);
router.get("/:parentId", protect, getParentById);

// Medicine management (by child)
router.post("/:parentId/medicine", protect, addMedicine);
router.delete("/:parentId/medicine/:medicineId", protect, removeMedicine);

// ===== PARENT DEVICE ROUTES =====
router.post("/device/login", deviceLoginLimiter, loginByCode);
router.post("/device/order", orderMedicines);
router.post("/device/voice-message", sendVoiceMessage);
router.post("/device/activity", addActivity);
router.put("/device/:parentId/activity/:activityId", updateActivity);
// Health updates require device authentication or caregiver token
router.put("/device/:parentId/health", authenticateDeviceOrCaregiver, updateHealth);

module.exports = router;
