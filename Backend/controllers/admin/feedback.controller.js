const feedbackService = require("../../services/admin.feedback.service");
const { successResponse, errorResponse } = require("../../utils/response");

exports.getAll = async (req, res) => {
  try {
    const { page, limit, rating, search } = req.query;
    const result = await feedbackService.getAll({ page, limit, rating, search });
    return successResponse(res, result);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

exports.getOne = async (req, res) => {
  try {
    const result = await feedbackService.getOne(req.params.id);
    if (!result) return errorResponse(res, "Feedback not found", 404);
    return successResponse(res, result);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await feedbackService.remove(req.params.id);
    if (!deleted) return errorResponse(res, "Feedback not found", 404);
    return successResponse(res, "Feedback deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
