// controllers/admin/user.controller.js
const AdminUserService = require("../../services/admin.user.service");
const { success, error } = require("../../utils/response");

module.exports = {
  list: async (req, res) => {
    try {
      const { page, limit, role, status, q } = req.query;
      const result = await AdminUserService.list({ page, limit, role, status, q });
      return success(res, result, "User list");
    } catch (e) {
      return error(res, e.message || "Failed to list users");
    }
  },
create: async (req, res) => {
  try {
    // Gọi service để tạo tài khoản + random password + gửi email
    const user = await AdminUserService.create(req.body);

    return success(res, user, "Tạo tài khoản thành công. Mật khẩu đã gửi email.");
  } catch (e) {
    if (e?.code === 11000) {
      return error(res, "Email hoặc Username đã tồn tại", 400);
    }
    return error(res, e.message || "Không thể tạo tài khoản", e.status || 400);
  }
},

  update: async (req, res) => {
    try {
      const user = await AdminUserService.update(req.params.id, req.body);
      return success(res, user, "User updated");
    } catch (e) {
      return error(res, e.message || "Failed to update user", e.status || 400);
    }
  },

  updateStatus: async (req, res) => {
    try {
      const user = await AdminUserService.updateStatus(req.params.id, req.body.status);
      return success(res, user, "Status updated");
    } catch (e) {
      return error(res, e.message || "Failed to update status", e.status || 400);
    }
  },

  updateRole: async (req, res) => {
    try {
      const user = await AdminUserService.updateRole(req.params.id, req.body.role);
      return success(res, user, "Role updated");
    } catch (e) {
      return error(res, e.message || "Failed to update role", e.status || 400);
    }
  },

  remove: async (req, res) => {
    try {
      await AdminUserService.remove(req.params.id);
      return success(res, true, "User deleted");
    } catch (e) {
      return error(res, e.message || "Failed to delete user", e.status || 400);
    }
  },
};
