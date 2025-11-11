const Shift = require("../../models/Shift");
const WorkShift = require("../../models/WorkShift");
exports.updateShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { startTime, endTime, note } = req.body;

    const shift = await Shift.findById(shiftId);
    if (!shift) return res.status(404).json({ success: false, message: "Shift not found" });

    if (startTime !== undefined) shift.startTime = startTime ? new Date(startTime) : undefined;
    if (endTime !== undefined)   shift.endTime   = endTime   ? new Date(endTime)   : undefined;
    if (note !== undefined)      shift.note      = note;

    await shift.save();

    return res.json({ success: true, message: "Shift updated", data: shift });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};