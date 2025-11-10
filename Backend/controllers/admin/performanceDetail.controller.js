const shiftService = require("../../services/admin/performanceDetail.service.js");

exports.getUserShifts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { from, to } = req.query;
    const summary = await shiftService.getUserMonthlySummary(userId, from, to);

    res.status(200).json({
      success: true,
      message: "Fetched shift summary successfully",
      data: summary,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
