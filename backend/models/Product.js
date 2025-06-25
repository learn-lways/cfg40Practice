const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [200, "Short description cannot exceed 200 characters"],
    },

    // Pricing
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      min: [0, "Original price cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100%"],
    },

    // Inventory
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [0, "Low stock threshold cannot be negative"],
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
    },

    // Categorization
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
    },
    subcategory: String,

    // Enhanced tags for better recommendations
    tags: {
      type: [String],
      validate: {
        validator: function (tags) {
          return tags.length <= 20; // Limit to 20 tags
        },
        message: "Too many tags (maximum 20 allowed)",
      },
      set: function (tags) {
        // Clean and normalize tags
        return tags
          .map((tag) => tag.toLowerCase().trim())
          .filter((tag) => tag.length > 0);
      },
    },

    // Product attributes for recommendations
    attributes: {
      material: String, // e.g., "cotton", "leather", "plastic"
      gender: {
        type: String,
        enum: ["men", "women", "unisex", "kids"],
        default: "unisex",
      },
      ageGroup: {
        type: String,
        enum: ["infant", "toddler", "kids", "teen", "adult", "senior"],
        default: "adult",
      },
      season: {
        type: String,
        enum: ["spring", "summer", "fall", "winter", "all-season"],
        default: "all-season",
      },
      occasion: [String], // e.g., ["casual", "formal", "sports"]
      style: [String], // e.g., ["modern", "vintage", "minimalist"]
    },

    brand: String,

    // Uniqueness indicators
    isUnique: {
      type: Boolean,
      default: false,
      index: true,
    },
    uniquenessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Media
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        alt: String,
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    videos: [
      {
        url: String,
        title: String,
        duration: Number,
      },
    ],

    // Product specifications
    specifications: [
      {
        name: String,
        value: String,
        unit: String,
      },
    ],

    // Variants (size, color, etc.)
    variants: [
      {
        name: String, // e.g., "Color", "Size"
        options: [
          {
            value: String, // e.g., "Red", "Large"
            price: Number, // Additional price
            stock: Number,
            sku: String,
          },
        ],
      },
    ],

    // Seller Information
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller is required"],
    },

    // Product status
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "out-of-stock", "discontinued"],
      default: "draft",
    },

    // SEO
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    metaTitle: String,
    metaDescription: String,

    // Shipping
    shipping: {
      weight: Number, // in kg
      dimensions: {
        length: Number, // in cm
        width: Number,
        height: Number,
      },
      freeShipping: {
        type: Boolean,
        default: false,
      },
      shippingCost: {
        type: Number,
        default: 0,
      },
    },

    // Reviews and ratings
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: String,
        images: [String],
        helpful: {
          type: Number,
          default: 0,
        },
        verified: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Analytics
    views: {
      type: Number,
      default: 0,
    },
    purchases: {
      type: Number,
      default: 0,
    },

    // Flags
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isDigital: {
      type: Boolean,
      default: false,
    },

    // Timestamps
    publishedAt: Date,
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
productSchema.virtual("finalPrice").get(function () {
  if (this.discount > 0) {
    return this.price - (this.price * this.discount) / 100;
  }
  return this.price;
});

productSchema.virtual("isLowStock").get(function () {
  return this.stock <= this.lowStockThreshold;
});

productSchema.virtual("isOutOfStock").get(function () {
  return this.stock === 0;
});

productSchema.virtual("reviewsCount").get(function () {
  return this.reviews.length;
});

// Indexes - Note: slug and sku already have unique:true so no need for manual indexes
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ seller: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ "ratings.average": -1 });
productSchema.index({ createdAt: -1 });

// Pre-save middleware to generate slug
productSchema.pre("save", function (next) {
  if (this.isModified("name") || this.isNew) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Add random suffix if needed for uniqueness
    if (this.isNew) {
      this.slug += "-" + Math.random().toString(36).substr(2, 6);
    }
  }

  // Update lastUpdated
  this.lastUpdated = new Date();

  next();
});

// Method to add review
productSchema.methods.addReview = function (
  userId,
  rating,
  comment,
  images = []
) {
  const review = {
    user: userId,
    rating,
    comment,
    images,
    createdAt: new Date(),
  };

  this.reviews.push(review);
  this.calculateAverageRating();

  return this.save();
};

// Method to calculate average rating
productSchema.methods.calculateAverageRating = function () {
  if (this.reviews.length === 0) {
    this.ratings.average = 0;
    this.ratings.count = 0;
    return;
  }

  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  this.ratings.average = Math.round((sum / this.reviews.length) * 10) / 10;
  this.ratings.count = this.reviews.length;
};

// Method to increment views
productSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

// Static method to find featured products
productSchema.statics.findFeatured = function (limit = 10) {
  return this.find({ isFeatured: true, status: "active" })
    .populate("seller", "name sellerInfo.businessName")
    .limit(limit)
    .sort({ createdAt: -1 });
};

// Static method to search products
productSchema.statics.searchProducts = function (query, filters = {}) {
  const searchQuery = {
    status: "active",
    ...filters,
  };

  if (query) {
    searchQuery.$text = { $search: query };
  }

  return this.find(searchQuery)
    .populate("seller", "name sellerInfo.businessName")
    .populate("category", "name");
};

// Static method to find similar products based on tags and attributes
productSchema.statics.findSimilarProducts = function (productId, limit = 8) {
  return this.findById(productId).then((product) => {
    if (!product) throw new Error("Product not found");

    const matchQuery = {
      _id: { $ne: productId },
      status: "active",
      $or: [
        // Same category (high relevance)
        { category: product.category },
        // Similar tags (at least 1 matching tag)
        { tags: { $in: product.tags } },
        // Same brand
        { brand: product.brand },
        // Similar attributes
        { "attributes.gender": product.attributes?.gender },
        { "attributes.ageGroup": product.attributes?.ageGroup },
        { "attributes.occasion": { $in: product.attributes?.occasion || [] } },
        { "attributes.style": { $in: product.attributes?.style || [] } },
        // Similar price range (±50% for more flexibility)
        product.price
          ? {
              price: {
                $gte: product.price * 0.5,
                $lte: product.price * 1.5,
              },
            }
          : {},
      ].filter((condition) => Object.keys(condition).length > 0), // Remove empty conditions
    };

    return this.find(matchQuery)
      .populate("seller", "name sellerInfo.businessName")
      .populate("category", "name")
      .sort({
        averageRating: -1, // Higher rated first
        totalSales: -1, // Popular items first
        createdAt: -1, // Newer first
      })
      .limit(limit);
  });
};

// Static method to find unique/one-of-a-kind products
productSchema.statics.findUniqueProducts = function (limit = 12) {
  return this.find({
    status: "active",
    $or: [
      { isUnique: true },
      { uniquenessScore: { $gte: 70 } },
      {
        $and: [
          { inventory: { $lte: 5 } }, // Low stock
          {
            tags: {
              $in: ["limited-edition", "handmade", "custom", "vintage", "rare"],
            },
          },
        ],
      },
    ],
  })
    .populate("seller", "name sellerInfo.businessName")
    .populate("category", "name")
    .sort({
      uniquenessScore: -1,
      averageRating: -1,
      createdAt: -1,
    })
    .limit(limit);
};

// Method to calculate uniqueness score based on various factors
productSchema.methods.calculateUniquenessScore = function () {
  let score = 0;

  // Base score for being marked as unique
  if (this.isUnique) score += 50;

  // Low inventory adds uniqueness
  if (this.inventory <= 1) score += 30;
  else if (this.inventory <= 5) score += 20;
  else if (this.inventory <= 10) score += 10;

  // Special tags add uniqueness
  const uniqueTags = [
    "limited-edition",
    "handmade",
    "custom",
    "vintage",
    "rare",
    "one-of-a-kind",
  ];
  const matchingUniqueTags = this.tags.filter((tag) =>
    uniqueTags.includes(tag)
  );
  score += matchingUniqueTags.length * 15;

  // High price relative to category average adds uniqueness
  // This would require category price analysis - simplified for now
  if (this.price > 1000) score += 10;

  // Brand exclusivity (simplified)
  const exclusiveBrands = ["luxury", "premium", "artisan", "boutique"];
  if (
    exclusiveBrands.some((brand) => this.brand?.toLowerCase().includes(brand))
  ) {
    score += 15;
  }

  // Cap at 100
  this.uniquenessScore = Math.min(score, 100);
  return this.uniquenessScore;
};

module.exports = mongoose.model("Product", productSchema);
