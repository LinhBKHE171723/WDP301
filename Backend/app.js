const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const seedDatabase = require("./utils/seed");
const kitchenRoutes = require("./routes/kitchen.routes");
const customerRoutes = require("./routes/customer.routes");
const authRoutes = require("./routes/auth.route");
const waiterRoutes = require("./routes/waiter.routes");
const cloudinary = require("./routes/cloudinary.route");
const userRoutes = require("./routes/user.route");
// load env
dotenv.config();
const { checkExpiryAndUpdateStock } = require("./utils/checkExpiryAndUpdateStock.js");

const app = express();

// middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());
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
app.use("/api/admin", require("./routes/admin.route.js"));

//CLOUD
app.use("/api/cloudinary", cloudinary);

// profile 
app.use("/api/user", userRoutes);

//chef
app.use("/api/kitchen", kitchenRoutes);

//customer
app.use("/api/customer", customerRoutes);

// waiter
app.use("/api/waiter", waiterRoutes);

// export app để server.js dùng
module.exports = app;