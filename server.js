const express = require("express");
const dotenv = require("dotenv");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// Load env
dotenv.config();

// DB
const connectDB = require("./config/db");
connectDB();

const app = express();

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

  // JOIN ROOM (childId)
  socket.on("joinRoom", (childId) => {
    socket.join(childId);
    console.log("👶 Child joined room:", childId);
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
