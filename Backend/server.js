const dotenv = require("dotenv");
const app = require("./app");

// Load .env file
dotenv.config();

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 5000;

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});
