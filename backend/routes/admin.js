const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Category = require("../models/Category");
const Review = require("../models/Review");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin)
router.get(
  "/dashboard",
  [authenticate, authorize("admin")],
  async (req, res) => {
    try {
      const { period = "30" } = req.query;
      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - parseInt(period));

      // Get comprehensive stats
      const [
        totalUsers,
        totalSellers,
        totalBuyers,
        totalProducts,
        totalOrders,
        totalRevenue,
        recentOrders,
        topCategories,
        userGrowth,
        orderStats,
      ] = await Promise.all([
        User.countDocuments({ isActive: true }),
        User.countDocuments({ role: "seller", isActive: true }),
        User.countDocuments({ role: "buyer", isActive: true }),
        Product.countDocuments({ isActive: true }),
        Order.countDocuments({ createdAt: { $gte: dateFilter } }),

        // Total revenue calculation
        Order.aggregate([
          {
            $match: {
              status: "delivered",
              createdAt: { $gte: dateFilter },
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$total" },
            },
          },
        ]),

        // Recent orders
        Order.find({ createdAt: { $gte: dateFilter } })
          .populate("buyer", "name email")
          .sort({ createdAt: -1 })
          .limit(10)
          .select("orderNumber status total createdAt buyer"),

        // Top categories by product count
        Product.aggregate([
          {
            $match: { isActive: true },
          },
          {
            $group: {
              _id: "$category",
              productCount: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "_id",
              foreignField: "_id",
              as: "categoryInfo",
            },
          },
          {
            $unwind: "$categoryInfo",
          },
          {
            $sort: { productCount: -1 },
          },
          {
            $limit: 5,
          },
        ]),

        // User growth over time
        User.aggregate([
          {
            $match: {
              createdAt: { $gte: dateFilter },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
                day: { $dayOfMonth: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
          },
        ]),

        // Order status breakdown
        Order.aggregate([
          {
            $match: {
              createdAt: { $gte: dateFilter },
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalValue: { $sum: "$total" },
            },
          },
        ]),
      ]);

      const dashboardData = {
        overview: {
          totalUsers,
          totalSellers,
          totalBuyers,
          totalProducts,
          totalOrders,
          totalRevenue: totalRevenue[0]?.totalRevenue || 0,
          period: parseInt(period),
        },
        recentOrders,
        topCategories,
        userGrowth,
        orderStats,
      };

      res.json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard data",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/admin/users
// @desc    Get all users with filters
// @access  Private (Admin)
router.get("/users", [authenticate, authorize("admin")], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let query = {};

    // Filter by role
    if (role && role !== "all") {
      query.role = role;
    }

    // Filter by status
    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { "sellerInfo.businessName": { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const users = await User.find(query)
      .select("-password")
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Private (Admin)
router.put(
  "/users/:id/status",
  [
    authenticate,
    authorize("admin"),
    body("isActive").isBoolean().withMessage("Status must be boolean"),
    body("reason")
      .optional()
      .isLength({ max: 200 })
      .withMessage("Reason cannot exceed 200 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.params.id;
      const { isActive, reason } = req.body;

      const user = await User.findById(userId).select("-password");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Don't allow deactivating other admins
      if (user.role === "admin" && !isActive) {
        return res.status(403).json({
          success: false,
          message: "Cannot deactivate admin users",
        });
      }

      user.isActive = isActive;
      if (reason) {
        user.statusChangeReason = reason;
        user.statusChangedBy = req.user.id;
        user.statusChangedAt = new Date();
      }

      await user.save();

      res.json({
        success: true,
        message: `User ${isActive ? "activated" : "deactivated"} successfully`,
        data: user,
      });
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update user status",
        error: error.message,
      });
    }
  }
);

// @route   PUT /api/admin/sellers/:id/verify
// @desc    Verify or reject seller
// @access  Private (Admin)
router.put(
  "/sellers/:id/verify",
  [
    authenticate,
    authorize("admin"),
    body("isVerified")
      .isBoolean()
      .withMessage("Verification status must be boolean"),
    body("note")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Note cannot exceed 500 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const sellerId = req.params.id;
      const { isVerified, note } = req.body;

      const seller = await User.findById(sellerId);
      if (!seller) {
        return res.status(404).json({
          success: false,
          message: "Seller not found",
        });
      }

      if (seller.role !== "seller") {
        return res.status(400).json({
          success: false,
          message: "User is not a seller",
        });
      }

      // Update seller verification status
      seller.sellerInfo.isVerified = isVerified;
      seller.sellerInfo.verificationStatus = isVerified
        ? "approved"
        : "rejected";
      seller.sellerInfo.verifiedBy = req.user.id;
      seller.sellerInfo.verifiedAt = new Date();
      if (note) {
        seller.sellerInfo.verificationNote = note;
      }

      await seller.save();

      res.json({
        success: true,
        message: `Seller ${isVerified ? "verified" : "rejected"} successfully`,
        data: seller.sellerInfo,
      });
    } catch (error) {
      console.error("Verify seller error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update seller verification",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/admin/orders
// @desc    Get all orders with advanced filters
// @access  Private (Admin)
router.get("/orders", [authenticate, authorize("admin")], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      search,
    } = req.query;

    let query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      query.total = {};
      if (minAmount) query.total.$gte = parseFloat(minAmount);
      if (maxAmount) query.total.$lte = parseFloat(maxAmount);
    }

    // Search by order number or buyer email
    if (search) {
      const users = await User.find({
        $or: [
          { email: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { buyer: { $in: users.map((u) => u._id) } },
      ];
    }

    const orders = await Order.find(query)
      .populate("buyer", "name email")
      .populate("items.product", "name images")
      .populate("items.seller", "name sellerInfo.businessName")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get admin orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// @route   GET /api/admin/products/pending
// @desc    Get products pending approval
// @access  Private (Admin)
router.get(
  "/products/pending",
  [authenticate, authorize("admin")],
  async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const products = await Product.find({
        approvalStatus: "pending",
        isActive: true,
      })
        .populate("seller", "name email sellerInfo.businessName")
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Product.countDocuments({
        approvalStatus: "pending",
        isActive: true,
      });

      res.json({
        success: true,
        data: products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalProducts: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error("Get pending products error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch pending products",
        error: error.message,
      });
    }
  }
);

// @route   PUT /api/admin/products/:id/approve
// @desc    Approve or reject product
// @access  Private (Admin)
router.put(
  "/products/:id/approve",
  [
    authenticate,
    authorize("admin"),
    body("approved").isBoolean().withMessage("Approval status must be boolean"),
    body("note")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Note cannot exceed 500 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const productId = req.params.id;
      const { approved, note } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      product.approvalStatus = approved ? "approved" : "rejected";
      product.approvedBy = req.user.id;
      product.approvedAt = new Date();
      if (note) {
        product.approvalNote = note;
      }

      await product.save();

      res.json({
        success: true,
        message: `Product ${approved ? "approved" : "rejected"} successfully`,
        data: product,
      });
    } catch (error) {
      console.error("Approve product error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update product approval",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/admin/analytics/summary
// @desc    Get analytics summary
// @access  Private (Admin)
router.get(
  "/analytics/summary",
  [authenticate, authorize("admin")],
  async (req, res) => {
    try {
      const { period = "30" } = req.query;
      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - parseInt(period));

      // Revenue analytics
      const revenueData = await Order.aggregate([
        {
          $match: {
            status: "delivered",
            createdAt: { $gte: dateFilter },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            dailyRevenue: { $sum: "$total" },
            dailyOrders: { $sum: 1 },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
        },
      ]);

      // Top selling products
      const topProducts = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: dateFilter },
          },
        },
        {
          $unwind: "$items",
        },
        {
          $group: {
            _id: "$items.product",
            totalSold: { $sum: "$items.quantity" },
            totalRevenue: {
              $sum: { $multiply: ["$items.price", "$items.quantity"] },
            },
            productName: { $first: "$items.productName" },
          },
        },
        {
          $sort: { totalSold: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      // Geographic distribution (if you have address data)
      const geographicData = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: dateFilter },
          },
        },
        {
          $group: {
            _id: "$shippingAddress.state",
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: "$total" },
          },
        },
        {
          $sort: { orderCount: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      res.json({
        success: true,
        data: {
          revenueData,
          topProducts,
          geographicData,
          period: parseInt(period),
        },
      });
    } catch (error) {
      console.error("Analytics summary error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch analytics data",
        error: error.message,
      });
    }
  }
);

module.exports = router;
