const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên không được để trống."],
      trim: true,
    },
    username: {
      type: String,
      required: [true, "Tên đăng nhập không được để trống."],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email không được để trống."],
      unique: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Vui lòng nhập một địa chỉ email hợp lệ.",
      ],
    },
    password: {
      type: String,
      required: [true, "Mật khẩu không được để trống."],
      minlength: [6, "Mật khẩu phải có ít nhất 6 ký tự."],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: [
        "admin",
        "cashier",
        "waiter",
        "chef",
        "customer",
        "kitchen_manager",
      ],
      default: "customer",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    point: {
      type: Number,
      default: function () {
        return this.role === "customer" ? 0 : undefined;
      },
    },
  },
  { timestamps: true }
);

// Middleware: Tự động BĂM MẬT KHẨU trước khi lưu vào DB
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
