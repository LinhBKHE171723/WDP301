const feedbackService = require("../../services/admin.feedback.service");
const { success, error } = require("../../utils/response");

exports.getAll = async (req, res) => {
  try {
    const { page, limit, rating, search } = req.query;
    const result = await feedbackService.getAll({ page, limit, rating, search });
    return success(res, result);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getOne = async (req, res) => {
  try {
    const result = await feedbackService.getOne(req.params.id);
    if (!result) return error(res, "Feedback not found", 404);
    return success(res, result);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await feedbackService.remove(req.params.id);
    if (!deleted) return error(res, "Feedback not found", 404);
    return success(res, "Feedback deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};
