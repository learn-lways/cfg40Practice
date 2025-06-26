// Load environment variables FIRST
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const session = require("express-session");
const passport = require("./config/passport");
const connectDB = require("./config/database");

const app = express();

// Database Connection
connectDB();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Body Parser Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static file serving for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Session middleware for OAuth
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/sellers", require("./routes/sellers"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/payments", require("./routes/payments"));

// Serve OAuth test page
app.get("/test-oauth", (req, res) => {
  res.sendFile(path.join(__dirname, "test-oauth.html"));
});

// Serve Payment & Invoice test page
app.get("/test-payments", (req, res) => {
  res.sendFile(path.join(__dirname, "test-payments.html"));
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/products", require("./routes/products"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/sellers", require("./routes/sellers"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/payments", require("./routes/payments"));

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Database Connection handled above

// Health Check Route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "E-commerce Backend API is running!",
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler - Fixed for Express 5.x compatibility
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
