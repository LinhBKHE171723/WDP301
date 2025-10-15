const dotenv = require("dotenv");
const http = require("http");
const app = require("./app");

// Load .env file
dotenv.config();

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 5000;

// Tạo HTTP server
const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});
