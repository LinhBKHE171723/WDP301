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
const cashierRoutes = require("./routes/cashier.routes");
const cloudinary = require("./routes/cloudinary.route");
const userRoutes = require("./routes/user.route");
// load env
dotenv.config();
const { checkExpiryAndUpdateStock } = require("./utils/checkExpiryAndUpdateStock.js");

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      process.env.CLIENT_URL,
      process.env.APP_URL
    ].filter(Boolean); // Remove undefined values
    
    // In development, allow localhost
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
    }
    
    if (allowedOrigins.length === 0 || allowedOrigins.some(url => origin.startsWith(url))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.disable("etag");

// connect to MongoDB
mongoose
  // .connect(process.env.MONGO_URI)
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");
    seedDatabase();
    console.log("✅ Database seeding completed");
    // Sau khi DB đã có dữ liệu, require cron
    require("./utils/cron");
    console.log("⏰ Cron jobs started");


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

// cashier
app.use("/api/cashier", cashierRoutes);

// export app để server.js dùng
module.exports = app;