const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const seedDatabase = require("./utils/seed");
const adminUserRoutes = require("./routes/admin.user.route");
const adminFeedbackRoutes = require("./routes/admin.feedback.route");
const kitchenRoutes = require("./routes/kitchen.routes");
const customerRoutes = require("./routes/customer.routes");
const authRoutes = require("./routes/auth.route");
const waiterRoutes = require("./routes/waiter.routes");
// load env
dotenv.config();

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
    seedDatabase();
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
app.use("/api/admin", adminUserRoutes);
app.use("/api/admin", adminFeedbackRoutes);

//chef
app.use("/api/kitchen", kitchenRoutes);

app.use("/api/customer", customerRoutes);

// waiter
// app.use("/api/waiter", waiterRoutes);

// export app để server.js dùng
module.exports = app;
