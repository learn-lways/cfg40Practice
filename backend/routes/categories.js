const express = require("express");
const { body, validationResult } = require("express-validator");
const Category = require("../models/Category");
const Product = require("../models/Product");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories with optional filters
// @access  Public
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status = "active",
      parent,
    } = req.query;

    let query = {};

    // Filter by status
    if (status !== "all") {
      query.isActive = status === "active";
    }

    // Filter by parent category
    if (parent) {
      query.parent = parent === "null" ? null : parent;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const categories = await Category.find(query)
      .populate("parent", "name slug")
      .populate("children", "name slug isActive")
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Category.countDocuments(query);

    // Get category tree if no specific filters
    const categoryTree = !search && !parent ? await buildCategoryTree() : null;

    res.json({
      success: true,
      data: categories,
      categoryTree,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalCategories: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
});

// Helper function to build category tree
async function buildCategoryTree() {
  try {
    const categories = await Category.find({ isActive: true })
      .populate("children", "name slug isActive")
      .sort({ name: 1 });

    // Get root categories (no parent)
    const rootCategories = categories.filter((cat) => !cat.parent);

    return rootCategories.map((category) => ({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      children: category.children.filter((child) => child.isActive),
    }));
  } catch (error) {
    throw error;
  }
}

// @route   GET /api/categories/:id
// @desc    Get single category by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId)
      .populate("parent", "name slug")
      .populate("children", "name slug isActive");

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get products count in this category
    const productCount = await Product.countDocuments({
      category: categoryId,
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        ...category.toObject(),
        productCount,
      },
    });
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    });
  }
});

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private (Admin/Seller)
router.post(
  "/",
  [
    authenticate,
    authorize("admin", "seller"),
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Category name must be between 2 and 100 characters"),
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("parent")
      .optional()
      .isMongoId()
      .withMessage("Invalid parent category ID"),
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

      const { name, description, parent, image, metaTitle, metaDescription } =
        req.body;

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim("-");

      // Check if category with same name or slug exists
      const existingCategory = await Category.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${name}$`, "i") } },
          { slug: slug },
        ],
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists",
        });
      }

      // If parent is specified, validate it exists
      if (parent) {
        const parentCategory = await Category.findById(parent);
        if (!parentCategory) {
          return res.status(404).json({
            success: false,
            message: "Parent category not found",
          });
        }
      }

      const category = new Category({
        name,
        slug,
        description,
        parent: parent || null,
        image,
        metaTitle: metaTitle || name,
        metaDescription: metaDescription || description,
        createdBy: req.user.id,
      });

      await category.save();

      // If this category has a parent, add it to parent's children
      if (parent) {
        await Category.findByIdAndUpdate(parent, {
          $addToSet: { children: category._id },
        });
      }

      await category.populate("parent", "name slug");

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create category",
        error: error.message,
      });
    }
  }
);

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private (Admin/Creator)
router.put(
  "/:id",
  [
    authenticate,
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Category name must be between 2 and 100 characters"),
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
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

      const categoryId = req.params.id;
      const updates = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Check authorization - admin or category creator
      if (userRole !== "admin" && category.createdBy.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // If name is being updated, regenerate slug
      if (updates.name) {
        const slug = updates.name
          .toLowerCase()
          .replace(/[^a-z0-9 -]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim("-");

        // Check if new name/slug conflicts with existing categories
        const existingCategory = await Category.findOne({
          _id: { $ne: categoryId },
          $or: [
            { name: { $regex: new RegExp(`^${updates.name}$`, "i") } },
            { slug: slug },
          ],
        });

        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: "Category with this name already exists",
          });
        }

        updates.slug = slug;
      }

      const updatedCategory = await Category.findByIdAndUpdate(
        categoryId,
        { $set: updates },
        { new: true, runValidators: true }
      )
        .populate("parent", "name slug")
        .populate("children", "name slug");

      res.json({
        success: true,
        message: "Category updated successfully",
        data: updatedCategory,
      });
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update category",
        error: error.message,
      });
    }
  }
);

// @route   DELETE /api/categories/:id
// @desc    Delete a category (soft delete)
// @access  Private (Admin)
router.delete("/:id", [authenticate, authorize("admin")], async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ category: categoryId });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${productCount} products. Please move or delete products first.`,
      });
    }

    // Check if category has children
    if (category.children && category.children.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete category that has subcategories. Please delete subcategories first.",
      });
    }

    // Soft delete - mark as inactive
    category.isActive = false;
    category.deletedAt = new Date();
    await category.save();

    // Remove from parent's children array if it has a parent
    if (category.parent) {
      await Category.findByIdAndUpdate(category.parent, {
        $pull: { children: categoryId },
      });
    }

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
});

// @route   GET /api/categories/:id/products
// @desc    Get all products in a category
// @access  Public
router.get("/:id/products", async (req, res) => {
  try {
    const categoryId = req.params.id;
    const {
      page = 1,
      limit = 12,
      sort = "createdAt",
      order = "desc",
      minPrice,
      maxPrice,
      inStock = true,
    } = req.query;

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    let query = {
      category: categoryId,
      isActive: true,
    };

    // Price filtering
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Stock filtering
    if (inStock === "true") {
      query.stock = { $gt: 0 };
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sort] = order === "desc" ? -1 : 1;

    const products = await Product.find(query)
      .populate("seller", "name sellerInfo.businessName sellerInfo.rating")
      .select(
        "name shortDescription price originalPrice discount images stock rating reviewCount"
      )
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        category: {
          _id: category._id,
          name: category.name,
          slug: category.slug,
        },
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalProducts: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get category products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category products",
      error: error.message,
    });
  }
});

module.exports = router;
