const express = require("express");
const { body, validationResult } = require("express-validator");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/reviews
// @desc    Create a new review
// @access  Private (Buyer)
router.post(
  "/",
  [
    authenticate,
    authorize("buyer"),
    body("productId").isMongoId().withMessage("Valid product ID is required"),
    body("orderId").isMongoId().withMessage("Valid order ID is required"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("title")
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage("Title must be between 5 and 100 characters"),
    body("comment")
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Comment must be between 10 and 1000 characters"),
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

      const { productId, orderId, rating, title, comment, images } = req.body;
      const userId = req.user.id;

      // Verify the order exists and belongs to the user
      const order = await Order.findOne({
        _id: orderId,
        buyer: userId,
        "items.product": productId,
        status: "delivered",
      });

      if (!order) {
        return res.status(400).json({
          success: false,
          message: "You can only review products from your delivered orders",
        });
      }

      // Check if user already reviewed this product
      const existingReview = await Review.findOne({
        product: productId,
        user: userId,
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: "You have already reviewed this product",
        });
      }

      // Verify product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Create review
      const review = new Review({
        product: productId,
        user: userId,
        order: orderId,
        rating,
        title,
        comment,
        images: images || [],
      });

      await review.save();

      // Populate review details for response
      await review.populate([
        { path: "user", select: "name avatar" },
        { path: "product", select: "name images" },
      ]);

      res.status(201).json({
        success: true,
        message: "Review created successfully",
        data: review,
      });
    } catch (error) {
      console.error("Create review error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create review",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/reviews/product/:productId
// @desc    Get all reviews for a product
// @access  Public
router.get("/product/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    const {
      page = 1,
      limit = 10,
      rating,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let query = {
      product: productId,
      status: "approved",
    };

    // Filter by rating
    if (rating) {
      query.rating = parseInt(rating);
    }

    const sortOptions = {};
    if (sortBy === "helpful") {
      sortOptions.helpfulVotes = sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    const reviews = await Review.find(query)
      .populate("user", "name avatar")
      .populate("sellerResponse.respondedBy", "name sellerInfo.businessName")
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(query);

    // Get review statistics
    const stats = await Review.calculateAverageRating(productId);

    res.json({
      success: true,
      data: {
        reviews,
        stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalReviews: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get product reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
});

// @route   GET /api/reviews/user
// @desc    Get user's reviews
// @access  Private
router.get("/user", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ user: userId })
      .populate("product", "name images price")
      .populate("sellerResponse.respondedBy", "name sellerInfo.businessName")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments({ user: userId });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get user reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user reviews",
      error: error.message,
    });
  }
});

// @route   PUT /api/reviews/:id
// @desc    Update a review
// @access  Private (Review owner)
router.put(
  "/:id",
  [
    authenticate,
    body("rating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("title")
      .optional()
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage("Title must be between 5 and 100 characters"),
    body("comment")
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Comment must be between 10 and 1000 characters"),
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

      const reviewId = req.params.id;
      const userId = req.user.id;
      const updates = req.body;

      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      // Check ownership
      if (review.user.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Only allow updating if review is not older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (review.createdAt < thirtyDaysAgo) {
        return res.status(400).json({
          success: false,
          message: "Reviews can only be edited within 30 days of creation",
        });
      }

      // Update review
      Object.keys(updates).forEach((key) => {
        if (["rating", "title", "comment", "images"].includes(key)) {
          review[key] = updates[key];
        }
      });

      // Reset status to pending if content changed
      if (updates.rating || updates.title || updates.comment) {
        review.status = "pending";
      }

      await review.save();

      await review.populate([
        { path: "user", select: "name avatar" },
        { path: "product", select: "name images" },
      ]);

      res.json({
        success: true,
        message: "Review updated successfully",
        data: review,
      });
    } catch (error) {
      console.error("Update review error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update review",
        error: error.message,
      });
    }
  }
);

// @route   DELETE /api/reviews/:id
// @desc    Delete a review
// @access  Private (Review owner or Admin)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check ownership or admin role
    if (review.user.toString() !== userId && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await review.remove();

    res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
});

// @route   POST /api/reviews/:id/helpful
// @desc    Vote on review helpfulness
// @access  Private
router.post(
  "/:id/helpful",
  [
    authenticate,
    body("vote")
      .isIn(["helpful", "not_helpful"])
      .withMessage("Vote must be helpful or not_helpful"),
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

      const reviewId = req.params.id;
      const userId = req.user.id;
      const { vote } = req.body;

      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      // Don't allow voting on own review
      if (review.user.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: "Cannot vote on your own review",
        });
      }

      // Add/update vote
      review.voteHelpful(userId, vote);
      await review.save();

      res.json({
        success: true,
        message: "Vote recorded successfully",
        data: {
          helpfulVotes: review.helpfulVotes,
          notHelpfulVotes: review.notHelpfulVotes,
        },
      });
    } catch (error) {
      console.error("Vote on review error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to record vote",
        error: error.message,
      });
    }
  }
);

// @route   POST /api/reviews/:id/respond
// @desc    Seller response to review
// @access  Private (Seller)
router.post(
  "/:id/respond",
  [
    authenticate,
    authorize("seller"),
    body("comment")
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Response must be between 10 and 500 characters"),
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

      const reviewId = req.params.id;
      const userId = req.user.id;
      const { comment } = req.body;

      const review = await Review.findById(reviewId).populate(
        "product",
        "seller"
      );
      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      // Check if user is the seller of the reviewed product
      if (review.product.seller.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Only the product seller can respond to this review",
        });
      }

      // Check if already responded
      if (review.sellerResponse && review.sellerResponse.comment) {
        return res.status(400).json({
          success: false,
          message: "You have already responded to this review",
        });
      }

      review.sellerResponse = {
        comment,
        respondedAt: new Date(),
        respondedBy: userId,
      };

      await review.save();

      await review.populate(
        "sellerResponse.respondedBy",
        "name sellerInfo.businessName"
      );

      res.json({
        success: true,
        message: "Response added successfully",
        data: review.sellerResponse,
      });
    } catch (error) {
      console.error("Seller response error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add response",
        error: error.message,
      });
    }
  }
);

module.exports = router;
