// utils/response.js
module.exports = {
  success(res, data = null, message = "OK") {
    return res.json({
      success: true,
      message,
      data,
    });
  },
  error(res, message = "Error", status = 500) {
    return res.status(status).json({
      success: false,
      message,
    });
  },
};
