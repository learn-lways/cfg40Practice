const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to authenticate JWT token
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is not valid. User not found.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated.",
      });
    }

    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message:
          "Account is temporarily locked due to too many failed login attempts.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during authentication.",
    });
  }
};

// Middleware to authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(", ")}`,
      });
    }

    next();
  };
};

// Middleware to check if user owns the resource
const checkOwnership = (resourceField = "user") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user._id;

      // For sellers, also check if they own the product/resource
      if (req.user.role === "seller") {
        // This would need to be customized based on the specific resource
        // For now, we'll allow sellers to access their own resources
        req.isOwner = true;
        return next();
      }

      // For buyers, check ownership
      if (req.user.role === "buyer") {
        req.isOwner = userId.toString() === resourceId;
        return next();
      }

      // Admins have access to everything
      if (req.user.role === "admin") {
        req.isOwner = true;
        return next();
      }

      next();
    } catch (error) {
      console.error("Ownership check error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error during ownership verification.",
      });
    }
  };
};

// Middleware for optional authentication
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (user && user.isActive && !user.isLocked) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid, but we don't return an error
        // Just continue without setting req.user
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// Middleware to check if seller is verified (for certain operations)
const requireVerifiedSeller = (req, res, next) => {
  if (req.user.role !== "seller") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Seller account required.",
    });
  }

  if (!req.user.sellerInfo || !req.user.sellerInfo.isVerified) {
    return res.status(403).json({
      success: false,
      message: "Seller account verification required to perform this action.",
    });
  }

  next();
};

// Middleware to log user activities
const logActivity = (action) => {
  return (req, res, next) => {
    // In a real application, you might want to log to a database or external service
    console.log(
      `[${new Date().toISOString()}] User ${
        req.user?._id
      } performed action: ${action}`
    );
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  checkOwnership,
  optionalAuth,
  requireVerifiedSeller,
  logActivity,
};
