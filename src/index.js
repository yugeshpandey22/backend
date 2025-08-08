const dotenv = require("dotenv");
const connectDB = require("./db/index.js");
const { app } = require("./app.js"); // ✅ app.js import kiya

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`✅ Server is running at port: ${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => {
    console.log("❌ MONGO db connect failed !!!", err);
  });
