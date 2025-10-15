const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const seedDatabase = require("./utils/seed");
// load env
dotenv.config();
// import route
const adminUserRoutes = require("./routes/admin.user.route");
const adminFeedbackRoutes = require("./routes/admin.feedback.route");
const kitchenRoutes = require("./routes/kitchen.routes");
const authRoutes = require("./routes/auth.route");
const tableRoutes = require("./routes/admin.tablemap.route");
// import middleware
const authMiddleware = require("./middlewares/auth.middleware");

const app = express();



// middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    // seedDatabase();
    console.log("✅ MongoDB connected");
  })
  .catch((err) => console.error(" MongoDB connection error:", err));

//2. routes
app.get("/", (req, res) => {
  res.send("API is running...");
});
app.use("/api/admin", adminUserRoutes);
app.use("/api/admin", adminFeedbackRoutes);
// api login
app.use("/api/auth", authRoutes);

//chef
app.use("/api/kitchen", kitchenRoutes);

// table routes
app.use("/api/tables", tableRoutes);


// Protected example: get current user
app.get("/api/users/me", authMiddleware.authenticateUser, (req, res) => {
  res.json({ user: req.user });
});

// Example protected role-based route
app.get("/api/staff/dashboard", authMiddleware.authenticateUser, (req, res) => {
  if (!["waiter", "admin", "cashier", "chef"].includes(req.user.role))
    return res.status(403).json({ message: "Forbidden" });
  res.json({ message: "Welcome to staff dashboard", user: req.user });
});

// simple health
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

//3. export app để server.js dùng
module.exports = app;
