const app = require("./app");
const dotenv = require("dotenv");
console.log("LOADED ENV:", process.env.SMTP_USER);

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
