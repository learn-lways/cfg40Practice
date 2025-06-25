const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const app = express();

console.log("🔍 Testing middleware step by step...\n");

try {
  console.log("1. Basic Express app created");

  // Test database connection
  console.log("2. Testing database connection...");
  mongoose
    .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .catch((err) => console.log("DB connection will be async"));

  console.log("3. Adding helmet...");
  app.use(helmet());

  console.log("4. Adding CORS...");
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    })
  );

  console.log("5. Adding rate limiting...");
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again later.",
  });
  app.use("/api/", limiter);

  console.log("6. Adding body parser...");
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  console.log("7. Adding static file serving...");
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  console.log("8. Adding routes...");
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/users", require("./routes/users"));
  app.use("/api/products", require("./routes/products"));
  app.use("/api/orders", require("./routes/orders"));
  app.use("/api/categories", require("./routes/categories"));
  app.use("/api/cart", require("./routes/cart"));
  app.use("/api/sellers", require("./routes/sellers"));
  app.use("/api/admin", require("./routes/admin"));
  app.use("/api/reviews", require("./routes/reviews"));

  console.log("9. Adding 404 handler...");
  app.use("*", (req, res) => {
    res.status(404).json({
      success: false,
      message: "API endpoint not found",
    });
  });

  console.log("✅ All middleware and routes loaded successfully");
  console.log("🔍 The issue is NOT with middleware or route loading");
} catch (error) {
  console.error("❌ Error during middleware setup:", error.message);
  console.error("Stack:", error.stack);
}
