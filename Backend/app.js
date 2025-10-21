const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const seedDatabase = require("./utils/seed");
const authRoutes = require("./routes/auth.route");

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
//auth
app.use("/api/auth", authRoutes);
//admin
app.use("/api/admin", require("./routes/admin.route.js"));

// export app để server.js dùng
module.exports = app;
