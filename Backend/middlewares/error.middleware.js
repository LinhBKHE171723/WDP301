// middlewares/error.middleware.js
const { error } = require("../utils/response");

module.exports = (err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  return error(res, message, status);
};
