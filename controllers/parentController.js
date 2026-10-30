const Parent = require("../models/Parent");
const Health = require("../models/Health");
const { validateHealthMetrics } = require("./healthController");
const crypto = require("crypto");

// ========== CHILD (CAREGIVER) ACTIONS ==========

// CREATE PARENT (by child)
exports.createParent = async (req, res) => {
    try {
        const { name, age, location, phone, conditions, bloodType } = req.body;
        const childId = req.user._id; // from auth middleware

        const uniqueCode = "VAT-" + crypto.randomBytes(3).toString("hex").toUpperCase();

        const parent = await Parent.create({
            name,
            age,
            location,
            phone,
            conditions,
            bloodType,
            uniqueCode,
            child: childId
        });

        res.status(201).json({
            message: "Parent created successfully",
            parent,
            uniqueCode: parent.uniqueCode
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET ALL PARENTS (for logged-in child)
exports.getMyParents = async (req, res) => {
    try {
        const childId = req.user._id;
        const parents = await Parent.find({ child: childId });

        // Ensure health metrics originate only from genuine Health collection records
        const enriched = await Promise.all(
            parents.map(async (parent) => {
                const latestHealth = await Health.findOne({ parent: parent._id }).sort({ timestamp: -1 });
                const obj = typeof parent.toObject === "function" ? parent.toObject() : { ...parent };

                // If genuine health records exist, use latest measurements; otherwise null (unmeasured)
                obj.heartRate = latestHealth?.heartRate ?? null;
                obj.spO2 = latestHealth?.spO2 ?? null;
                obj.bloodPressure = latestHealth?.bloodPressure ?? null;
                obj.activity = latestHealth?.activity ?? null;
                obj.latestHealthTimestamp = latestHealth?.timestamp ?? null;
                return obj;
            })
        );

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET SINGLE PARENT BY ID
exports.getParentById = async (req, res) => {
    try {
        const parent = await Parent.findById(req.params.parentId);
        if (!parent) return res.status(404).json({ message: "Parent not found" });

        const latestHealth = await Health.findOne({ parent: parent._id }).sort({ timestamp: -1 });
        const obj = typeof parent.toObject === "function" ? parent.toObject() : { ...parent };
        obj.heartRate = latestHealth?.heartRate ?? null;
        obj.spO2 = latestHealth?.spO2 ?? null;
        obj.bloodPressure = latestHealth?.bloodPressure ?? null;
        obj.activity = latestHealth?.activity ?? null;
        obj.latestHealthTimestamp = latestHealth?.timestamp ?? null;

        res.json(obj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE PARENT PROFILE (by child)
exports.updateParentProfile = async (req, res) => {
    try {
        const { parentId } = req.params;
        const childId = req.user._id;
        const { name, age, location, phone, conditions, bloodType } = req.body;

        const parent = await Parent.findOne({ _id: parentId, child: childId });
        if (!parent) return res.status(404).json({ message: "Parent not found" });

        parent.name = name || parent.name;
        parent.age = age;
        parent.location = location || "";
        parent.phone = phone || "";
        parent.conditions = conditions || "";
        parent.bloodType = bloodType || "";

        await parent.save();
        res.json({ message: "Parent profile updated", parent });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ADD MEDICINE TO PARENT (by child)
exports.addMedicine = async (req, res) => {
    try {
        const { parentId } = req.params;
        const { name, dosage, frequency } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Medicine name is required" });
        }

        const parent = await Parent.findById(parentId);
        if (!parent) return res.status(404).json({ message: "Parent not found" });

        // Verify this parent belongs to the logged-in child
        if (parent.child.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        parent.medicines.push({
            name: name.trim(),
            dosage: typeof dosage === "string" ? dosage.trim() : "",
            frequency: typeof frequency === "string" ? frequency.trim() : "Daily"
        });
        await parent.save();

        // Notify parent device via socket
        const io = req.app.get("io");
        if (io) {
            io.to(`parent_${parent._id}`).emit("MEDICINE_UPDATED", {
                medicines: parent.medicines
            });
        }

        res.json({
            message: "Medicine added",
            medicines: parent.medicines
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// REMOVE MEDICINE FROM PARENT (by child)
exports.removeMedicine = async (req, res) => {
    try {
        const { parentId, medicineId } = req.params;

        const parent = await Parent.findById(parentId);
        if (!parent) return res.status(404).json({ message: "Parent not found" });

        if (parent.child.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        parent.medicines = parent.medicines.filter(
            m => m._id.toString() !== medicineId
        );
        await parent.save();

        // Notify parent device via socket of removal
        const io = req.app.get("io");
        if (io) {
            io.to(`parent_${parent._id}`).emit("MEDICINE_UPDATED", {
                medicines: parent.medicines
            });
        }

        res.json({
            message: "Medicine removed",
            medicines: parent.medicines
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// SAVE REMINDERS FOR PARENT (by child)
exports.updateReminders = async (req, res) => {
    try {
        const { parentId } = req.params;
        const { reminders } = req.body;

        const parent = await Parent.findById(parentId);
        if (!parent) return res.status(404).json({ message: "Parent not found" });

        if (parent.child.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        parent.reminders = reminders;
        await parent.save();

        const io = req.app.get("io");
        io.to(`parent_${parent._id}`).emit("REMINDERS_UPDATED", {
            reminders: parent.reminders
        });

        res.json({
            message: "Reminders saved",
            reminders: parent.reminders
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ADD DOCTOR APPOINTMENT (by child)
exports.addAppointment = async (req, res) => {
    try {
        const { parentId } = req.params;
        const { doctorName, specialty, date, time, notes } = req.body;

        const parent = await Parent.findById(parentId);
        if (!parent) return res.status(404).json({ message: "Parent not found" });

        if (parent.child.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        parent.appointments.push({ doctorName, specialty, date, time, notes });
        await parent.save();

        const io = req.app.get("io");
        io.to(`parent_${parent._id}`).emit("APPOINTMENTS_UPDATED", {
            appointments: parent.appointments
        });

        res.json({
            message: "Appointment added",
            appointments: parent.appointments
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ========== PARENT DEVICE ACTIONS ==========

// LOGIN BY UNIQUE CODE (parent device)
exports.loginByCode = async (req, res) => {
    try {
        const { uniqueCode } = req.body;

        const parent = await Parent.findOne({ uniqueCode });
        if (!parent) {
            return res.status(404).json({ message: "Invalid code. Parent not found." });
        }

        res.json({
            message: "Parent device connected",
            parent
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ORDER MEDICINES (from parent device)
exports.orderMedicines = async (req, res) => {
    try {
        const { parentId, medicineIds } = req.body;

        const parent = await Parent.findById(parentId);
        if (!parent) return res.status(404).json({ message: "Parent not found" });

        // Get ordered medicine names
        const orderedMedicines = parent.medicines.filter(
            m => medicineIds.includes(m._id.toString())
        );

        // Notify the child via socket
        const io = req.app.get("io");
        const childId = parent.child.toString();

        io.to(childId).emit("MEDICINE_ORDER", {
            parentId: parent._id,
            parentName: parent.name,
            medicines: orderedMedicines,
            time: new Date()
        });

        console.log("💊 Medicine order sent to child:", childId);

        res.json({
            message: "Medicine order placed! Your caregiver has been notified.",
            orderedMedicines
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// SEND VOICE MESSAGE (from parent device)
exports.sendVoiceMessage = async (req, res) => {
    try {
        const { parentId, originalText, translatedText, language } = req.body;

        const parent = await Parent.findById(parentId);
        if (!parent) return res.status(404).json({ message: "Parent not found" });

        const message = {
            parentId: parent._id,
            parentName: parent.name,
            originalText: originalText || "",
            translatedText: translatedText || originalText || "Parent sent a voice message.",
            language: language || "auto",
            time: new Date()
        };

        const io = req.app.get("io");
        io.to(parent.child.toString()).emit("VOICE_MESSAGE", message);

        res.json({
            message: "Voice message sent to caregiver",
            voiceMessage: message
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ADD DAILY ACTIVITY (from parent device)
exports.addActivity = async (req, res) => {
    try {
        const { parentId, title, targetMinutes } = req.body;

        const parent = await Parent.findById(parentId);
        if (!parent) return res.status(404).json({ message: "Parent not found" });

        parent.activities.push({
            title,
            targetMinutes: Number(targetMinutes) || 15
        });
        await parent.save();

        res.json({
            message: "Activity added",
            activities: parent.activities
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// START OR FINISH DAILY ACTIVITY (from parent device)
exports.updateActivity = async (req, res) => {
    try {
        const { parentId, activityId } = req.params;
        const { action } = req.body;

        const parent = await Parent.findById(parentId);
        if (!parent) return res.status(404).json({ message: "Parent not found" });

        const activity = parent.activities.id(activityId);
        if (!activity) return res.status(404).json({ message: "Activity not found" });

        if (action === "start") {
            activity.status = "active";
            activity.startedAt = new Date();
            activity.completedAt = undefined;
            activity.elapsedSeconds = 0;
            activity.score = 0;
        }

        if (action === "finish") {
            const startedAt = activity.startedAt || new Date();
            const elapsedSeconds = Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
            const targetSeconds = Math.max(60, (Number(activity.targetMinutes) || 15) * 60);
            activity.status = "completed";
            activity.completedAt = new Date();
            activity.elapsedSeconds = elapsedSeconds;
            activity.score = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));
        }

        await parent.save();

        res.json({
            message: "Activity updated",
            activities: parent.activities
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE PARENT HEALTH DATA (authenticated device or caregiver)
exports.updateHealth = async (req, res) => {
    try {
        const { parentId } = req.params;
        const { heartRate, spO2, bloodPressure, activity } = req.body || {};

        const validation = validateHealthMetrics({ heartRate, spO2, bloodPressure, activity });
        if (validation.error) {
            return res.status(400).json({ message: validation.error });
        }

        const parent = await Parent.findByIdAndUpdate(
            parentId,
            validation.payload,
            { new: true }
        );

        if (!parent) return res.status(404).json({ message: "Parent not found" });

        // Preserve historical measurement in Health collection
        const healthDoc = await Health.create({
            parent: parent._id,
            ...validation.payload,
            recordedBy: req.authType || "parent_device",
            timestamp: new Date()
        });

        // Notify child dashboard
        const io = req.app?.get("io");
        if (io) {
            io.to(parent.child.toString()).emit("HEALTH_UPDATE", {
                parentId: parent._id,
                ...validation.payload,
                timestamp: healthDoc.timestamp
            });
        }

        res.json({ message: "Health data updated", parent, healthRecord: healthDoc });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
