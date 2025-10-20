const jwt = require("jsonwebtoken");

// 🧾 Tạo Access Token (thời hạn ngắn, dùng khi gọi API)
function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "1d",
  });
}

// 🔁 Hàm tạo Refresh Token
// ➤ Refresh Token có thời hạn dài hơn (thường 30 ngày).
// ➤ Dùng để lấy Access Token mới khi Access Token hết hạn.
function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_EXPIRES || "30d",
  });
}

// 🧩 Hàm trích xuất token từ request
// ➤ Ưu tiên lấy từ header Authorization (Bearer token)
// ➤ Nếu không có thì thử lấy từ cookie (trường hợp login bằng cookie)
function extractToken(req) {
  const authHeader = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (match && match[1]) return match[1].trim();

  if (req.cookies?.accessToken) return req.cookies.accessToken;

  return null;
}

// 🛡️ Middleware xác thực (authentication)
// ➤ Dùng ở mọi route yêu cầu login (ví dụ /api/orders)
// ➤ Kiểm tra token hợp lệ, giải mã để lấy user info.
function authRequired(req, res, next) {
  // Khi trình duyệt gửi một request có xác thực hoặc header đặc biệt (như Authorization: Bearer ...),
  // nó sẽ gửi trước một request “thăm dò” gọi là preflight request để xem có chấp nhận CORS ko. return next để bỏ qua preflight request
  if (req.method === "OPTIONS") return next(); 

  const token = extractToken(req);
  if (!token) {
    // Nếu không có token → trả lỗi 401 Unauthorized
    return next({ status: 401, message: "Yêu cầu cần token để xác thực." });
  }

  try {
    // ✅ Giải mã & verify token bằng secret của server và trả về payload là 1 object
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lưu thông tin người dùng đã xác thực vào req.user để route khác dùng
    req.user = {
      id: String(decoded.id || ""),
      role: decoded.role,
      username: decoded.username,
      name: decoded.name,
      email: decoded.email,
    };
    // Nếu token không có id thì xem như không hợp lệ
    if (!req.user.id) {
      return next({
        status: 401,
        message: "Token không chứa thông tin hợp lệ.",
      });
    }
    // Cho phép đi tiếp đến route controller
    next();
  } catch (err) {
    console.error(err);
    // Token hết hạn hoặc không hợp lệ
    return next({
      status: 401,
      message: "Token không hợp lệ hoặc đã hết hạn.",
    });
  }
}

// 🔒 Middleware kiểm tra quyền (authorization)
// ➤ Dùng sau authRequired để đảm bảo user có quyền truy cập route.
// Ví dụ: roleRequired('chef') cho phép chỉ đầu bếp truy cập.
function roleRequired(...roles) {
  return (req, res, next) => {
    // Nếu chưa xác thực user
    if (!req.user) {
      return next({
        status: 401,
        message: "Không tìm thấy thông tin người dùng.",
      });
    }
    // // Nếu role của user không nằm trong danh sách cho phép
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
