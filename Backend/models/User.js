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
        // Regex kiểm tra định dạng email hợp lệ
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
    avatar: {
      type: String, // URL ảnh từ Cloudinary
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png"
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
    //  Trạng thái đi làm việc (chỉ có cho nhân viên)
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    // ⭐ Điểm tích lũy (chỉ có cho khách hàng)
    point: {
      type: Number,
      default: function () {
        return this.role === "customer" ? 0 : undefined;
      },

    },
    accountStatus: {
  type: String,
  enum: ["active", "banned"],
  default: "active",
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
  this.password = await bcrypt.hash(this.password, salt); // Băm mật khẩu bằng thuật toán bcrypt + salt
  next();
});

//  Hàm so sánh mật khẩu khi đăng nhập (.method làm định nghĩa hàm cho instance)
userSchema.methods.comparePassword = function (enteredPassword) {
  // So sánh mật khẩu người dùng nhập với mật khẩu đã băm trong DB
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
