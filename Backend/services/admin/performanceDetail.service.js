const Shift = require("../../models/Shift");
const WorkShift = require("../../models/WorkShift");
const mongoose = require("mongoose");

exports.getUserMonthlySummary = async (userId, from, to) => {
  const startDate = from
    ? new Date(from)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = to ? new Date(to) : new Date();

  const shifts = await Shift.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  })
    .populate("workShiftId", "name startTime endTime daysOfWeek")
    .sort({ date: 1 });

  let totalShifts = shifts.length;
  let totalWorkedMinutes = 0;
  let totalLate = 0;
  let totalEarly = 0;
  let absentCount = 0;

  let lateCount = 0;
  let earlyCount = 0;

  const dayNames = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];

  const shiftsWithDay = shifts.map((s) => ({
    ...s.toObject(),
    dayOfWeek: dayNames[new Date(s.date).getDay()],
  }));

  for (const s of shifts) {
    totalWorkedMinutes += s.totalWorkedMinutes || 0;
    totalLate += s.lateMinutes || 0;
    totalEarly += s.earlyLeaveMinutes || 0;

    if (s.status === "late") lateCount++;

    if (s.status === "early_leave") earlyCount++;

    if (s.status === "pending" || s.status === "absent") absentCount++;
  }

  return {
    totalShifts,
    totalWorkedMinutes,
    totalLate,
    totalEarly,
    lateCount,  
    earlyCount,  
    absentCount,
    shifts: shiftsWithDay,
  };
};
