const Shift = require("../../models/Shift");
const WorkShift = require("../../models/WorkShift");
const mongoose = require("mongoose");


exports.getUserMonthlySummary = async (userId, from, to) => {
  const startDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = to ? new Date(to) : new Date();

  const shifts = await Shift.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  }).populate("workShiftId", "name startTime endTime");

  let totalShifts = shifts.length;
  let totalWorkedMinutes = 0;
  let totalLate = 0;
  let totalEarly = 0;
  let absentCount = 0;

  for (const s of shifts) {
    totalWorkedMinutes += s.totalWorkedMinutes || 0;
    totalLate += s.lateMinutes || 0;
    totalEarly += s.earlyLeaveMinutes || 0;
    if (s.status === "pending" || s.status === "absent") absentCount++;
  }

  return {
    totalShifts,
    totalWorkedMinutes,
    totalLate,
    totalEarly,
    absentCount,
    shifts, 
  };
};
