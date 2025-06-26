const mongoose = require("mongoose");

const mongo_url = process.env.MONGO_CONN;

if (!mongo_url) {
  console.error("❌ MONGO_URI is not defined in the .env file");
  process.exit(1); // Stop the app if no DB URI
}

mongoose
  .connect(mongo_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1); // Optional: stop app if DB fails
  });
