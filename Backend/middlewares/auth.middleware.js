// backend/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

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

module.exports = { signAccessToken, signRefreshToken, authRequired, roleRequired };
