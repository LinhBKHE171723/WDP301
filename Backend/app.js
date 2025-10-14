const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const seedDatabase = require("./utils/seed");
const adminUserRoutes = require("./routes/admin.user.route");
const authRoutes = require("./routes/auth.route");
const adminFeedbackRoutes = require("./routes/admin.feedback.route");

// load env
dotenv.config();

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

// routes
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/admin/feedbacks", adminFeedbackRoutes);
app.use("/api/admin", adminUserRoutes);
app.use("/api/auth", authRoutes);
// export app để server.js dùng
module.exports = app;
