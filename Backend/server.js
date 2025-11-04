const dotenv = require("dotenv");
const http = require("http");
const app = require("./app");
const webSocketService = require("./services/websocket.service");
const { checkAndReassignStaleItems } = require("./utils/staleItemsChecker");

// Load .env file
dotenv.config();

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 5000;

// Stale items configuration
const STALE_ITEM_THRESHOLD_MINUTES = parseInt(process.env.STALE_ITEM_THRESHOLD_MINUTES) || 1;
const STALE_CHECK_INTERVAL_MS = 1 * 60 * 1000; // Check every 2 minutes

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
  
  // Start scheduled job to check and reassign stale items
  // Wait a bit for MongoDB to be fully connected
  setTimeout(() => {
    console.log(`⏰ Starting stale items checker (threshold: ${STALE_ITEM_THRESHOLD_MINUTES} minutes, check interval: ${STALE_CHECK_INTERVAL_MS / 1000} seconds)`);
    
    // Run immediately once, then schedule recurring checks
    checkAndReassignStaleItems(webSocketService, STALE_ITEM_THRESHOLD_MINUTES);
    
    // Schedule recurring checks
    setInterval(() => {
      checkAndReassignStaleItems(webSocketService, STALE_ITEM_THRESHOLD_MINUTES);
    }, STALE_CHECK_INTERVAL_MS);
  }, 5000); // Wait 5 seconds for MongoDB connection
});
