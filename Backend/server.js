const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");

// Load .env file
dotenv.config();

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 5000;

// Tạo HTTP server
const server = http.createServer(app);

// Thiết lập Socket.IO với CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Xử lý kết nối Socket.IO
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Client join vào room của orderId cụ thể
  socket.on("join-order", (orderId) => {
    socket.join(`order-${orderId}`);
    console.log(`📦 Client ${socket.id} joined order-${orderId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Export io để controllers sử dụng
app.set("io", io);

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});
