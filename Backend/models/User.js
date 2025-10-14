const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: String,
    username: { type: String, unique: true },
    password: String,
    email: { type: String, unique: true },
    phone: String,
    role: {
      type: String,
      enum: ["admin", "cashier", "waiter", "chef", "customer"],
      default: "customer",
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    point: {
      type: Number,
      default: function () {
        return this.role === "customer" ? 0 : undefined;
      },
    },
    accountStatus: {
  type: String,
  enum: ["active", "banned"],
  default: "active"
}

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
