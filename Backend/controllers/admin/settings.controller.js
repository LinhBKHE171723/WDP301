const Setting = require("../../models/Setting");
const { success, error } = require("../../utils/response");

/**
 * Lấy tất cả settings hoặc theo category
 */
exports.getSettings = async (req, res) => {
  try {
    const { category } = req.query;

    let settings;
    if (category) {
      settings = await Setting.getSettingsByCategory(category);
    } else {
      settings = await Setting.find({}).sort({ category: 1, key: 1 });
    }

    return success(res, settings);
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * Lấy setting theo key
 */
exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await Setting.findOne({ key });
    if (!setting) {
      return error(res, "Không tìm thấy setting", 404);
    }

    return success(res, setting);
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * Cập nhật hoặc tạo setting
 */
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    let { value, description, category } = req.body;

    if (value === undefined) {
      return error(res, "Value là bắt buộc", 400);
    }

    // Convert value to number nếu là số (để đảm bảo type consistency)
    if (key === "preorder.largeOrderThreshold" && typeof value === "string" && !isNaN(Number(value))) {
      value = Number(value);
    }

    const setting = await Setting.setSetting(
      key,
      value,
      description || null,
      category || "general"
    );

    return success(res, setting, "Đã cập nhật setting thành công");
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * Lấy settings cho preorder (convenience method)
 */
exports.getPreOrderSettings = async (req, res) => {
  try {
    const settings = await Setting.getSettingsByCategory("preorder");

    console.log("📋 Settings from DB:", settings.map(s => ({ key: s.key, value: s.value, type: typeof s.value })));

    // Format response với key-value pairs
    const formattedSettings = {};
    settings.forEach((setting) => {
      // Convert value to number nếu là preorder.largeOrderThreshold
      if (setting.key === "preorder.largeOrderThreshold") {
        const numValue = typeof setting.value === "number" 
          ? setting.value 
          : Number(setting.value);
        formattedSettings[setting.key] = !isNaN(numValue) ? numValue : 2000000;
        console.log(`✅ Loaded threshold: ${setting.value} → ${formattedSettings[setting.key]} (type: ${typeof formattedSettings[setting.key]})`);
      } else {
        formattedSettings[setting.key] = setting.value;
      }
    });

    // Đảm bảo có default values nếu chưa có (chỉ khi key không tồn tại trong object)
    if (!("preorder.largeOrderThreshold" in formattedSettings)) {
      console.log("⚠️ No threshold found in DB, using default 2000000");
      formattedSettings["preorder.largeOrderThreshold"] = 2000000;
    }
    if (!("preorder.autoAssignToCashier" in formattedSettings)) {
      formattedSettings["preorder.autoAssignToCashier"] = true;
    }

    console.log("📤 Returning settings:", formattedSettings);
    return success(res, formattedSettings);
  } catch (err) {
    console.error("❌ Error in getPreOrderSettings:", err);
    return error(res, err.message);
  }
};

