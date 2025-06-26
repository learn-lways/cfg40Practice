const express = require("express");
const { body, validationResult } = require("express-validator");
const Product = require("../models/Product");
const Category = require("../models/Category");
const {
  authenticate,
  authorize,
  optionalAuth,
  requireVerifiedSeller,
} = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filtering and pagination
// @access  Public
router.get("/", optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const {
      search,
      category,
      seller,
      minPrice,
      maxPrice,
      inStock,
      featured,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = { status: "active" };

    if (search) {
      query.$text = { $search: search };
    }

    if (category) {
      const mongoose = require("mongoose");
      let categoryId = category;
      if (!mongoose.Types.ObjectId.isValid(category)) {
        // Try to find by slug
        const catDoc = await Category.findOne({ slug: category });
        if (catDoc) {
          categoryId = catDoc._id;
        } else {
          // Category not found, return empty result
          return res.json({
            success: true,
            data: {
              products: [],
              pagination: {
                page,
                limit,
                total: 0,
                pages: 0,
              },
            },
          });
        }
      }
      query.category = categoryId;
    }

    if (seller) {
      query.seller = seller;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (inStock === "true") {
      query.stock = { $gt: 0 };
    }

    if (featured === "true") {
      query.isFeatured = true;
    }

    // Support both sortBy/sortOrder and sort/order
    const sortField = req.query.sortBy || req.query.sort || "createdAt";
    const sortDirection = req.query.sortOrder || req.query.order || "desc";
    const sort = {};
    sort[sortField] = sortDirection === "desc" ? -1 : 1;

    const products = await Product.find(query)
      .populate("seller", "name sellerInfo.businessName sellerInfo.rating")
      .populate("category", "name")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    // Enhanced error logging for debugging
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message || String(error),
      errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
  }
});

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get("/featured", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const products = await Product.findFeatured(limit);

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Get featured products error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// =============================================================================
// RECOMMENDATION ROUTES (must be before /:id route to avoid conflicts)
// =============================================================================

// @route   GET /api/products/unique
// @desc    Get unique/one-of-a-kind products
// @access  Public
router.get("/unique", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const uniqueProducts = await Product.findUniqueProducts(limit);
    const totalUnique = await Product.countDocuments({
      status: "active",
      $or: [
        { isUnique: true },
        { uniquenessScore: { $gte: 70 } },
        {
          $and: [
            { inventory: { $lte: 5 } },
            {
              tags: {
                $in: [
                  "limited-edition",
                  "handmade",
                  "custom",
                  "vintage",
                  "rare",
                ],
              },
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      count: uniqueProducts.length,
      totalCount: totalUnique,
      currentPage: page,
      totalPages: Math.ceil(totalUnique / limit),
      data: uniqueProducts,
      message: "Unique products retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching unique products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unique products",
      error: error.message,
    });
  }
});

// @route   GET /api/products/recommendations/:userId
// @desc    Get personalized product recommendations for a user
// @access  Private
router.get("/recommendations/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    // Check if requesting user is the same as the userId or is admin
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get user's order history to understand preferences
    const Order = require("../models/Order");
    const userOrders = await Order.find({ buyer: userId })
      .populate("items.product", "tags category attributes brand")
      .limit(50); // Recent orders

    // Extract user preferences from order history
    const userTags = [];
    const userCategories = [];
    const userBrands = [];
    const userAttributes = {
      gender: [],
      ageGroup: [],
      occasion: [],
      style: [],
    };

    userOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.product) {
          userTags.push(...(item.product.tags || []));
          userCategories.push(item.product.category);
          if (item.product.brand) userBrands.push(item.product.brand);

          const attrs = item.product.attributes || {};
          if (attrs.gender) userAttributes.gender.push(attrs.gender);
          if (attrs.ageGroup) userAttributes.ageGroup.push(attrs.ageGroup);
          if (attrs.occasion)
            userAttributes.occasion.push(...(attrs.occasion || []));
          if (attrs.style) userAttributes.style.push(...(attrs.style || []));
        }
      });
    });

    // Get most frequent preferences
    const getTopFrequent = (arr, count = 5) => {
      const frequency = {};
      arr.forEach((item) => (frequency[item] = (frequency[item] || 0) + 1));
      return Object.keys(frequency)
        .sort((a, b) => frequency[b] - frequency[a])
        .slice(0, count);
    };

    const topTags = getTopFrequent(userTags);
    const topCategories = getTopFrequent(userCategories);
    const topBrands = getTopFrequent(userBrands);
    const topGenders = getTopFrequent(userAttributes.gender);
    const topOccasions = getTopFrequent(userAttributes.occasion);

    // Build recommendation query
    const recommendationQuery = {
      status: "active",
      $or: [
        { tags: { $in: topTags } },
        { category: { $in: topCategories } },
        { brand: { $in: topBrands } },
        { "attributes.gender": { $in: topGenders } },
        { "attributes.occasion": { $in: topOccasions } },
      ],
    };

    // Exclude products user has already ordered
    const orderedProductIds = userOrders.flatMap((order) =>
      order.items.map((item) => item.product?._id).filter(Boolean)
    );
    recommendationQuery._id = { $nin: orderedProductIds };

    const recommendations = await Product.find(recommendationQuery)
      .populate("seller", "name sellerInfo.businessName")
      .populate("category", "name")
      .sort({
        averageRating: -1,
        totalSales: -1,
        createdAt: -1,
      })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations,
      preferences: {
        tags: topTags,
        categories: topCategories,
        brands: topBrands,
        attributes: {
          gender: topGenders,
          occasions: topOccasions,
        },
      },
      message: "Personalized recommendations retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations",
      error: error.message,
    });
  }
});

// @route   GET /api/products/:id/similar
// @desc    Get similar products based on tags and attributes
// @access  Public
router.get("/:id/similar", async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 8 } = req.query;

    const similarProducts = await Product.findSimilarProducts(
      id,
      parseInt(limit)
    );

    res.json({
      success: true,
      count: similarProducts.length,
      data: similarProducts,
      message: "Similar products retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching similar products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch similar products",
      error: error.message,
    });
  }
});

// =============================================================================
// PRODUCT DETAIL ROUTES
// =============================================================================

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const mongoose = require("mongoose");
    // Sanitize ID: remove leading non-hex characters (e.g., ':', '/')
    let rawId = req.params.id;
    let sanitizedId = rawId.replace(/^[^a-fA-F0-9]+/, "");
    if (!mongoose.Types.ObjectId.isValid(sanitizedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }
    const product = await Product.findById(sanitizedId)
      .populate(
        "seller",
        "name sellerInfo.businessName sellerInfo.rating sellerInfo.isVerified"
      )
      .populate("category", "name")
      .populate("reviews.user", "name avatar");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Increment views (only for non-owners)
    if (
      !req.user ||
      req.user._id.toString() !== product.seller._id.toString()
    ) {
      await product.incrementViews();
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private/Seller
router.post(
  "/",
  authenticate,
  authorize("seller"),
  requireVerifiedSeller,
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Product name must be between 2 and 100 characters"),
    body("description")
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage("Description must be between 10 and 2000 characters"),
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("stock")
      .isInt({ min: 0 })
      .withMessage("Stock must be a non-negative integer"),
    body("category").isMongoId().withMessage("Valid category ID is required"),
    body("sku")
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("SKU must be between 3 and 50 characters"),
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

      const productData = {
        ...req.body,
        seller: req.user._id,
      };

      // Check if SKU already exists
      const existingSKU = await Product.findOne({
        sku: productData.sku.toUpperCase(),
      });
      if (existingSKU) {
        return res.status(400).json({
          success: false,
          message: "SKU already exists",
        });
      }

      const product = new Product(productData);
      await product.save();

      // Populate the product before sending response
      await product.populate("seller", "name sellerInfo.businessName");
      await product.populate("category", "name");

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      console.error("Create product error:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "SKU already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private/Seller (own products only)
router.put(
  "/:id",
  authenticate,
  authorize("seller", "admin"),
  async (req, res) => {
    try {
      const productId = req.params.id;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Check if seller owns the product (unless admin)
      if (
        req.user.role !== "admin" &&
        product.seller.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only update your own products.",
        });
      }

      // Check if SKU is being changed and if it already exists
      if (req.body.sku && req.body.sku.toUpperCase() !== product.sku) {
        const existingSKU = await Product.findOne({
          sku: req.body.sku.toUpperCase(),
          _id: { $ne: productId },
        });
        if (existingSKU) {
          return res.status(400).json({
            success: false,
            message: "SKU already exists",
          });
        }
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        req.body,
        { new: true, runValidators: true }
      )
        .populate("seller", "name sellerInfo.businessName")
        .populate("category", "name");

      res.json({
        success: true,
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (error) {
      console.error("Update product error:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "SKU already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private/Seller (own products only)
router.delete(
  "/:id",
  authenticate,
  authorize("seller", "admin"),
  async (req, res) => {
    try {
      const productId = req.params.id;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Check if seller owns the product (unless admin)
      if (
        req.user.role !== "admin" &&
        product.seller.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only delete your own products.",
        });
      }

      await Product.findByIdAndDelete(productId);

      res.json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   GET /api/products/seller/:sellerId
// @desc    Get products by seller
// @access  Public
router.get("/seller/:sellerId", async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const query = {
      seller: sellerId,
      status: "active",
    };

    const products = await Product.find(query)
      .populate("seller", "name sellerInfo.businessName")
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get seller products error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   POST /api/products/:id/reviews
// @desc    Add product review
// @access  Private/Buyer
router.post(
  "/:id/reviews",
  authenticate,
  [
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("comment")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Comment cannot exceed 500 characters"),
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
      const { rating, comment, images = [] } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Check if user already reviewed this product
      const existingReview = product.reviews.find(
        (review) => review.user.toString() === req.user._id.toString()
      );

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: "You have already reviewed this product",
        });
      }

      // TODO: Check if user actually purchased this product
      // This would require checking order history

      await product.addReview(req.user._id, rating, comment, images);

      // Populate the updated product
      await product.populate("reviews.user", "name avatar");

      res.json({
        success: true,
        message: "Review added successfully",
        data: product.reviews,
      });
    } catch (error) {
      console.error("Add review error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   GET /api/products/:id/reviews
// @desc    Get product reviews
// @access  Public
router.get("/:id/reviews", async (req, res) => {
  try {
    const productId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const product = await Product.findById(productId).populate({
      path: "reviews.user",
      select: "name avatar",
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Sort reviews by creation date (newest first)
    const sortedReviews = product.reviews.sort(
      (a, b) => b.createdAt - a.createdAt
    );

    // Paginate reviews
    const paginatedReviews = sortedReviews.slice(skip, skip + limit);
    const total = product.reviews.length;

    res.json({
      success: true,
      data: {
        reviews: paginatedReviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        averageRating: product.ratings.average,
        totalReviews: product.ratings.count,
      },
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   PUT /api/products/:id/status
// @desc    Update product status
// @access  Private/Seller (own products only)
router.put(
  "/:id/status",
  authenticate,
  authorize("seller", "admin"),
  [
    body("status")
      .isIn(["draft", "active", "inactive", "out-of-stock", "discontinued"])
      .withMessage("Invalid status"),
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
      const { status } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Check if seller owns the product (unless admin)
      if (
        req.user.role !== "admin" &&
        product.seller.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only update your own products.",
        });
      }

      product.status = status;
      if (status === "active" && !product.publishedAt) {
        product.publishedAt = new Date();
      }

      await product.save();

      res.json({
        success: true,
        message: "Product status updated successfully",
        data: product,
      });
    } catch (error) {
      console.error("Update product status error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

module.exports = router;
