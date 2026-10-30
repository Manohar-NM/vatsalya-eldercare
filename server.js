const express = require("express");
const dotenv = require("dotenv");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("./utils/jwtSecret");
const Parent = require("./models/Parent");

// Load env
dotenv.config();

// DB
const connectDB = require("./config/db");
connectDB();

const app = express();

if (process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const localOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174"
];

const envOrigins = (process.env.CLIENT_URL || process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...localOrigins, ...envOrigins])];

/* =========================
   🔥 CORS FIX (VERY IMPORTANT)
========================= */
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

/* =========================
   🔥 CREATE HTTP SERVER
========================= */
const server = http.createServer(app);

/* =========================
   🔥 SOCKET.IO SETUP
========================= */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

/* =========================
   🔥 MAKE SOCKET AVAILABLE IN ROUTES
========================= */
app.set("io", io);

/* =========================
   🔥 SOCKET CONNECTION
========================= */
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  // 🛡️ SECURE ROOM JOINING (verifies authorization before joining)
  socket.on("joinRoom", async (roomArg, authArg, callback) => {
    try {
      let room = "";
      let token = socket.handshake.auth?.token;
      let uniqueCode = socket.handshake.auth?.uniqueCode;

      if (typeof roomArg === "object" && roomArg !== null) {
        room = roomArg.room || roomArg.childId || roomArg.roomId || "";
        token = roomArg.token || token;
        uniqueCode = roomArg.uniqueCode || uniqueCode;
      } else {
        room = String(roomArg || "").trim();
        if (typeof authArg === "object" && authArg !== null) {
          token = authArg.token || token;
          uniqueCode = authArg.uniqueCode || uniqueCode;
        } else if (typeof authArg === "string") {
          token = authArg;
        }
      }

      if (!room) {
        socket.emit("roomError", { message: "Room name is required" });
        if (typeof callback === "function") callback({ success: false, error: "Missing room" });
        return;
      }

      // Check if it's a parent device room: "parent_<parentId>"
      if (room.startsWith("parent_")) {
        const parentId = room.replace("parent_", "");
        let authorized = false;

        if (uniqueCode) {
          const parent = await Parent.findOne({ _id: parentId, uniqueCode });
          if (parent) authorized = true;
        }

        if (!authorized && token) {
          try {
            const decoded = jwt.verify(token, getJwtSecret());
            const parent = await Parent.findOne({ _id: parentId, child: decoded.id });
            if (parent) authorized = true;
          } catch {
            // invalid token
          }
        }

        if (!authorized) {
          console.warn(`🚨 Unauthorized room join rejected for parent room: ${room} (Socket: ${socket.id})`);
          socket.emit("roomError", { message: "Unauthorized to join this parent room" });
          if (typeof callback === "function") callback({ success: false, error: "Unauthorized" });
          return;
        }

        socket.join(room);
        console.log(`✅ Socket ${socket.id} authorized & joined parent room:`, room);
        if (typeof callback === "function") callback({ success: true, room });
        return;
      }

      // Caregiver room (childId): MUST provide a valid JWT matching the requested childId
      let authorized = false;
      if (token) {
        try {
          const decoded = jwt.verify(token, getJwtSecret());
          if (decoded && decoded.id && decoded.id.toString() === room) {
            authorized = true;
          }
        } catch {
          // invalid token
        }
      }

      if (!authorized) {
        console.warn(`🚨 Unauthorized room join rejected for caregiver room: ${room} (Socket: ${socket.id})`);
        socket.emit("roomError", { message: "Unauthorized: Valid caregiver authentication token required to join this room" });
        if (typeof callback === "function") callback({ success: false, error: "Unauthorized" });
        return;
      }

      socket.join(room);
      console.log(`✅ Socket ${socket.id} authorized & joined caregiver room:`, room);
      if (typeof callback === "function") callback({ success: true, room });

    } catch (err) {
      console.error("Error in joinRoom handler:", err.message);
      socket.emit("roomError", { message: "Internal server error joining room" });
      if (typeof callback === "function") callback({ success: false, error: err.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

/* =========================
   🔥 ROUTES
========================= */
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const parentRoutes = require("./routes/parentRoutes");
app.use("/api/parents", parentRoutes);

const sosRoutes = require("./routes/sosRoutes");
app.use("/api/sos", sosRoutes);

const healthRoutes = require("./routes/healthRoutes");
app.use("/api/health", healthRoutes);

const dashboardRoutes = require("./routes/dashboardRoutes");
app.use("/api/dashboard", dashboardRoutes);

const nearbyRoutes = require("./routes/nearbyRoutes");
app.use("/api/nearby", nearbyRoutes);

const aiRoutes = require("./routes/aiRoutes");
app.use("/api/ai", aiRoutes);

/* =========================
   🔥 TEST ROUTE
========================= */
app.get("/", (req, res) => {
  res.send("Vatsalya Backend Running 🚀");
});

/* =========================
   🔥 SERVER START
========================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
