const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      required: [true, "Review title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    images: [
      {
        url: String,
        alt: String,
      },
    ],

    // Review status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Moderation
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    moderatedAt: Date,
    moderationNote: String,

    // Helpfulness
    helpfulVotes: {
      type: Number,
      default: 0,
    },
    notHelpfulVotes: {
      type: Number,
      default: 0,
    },
    votedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        vote: {
          type: String,
          enum: ["helpful", "not_helpful"],
        },
      },
    ],

    // Seller response
    sellerResponse: {
      comment: String,
      respondedAt: Date,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Purchase verification
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
reviewSchema.index({ product: 1, user: 1 }, { unique: true }); // One review per user per product (includes user index)
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

// Virtual for helpfulness ratio
reviewSchema.virtual("helpfulnessRatio").get(function () {
  const totalVotes = this.helpfulVotes + this.notHelpfulVotes;
  return totalVotes > 0 ? (this.helpfulVotes / totalVotes) * 100 : 0;
});

// Static method to calculate average rating for a product
reviewSchema.statics.calculateAverageRating = async function (productId) {
  try {
    const result = await this.aggregate([
      {
        $match: {
          product: productId,
          status: "approved",
        },
      },
      {
        $group: {
          _id: "$product",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    if (result.length > 0) {
      // Calculate rating distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      result[0].ratingDistribution.forEach((rating) => {
        distribution[rating]++;
      });

      return {
        averageRating: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal
        reviewCount: result[0].reviewCount,
        distribution,
      };
    }

    return {
      averageRating: 0,
      reviewCount: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  } catch (error) {
    throw error;
  }
};

// Method to vote on review helpfulness
reviewSchema.methods.voteHelpful = function (userId, voteType) {
  // Remove any existing vote from this user
  this.votedUsers = this.votedUsers.filter(
    (vote) => vote.user.toString() !== userId.toString()
  );

  // Add new vote
  this.votedUsers.push({
    user: userId,
    vote: voteType,
  });

  // Recalculate vote counts
  this.helpfulVotes = this.votedUsers.filter(
    (vote) => vote.vote === "helpful"
  ).length;
  this.notHelpfulVotes = this.votedUsers.filter(
    (vote) => vote.vote === "not_helpful"
  ).length;
};

// Pre-save middleware to set verified status
reviewSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      // Check if the user actually purchased this product
      const Order = mongoose.model("Order");
      const order = await Order.findOne({
        _id: this.order,
        buyer: this.user,
        "items.product": this.product,
        status: "delivered",
      });

      this.verified = !!order;
    } catch (error) {
      console.error("Error verifying purchase:", error);
    }
  }
  next();
});

// Post-save middleware to update product rating
reviewSchema.post("save", async function () {
  try {
    const Product = mongoose.model("Product");
    const stats = await this.constructor.calculateAverageRating(this.product);

    await Product.findByIdAndUpdate(this.product, {
      rating: stats.averageRating,
      reviewCount: stats.reviewCount,
    });
  } catch (error) {
    console.error("Error updating product rating:", error);
  }
});

// Post-remove middleware to update product rating
reviewSchema.post("remove", async function () {
  try {
    const Product = mongoose.model("Product");
    const stats = await this.constructor.calculateAverageRating(this.product);

    await Product.findByIdAndUpdate(this.product, {
      rating: stats.averageRating,
      reviewCount: stats.reviewCount,
    });
  } catch (error) {
    console.error("Error updating product rating after review removal:", error);
  }
});

module.exports = mongoose.model("Review", reviewSchema);
