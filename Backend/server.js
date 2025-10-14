const dotenv = require("dotenv");
dotenv.config();  // load env TRƯỚC

const app = require("./app");
console.log("LOADED ENV:", process.env.SMTP_USER);  // giờ đã có giá trị

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
