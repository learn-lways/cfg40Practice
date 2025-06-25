const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const {
  authenticate,
  authorize,
  requireVerifiedSeller,
} = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/sellers/dashboard
// @desc    Get seller dashboard data
// @access  Private (Seller)
router.get(
  "/dashboard",
  [authenticate, authorize("seller")],
  async (req, res) => {
    try {
      const sellerId = req.user.id;
      const { period = "30" } = req.query; // days

      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - parseInt(period));

      // Get basic stats
      const [productCount, totalOrders, recentOrders, totalRevenue] =
        await Promise.all([
          Product.countDocuments({ seller: sellerId, isActive: true }),
          Order.countDocuments({
            "items.seller": sellerId,
            createdAt: { $gte: dateFilter },
          }),
          Order.find({
            "items.seller": sellerId,
            createdAt: { $gte: dateFilter },
          })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("buyer", "name email")
            .select("orderNumber status total createdAt"),

          Order.aggregate([
            {
              $match: {
                "items.seller": sellerId,
                status: "delivered",
                createdAt: { $gte: dateFilter },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                "items.seller": sellerId,
              },
            },
            {
              $group: {
                _id: null,
                totalRevenue: {
                  $sum: { $multiply: ["$items.price", "$items.quantity"] },
                },
              },
            },
          ]),
        ]);

      // Get top selling products
      const topProducts = await Order.aggregate([
        {
          $match: {
            "items.seller": sellerId,
            createdAt: { $gte: dateFilter },
          },
        },
        {
          $unwind: "$items",
        },
        {
          $match: {
            "items.seller": sellerId,
          },
        },
        {
          $group: {
            _id: "$items.product",
            totalSold: { $sum: "$items.quantity" },
            revenue: {
              $sum: { $multiply: ["$items.price", "$items.quantity"] },
            },
            productName: { $first: "$items.productName" },
          },
        },
        {
          $sort: { totalSold: -1 },
        },
        {
          $limit: 5,
        },
      ]);

      // Get order status breakdown
      const orderStatusBreakdown = await Order.aggregate([
        {
          $match: {
            "items.seller": sellerId,
            createdAt: { $gte: dateFilter },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      // Get low stock products
      const lowStockProducts = await Product.find({
        seller: sellerId,
        isActive: true,
        $expr: { $lte: ["$stock", "$lowStockThreshold"] },
      })
        .select("name sku stock lowStockThreshold")
        .sort({ stock: 1 })
        .limit(10);

      const dashboardData = {
        stats: {
          productCount,
          totalOrders,
          totalRevenue: totalRevenue[0]?.totalRevenue || 0,
          period: parseInt(period),
        },
        recentOrders,
        topProducts,
        orderStatusBreakdown,
        lowStockProducts,
      };

      res.json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      console.error("Seller dashboard error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard data",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/sellers/products
// @desc    Get seller's products
// @access  Private (Seller)
router.get(
  "/products",
  [authenticate, authorize("seller")],
  async (req, res) => {
    try {
      const sellerId = req.user.id;
      const {
        page = 1,
        limit = 12,
        search,
        category,
        status = "all",
        sort = "createdAt",
        order = "desc",
      } = req.query;

      let query = { seller: sellerId };

      // Filter by status
      if (status !== "all") {
        query.isActive = status === "active";
      }

      // Filter by category
      if (category) {
        query.category = category;
      }

      // Search functionality
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Sorting
      const sortOptions = {};
      sortOptions[sort] = order === "desc" ? -1 : 1;

      const products = await Product.find(query)
        .populate("category", "name")
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Product.countDocuments(query);

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
      console.error("Get seller products error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/sellers/orders
// @desc    Get seller's orders
// @access  Private (Seller)
router.get("/orders", [authenticate, authorize("seller")], async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { page = 1, limit = 10, status, dateFrom, dateTo } = req.query;

    let query = { "items.seller": sellerId };

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

    const orders = await Order.find(query)
      .populate("buyer", "name email")
      .populate("items.product", "name images")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    // Filter items to only show seller's items
    const filteredOrders = orders.map((order) => ({
      ...order.toObject(),
      items: order.items.filter((item) => item.seller.toString() === sellerId),
    }));

    res.json({
      success: true,
      data: filteredOrders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get seller orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// @route   PUT /api/sellers/profile
// @desc    Update seller profile
// @access  Private (Seller)
router.put(
  "/profile",
  [
    authenticate,
    authorize("seller"),
    body("sellerInfo.businessName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Business name must be between 2 and 100 characters"),
    body("sellerInfo.businessType")
      .optional()
      .isIn(["individual", "company", "partnership"])
      .withMessage("Invalid business type"),
    body("phone")
      .optional()
      .isMobilePhone()
      .withMessage("Invalid phone number"),
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

      const sellerId = req.user.id;
      const updates = req.body;

      // Only allow updating specific fields
      const allowedUpdates = ["name", "phone", "sellerInfo"];
      const filteredUpdates = {};

      Object.keys(updates).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      const updatedUser = await User.findByIdAndUpdate(
        sellerId,
        { $set: filteredUpdates },
        { new: true, runValidators: true }
      ).select("-password");

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Update seller profile error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update profile",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/sellers/analytics
// @desc    Get seller analytics data
// @access  Private (Seller)
router.get(
  "/analytics",
  [authenticate, authorize("seller")],
  async (req, res) => {
    try {
      const sellerId = req.user.id;
      const { period = "30" } = req.query;

      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - parseInt(period));

      // Sales analytics
      const salesData = await Order.aggregate([
        {
          $match: {
            "items.seller": sellerId,
            status: "delivered",
            createdAt: { $gte: dateFilter },
          },
        },
        {
          $unwind: "$items",
        },
        {
          $match: {
            "items.seller": sellerId,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            dailyRevenue: {
              $sum: { $multiply: ["$items.price", "$items.quantity"] },
            },
            dailyOrders: { $sum: 1 },
            dailyQuantity: { $sum: "$items.quantity" },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
        },
      ]);

      // Product performance
      const productPerformance = await Order.aggregate([
        {
          $match: {
            "items.seller": sellerId,
            createdAt: { $gte: dateFilter },
          },
        },
        {
          $unwind: "$items",
        },
        {
          $match: {
            "items.seller": sellerId,
          },
        },
        {
          $group: {
            _id: "$items.product",
            productName: { $first: "$items.productName" },
            totalSold: { $sum: "$items.quantity" },
            totalRevenue: {
              $sum: { $multiply: ["$items.price", "$items.quantity"] },
            },
            averagePrice: { $avg: "$items.price" },
          },
        },
        {
          $sort: { totalRevenue: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      res.json({
        success: true,
        data: {
          salesData,
          productPerformance,
          period: parseInt(period),
        },
      });
    } catch (error) {
      console.error("Seller analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch analytics data",
        error: error.message,
      });
    }
  }
);

// @route   POST /api/sellers/verification
// @desc    Submit seller verification request
// @access  Private (Seller)
router.post(
  "/verification",
  [
    authenticate,
    authorize("seller"),
    body("businessName").notEmpty().withMessage("Business name is required"),
    body("businessType")
      .isIn(["individual", "company", "partnership"])
      .withMessage("Invalid business type"),
    body("taxId").notEmpty().withMessage("Tax ID is required"),
    body("businessAddress.street")
      .notEmpty()
      .withMessage("Business address is required"),
    body("businessAddress.city").notEmpty().withMessage("City is required"),
    body("businessAddress.zipCode")
      .notEmpty()
      .withMessage("Zip code is required"),
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

      const sellerId = req.user.id;
      const verificationData = req.body;

      // Check if already verified
      if (req.user.sellerInfo?.isVerified) {
        return res.status(400).json({
          success: false,
          message: "Seller is already verified",
        });
      }

      // Update seller info with verification data
      await User.findByIdAndUpdate(sellerId, {
        $set: {
          "sellerInfo.businessName": verificationData.businessName,
          "sellerInfo.businessType": verificationData.businessType,
          "sellerInfo.taxId": verificationData.taxId,
          "sellerInfo.businessAddress": verificationData.businessAddress,
          "sellerInfo.bankDetails": verificationData.bankDetails,
          "sellerInfo.verificationStatus": "pending",
          "sellerInfo.verificationSubmittedAt": new Date(),
        },
      });

      res.json({
        success: true,
        message:
          "Verification request submitted successfully. We will review your information and get back to you within 2-3 business days.",
      });
    } catch (error) {
      console.error("Seller verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to submit verification request",
        error: error.message,
      });
    }
  }
);

module.exports = router;
