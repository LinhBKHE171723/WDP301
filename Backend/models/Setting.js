const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Key không được để trống"],
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Value không được để trống"],
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["preorder", "payment", "general", "notification"],
      default: "general",
    },
  },
  { timestamps: true }
);

// Index cho category để query nhanh hơn
settingSchema.index({ category: 1 });

// Static method: Lấy setting theo key
settingSchema.statics.getSetting = async function (key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method: Cập nhật hoặc tạo setting
settingSchema.statics.setSetting = async function (key, value, description = null, category = "general") {
  // Đảm bảo value được lưu đúng type (đặc biệt cho number)
  let finalValue = value;
  if (key === "preorder.largeOrderThreshold") {
    finalValue = typeof value === "number" ? value : Number(value);
    if (isNaN(finalValue)) {
      throw new Error("Invalid number value for preorder.largeOrderThreshold");
    }
  }
  
  const result = await this.findOneAndUpdate(
    { key },
    { value: finalValue, description, category },
    { upsert: true, new: true }
  );
  
  console.log(`✅ Setting saved: ${key} = ${finalValue} (type: ${typeof finalValue})`);
  return result;
};

// Static method: Lấy tất cả settings theo category
settingSchema.statics.getSettingsByCategory = async function (category) {
  return await this.find({ category });
};

const Setting = mongoose.model("Setting", settingSchema);

module.exports = Setting;

