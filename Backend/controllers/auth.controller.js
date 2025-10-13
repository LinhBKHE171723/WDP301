// controllers/auth.controller.js
const { success, error } = require("../utils/response");
const { verifyEmailToken } = require("../services/auth.service");

module.exports = {
  // GET /api/auth/verify/:token
  verifyEmail: async (req, res) => {
    try {
      await verifyEmailToken(req.params.token);
      // Redirect về FE theo yêu cầu
      const FE = process.env.FRONTEND_URL || "http://localhost:3000";
      return res.redirect(`${FE}/verification-success`);
    } catch (e) {
      const FE = process.env.FRONTEND_URL || "http://localhost:3000";
      return res.redirect(`${FE}/verification-failed`);
      // Nếu muốn trả JSON thay vì redirect:
      // return error(res, e.message || "Verify failed", e.status || 400);
    }
  },
};
