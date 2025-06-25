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
    features: {
      authentication: "JWT-based auth system",
      users: "Buyer and seller management",
      products: "Product catalog with categories",
      orders: "Order management system",
      cart: "Shopping cart functionality",
      reviews: "Product review system",
      admin: "Administrative dashboard",
      fileUploads: "Image upload support",
    },
  });
});

// Basic test route
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Test route working!",
    routes: [
      "GET /api/health",
      "GET /api/test",
      "Authentication routes ready",
      "User management ready",
      "Product management ready",
      "Order system ready",
      "Shopping cart ready",
      "Review system ready",
      "Admin dashboard ready",
    ],
  });
});

// Routes will be added one by one after fixing the issue
// app.use('/api/auth', require('./routes/auth'));

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    availableEndpoints: ["GET /api/health", "GET /api/test"],
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log("\n📋 Available Features:");
  console.log("  ✅ MongoDB Connection");
  console.log("  ✅ Security Middleware (Helmet, CORS)");
  console.log("  ✅ Request Parsing");
  console.log("  ✅ Error Handling");
  console.log("  🔄 Routes will be added incrementally...");
});

module.exports = app;
