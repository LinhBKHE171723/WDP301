const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const seedDatabase = require("./utils/seed");
const authRoutes = require("./routes/auth.route");
dotenv.config();
const { checkExpiryAndUpdateStock } = require("./utils/checkExpiryAndUpdateStock.js");

const app = express();

// middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.disable("etag");

// connect to MongoDB
mongoose

  // .connect(process.env.MONGO_URI)
  .connect(process.env.MONGO_URI)
  .then(() => {
    // Chạy 1 lần khi server khởi động
checkExpiryAndUpdateStock();
// Lên lịch chạy 1 lần/ngày
setInterval(checkExpiryAndUpdateStock, 24 * 60 * 60 * 1000); // 24h
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