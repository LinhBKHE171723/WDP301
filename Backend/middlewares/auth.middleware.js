// backend/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '15m',
  });
}
function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_EXPIRES || '30d',
  });
}

// Helper lấy token từ nhiều nguồn, chấp nhận "Bearer"/"bearer"
function extractToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (m && m[1]) return m[1].trim();
  // fallback khác nếu bạn dùng
  if (req.headers['x-access-token']) return String(req.headers['x-access-token']).trim();
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  return null;
}

function authRequired(req, res, next) {
  // Bỏ qua preflight CORS
  if (req.method === 'OPTIONS') return next();

  const token = extractToken(req);
  if (!token) return next({ status: 401, message: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Chuẩn hoá user object để dùng nhất quán
    req.user = {
      id: String(payload.id || payload.sub || ''),
      role: payload.role,
      email: payload.email,
      raw: payload, // nếu cần debug thêm
    };
    if (!req.user.id) return next({ status: 401, message: 'Invalid token payload' });
    next();
  } catch (e) {
    return next({ status: 401, message: 'Invalid or expired token' });
  }
}

function roleRequired(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next({ status: 401, message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return next({ status: 403, message: 'Forbidden' });
    next();
  };
}
const authenticateUser = async (req, res, next) => {
  // Lấy header 'Authorization' từ request
  const authHeader = req.headers.authorization;

  // Kiểm tra xem có Authorization header không và có bắt đầu bằng "Bearer " không
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }

  // Tách token ra khỏi chuỗi "Bearer <token>"
  const token = authHeader.split(" ")[1];

  try {
    // Giải mã và xác thực token bằng secret key
    // Nếu token sai hoặc hết hạn => sẽ ném lỗi
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Tìm người dùng tương ứng với ID trong payload, loại bỏ field 'password'
    const user = await User.findById(payload.id).select("-password");

    // Nếu không tìm thấy user trong DB => không hợp lệ
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Gắn thông tin user vào request để các middleware/controller khác có thể dùng
    req.user = user;

    // Cho phép request đi tiếp (qua middleware hoặc route handler kế tiếp)
    next();

  } catch (err) {
    // Nếu có lỗi trong quá trình verify (token sai / hết hạn / lỗi DB)
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { signAccessToken, signRefreshToken, authRequired, roleRequired, authenticateUser };
