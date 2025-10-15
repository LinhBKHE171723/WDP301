const jwt = require("jsonwebtoken");

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "1d",
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_EXPIRES || "30d",
  });
}

function extractToken(req) {
  const authHeader = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (match && match[1]) return match[1].trim();

  if (req.cookies?.accessToken) return req.cookies.accessToken;

  return null;
}

function authRequired(req, res, next) {
  if (req.method === "OPTIONS") return next();

  const token = extractToken(req);
  if (!token) {
    return next({ status: 401, message: "Yêu cầu cần token để xác thực." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: String(decoded.id || ""),
      role: decoded.role,
      email: decoded.email,
    };

    if (!req.user.id) {
      return next({
        status: 401,
        message: "Token không chứa thông tin hợp lệ.",
      });
    }

    next();
  } catch (err) {
    console.error(err);
    return next({
      status: 401,
      message: "Token không hợp lệ hoặc đã hết hạn.",
    });
  }
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next({
        status: 401,
        message: "Không tìm thấy thông tin người dùng.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return next({
        status: 403,
        message: "Bạn không có quyền truy cập tài nguyên này.",
      });
    }

    next(); // Role hợp lệ, cho phép đi tiếp
  };
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  authRequired,
  roleRequired,
};
