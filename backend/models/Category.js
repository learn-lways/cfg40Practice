const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [50, "Category name cannot exceed 50 characters"],
      unique: true,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    // Hierarchy
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Display
    image: {
      type: String,
      default: "default-category.png",
    },
    icon: String,
    color: {
      type: String,
      match: [
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        "Please enter a valid hex color",
      ],
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // SEO
    metaTitle: String,
    metaDescription: String,

    // Order
    sortOrder: {
      type: Number,
      default: 0,
    },

    // Analytics
    productCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full path
categorySchema.virtual("fullPath").get(function () {
  // This would need to be populated to work properly
  return this.parent ? `${this.parent.name} > ${this.name}` : this.name;
});

// Virtual for children
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

// Indexes - Note: name and slug already have unique:true so no need for manual indexes
categorySchema.index({ parent: 1, sortOrder: 1 });
categorySchema.index({ isActive: 1, level: 1 });

// Pre-save middleware to generate slug
categorySchema.pre("save", function (next) {
  if (this.isModified("name") || this.isNew) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

// Pre-save middleware to set level
categorySchema.pre("save", async function (next) {
  if (this.isModified("parent") || this.isNew) {
    if (this.parent) {
      const parentCategory = await this.constructor.findById(this.parent);
      if (parentCategory) {
        this.level = parentCategory.level + 1;
      }
    } else {
      this.level = 0;
    }
  }
  next();
});

// Static method to get category tree
categorySchema.statics.getCategoryTree = function () {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "parent",
        as: "children",
      },
    },
    { $match: { parent: null } },
    { $sort: { sortOrder: 1, name: 1 } },
  ]);
};

// Static method to get all descendants
categorySchema.statics.getDescendants = async function (categoryId) {
  const descendants = [];

  const findChildren = async (parentId) => {
    const children = await this.find({ parent: parentId, isActive: true });
    for (const child of children) {
      descendants.push(child._id);
      await findChildren(child._id);
    }
  };

  await findChildren(categoryId);
  return descendants;
};

// Method to update product count
categorySchema.methods.updateProductCount = async function () {
  const Product = mongoose.model("Product");
  const count = await Product.countDocuments({
    category: this._id,
    status: "active",
  });
  this.productCount = count;
  return this.save();
};

module.exports = mongoose.model("Category", categorySchema);
