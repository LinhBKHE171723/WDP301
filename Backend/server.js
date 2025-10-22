const dotenv = require("dotenv");
const http = require("http");
const app = require("./app");
const webSocketService = require("./services/websocket.service");

// Load .env file
dotenv.config();

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize WebSocket service
webSocketService.initialize(server);

// Store WebSocket service in app for controllers to access
app.set("webSocketService", webSocketService);

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  console.log(`🔌 WebSocket available at ws://${HOST}:${PORT}/ws`);
});
