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
      enum: ["preorder", "payment", "general", "notification", "loyalty"],
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
  
  // Validation cho loyalty settings
  if (key === "loyalty.pointRate") {
    finalValue = typeof value === "number" ? value : Number(value);
    if (isNaN(finalValue) || finalValue <= 0) {
      throw new Error("loyalty.pointRate phải là số dương");
    }
  }
  
  if (key === "loyalty.ranks") {
    if (!Array.isArray(value)) {
      throw new Error("loyalty.ranks phải là một mảng");
    }
    
    // Validate từng rank
    for (const rank of value) {
      if (!rank.name || typeof rank.name !== "string") {
        throw new Error("Mỗi rank phải có name (string)");
      }
      if (typeof rank.minPoints !== "number" || rank.minPoints < 0) {
        throw new Error("Mỗi rank phải có minPoints là số >= 0");
      }
      if (typeof rank.discount !== "number" || rank.discount < 0 || rank.discount > 100) {
        throw new Error("Mỗi rank phải có discount là số từ 0 đến 100");
      }
      if (!rank.label || typeof rank.label !== "string") {
        throw new Error("Mỗi rank phải có label (string)");
      }
    }
    
    // Sắp xếp ranks theo minPoints tăng dần
    finalValue = [...value].sort((a, b) => a.minPoints - b.minPoints);
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

