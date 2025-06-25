const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Body Parser Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health Check Route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "E-commerce Backend API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Routes - Loading all routes together
try {
  console.log("Loading all routes...");
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/users", require("./routes/users"));
  app.use("/api/products", require("./routes/products"));
  app.use("/api/orders", require("./routes/orders"));
  app.use("/api/categories", require("./routes/categories"));
  app.use("/api/cart", require("./routes/cart"));
  app.use("/api/sellers", require("./routes/sellers"));
  app.use("/api/admin", require("./routes/admin"));
  app.use("/api/reviews", require("./routes/reviews"));
  console.log("✅ All routes loaded successfully");
} catch (error) {
  console.error("❌ Error loading routes:", error.message);
  console.error("Stack:", error.stack);
}

// 404 Handler - Fixed for Express 5.x compatibility
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

const PORT = process.env.PORT || 5000;

// Test server initialization without starting
console.log("🔍 Testing server initialization...");
console.log(`📊 Server configured for port ${PORT}`);
console.log("✅ Server initialization complete - NOT starting listener");

// Uncomment below to actually start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
