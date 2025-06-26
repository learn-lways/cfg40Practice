const express = require("express");
const { body, validationResult } = require("express-validator");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private (Buyer)
router.get("/", [authenticate, authorize("buyer")], async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.getOrCreateCart(userId);

    // Filter out inactive products or products with no stock
    const validItems = cart.items.filter(
      (item) => item.product && item.product.isActive && item.product.stock > 0
    );

    // Remove invalid items if any found
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
      error: error.message,
    });
  }
});

// @route   POST /api/cart/items
// @desc    Add item to cart
// @access  Private (Buyer)
router.post(
  "/items",
  [
    authenticate,
    authorize("buyer"),
    body("productId").isMongoId().withMessage("Valid product ID is required"),
    body("quantity")
      .isInt({ min: 1, max: 10 })
      .withMessage("Quantity must be between 1 and 10"),
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

      const { productId, quantity } = req.body;
      const userId = req.user.id;

      // Verify product exists and is available
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: "Product is not available",
        });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Available: ${product.stock}`,
        });
      }

      // Get or create cart
      const cart = await Cart.getOrCreateCart(userId);

      // Check if adding this quantity would exceed stock or max quantity per item
      const existingItem = cart.items.find(
        (item) => item.product._id.toString() === productId
      );

      const newTotalQuantity = existingItem
        ? existingItem.quantity + quantity
        : quantity;

      if (newTotalQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Cannot add ${quantity} items. Would exceed available stock of ${product.stock}`,
        });
      }

      if (newTotalQuantity > 10) {
        return res.status(400).json({
          success: false,
          message: "Maximum 10 items per product allowed in cart",
        });
      }

      // Add item to cart
      cart.addItem(productId, quantity, product.price);
      await cart.save();

      // Populate and return updated cart
      await cart.populate("items.product", "name price stock images isActive");

      res.json({
        success: true,
        message: "Item added to cart successfully",
        data: cart,
      });
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add item to cart",
        error: error.message,
      });
    }
  }
);

// Alias for /api/cart/items to support /api/cart/add
router.post("/add", (req, res, next) => {
  req.url = "/items";
  next();
});

// @route   PUT /api/cart/items/:productId
// @desc    Update item quantity in cart
// @access  Private (Buyer)
router.put(
  "/items/:productId",
  [
    authenticate,
    authorize("buyer"),
    body("quantity")
      .isInt({ min: 0, max: 10 })
      .withMessage("Quantity must be between 0 and 10"),
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

      const productId = req.params.productId;
      const { quantity } = req.body;
      const userId = req.user.id;

      // Get cart
      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }

      // Check if item exists in cart
      const itemExists = cart.items.some(
        (item) => item.product.toString() === productId
      );

      if (!itemExists) {
        return res.status(404).json({
          success: false,
          message: "Item not found in cart",
        });
      }

      // If quantity > 0, verify product stock
      if (quantity > 0) {
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
          return res.status(400).json({
            success: false,
            message: "Product is not available",
          });
        }

        if (product.stock < quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock. Available: ${product.stock}`,
          });
        }
      }

      // Update item quantity (will remove if quantity is 0)
      cart.updateItemQuantity(productId, quantity);
      await cart.save();

      // Populate and return updated cart
      await cart.populate("items.product", "name price stock images isActive");

      res.json({
        success: true,
        message:
          quantity > 0 ? "Cart updated successfully" : "Item removed from cart",
        data: cart,
      });
    } catch (error) {
      console.error("Update cart error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update cart",
        error: error.message,
      });
    }
  }
);

// @route   DELETE /api/cart/items/:productId
// @desc    Remove item from cart
// @access  Private (Buyer)
router.delete(
  "/items/:productId",
  [authenticate, authorize("buyer")],
  async (req, res) => {
    try {
      const productId = req.params.productId;
      const userId = req.user.id;

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }

      // Check if item exists in cart
      const itemExists = cart.items.some(
        (item) => item.product.toString() === productId
      );

      if (!itemExists) {
        return res.status(404).json({
          success: false,
          message: "Item not found in cart",
        });
      }

      // Remove item from cart
      cart.removeItem(productId);
      await cart.save();

      // Populate and return updated cart
      await cart.populate("items.product", "name price stock images isActive");

      res.json({
        success: true,
        message: "Item removed from cart successfully",
        data: cart,
      });
    } catch (error) {
      console.error("Remove from cart error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove item from cart",
        error: error.message,
      });
    }
  }
);

// @route   DELETE /api/cart
// @desc    Clear entire cart
// @access  Private (Buyer)
router.delete("/", [authenticate, authorize("buyer")], async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Clear cart
    cart.clearCart();
    await cart.save();

    res.json({
      success: true,
      message: "Cart cleared successfully",
      data: cart,
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: error.message,
    });
  }
});

// @route   GET /api/cart/count
// @desc    Get cart item count
// @access  Private (Buyer)
router.get("/count", [authenticate, authorize("buyer")], async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });
    const itemCount = cart ? cart.totalItems : 0;

    res.json({
      success: true,
      data: {
        itemCount,
      },
    });
  } catch (error) {
    console.error("Get cart count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart count",
      error: error.message,
    });
  }
});

// @route   POST /api/cart/sync
// @desc    Sync cart with current product prices and availability
// @access  Private (Buyer)
router.post("/sync", [authenticate, authorize("buyer")], async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId }).populate(
      "items.product",
      "name price stock isActive"
    );

    if (!cart || cart.items.length === 0) {
      return res.json({
        success: true,
        message: "Cart is empty",
        data: cart || { items: [], subtotal: 0, totalItems: 0 },
      });
    }

    let changes = [];
    let itemsToRemove = [];

    // Check each item for price changes or availability
    cart.items.forEach((item, index) => {
      if (!item.product || !item.product.isActive) {
        itemsToRemove.push(index);
        changes.push({
          type: "removed",
          productName: item.product?.name || "Unknown Product",
          reason: "Product no longer available",
        });
      } else if (item.product.stock < item.quantity) {
        if (item.product.stock === 0) {
          itemsToRemove.push(index);
          changes.push({
            type: "removed",
            productName: item.product.name,
            reason: "Out of stock",
          });
        } else {
          item.quantity = item.product.stock;
          changes.push({
            type: "quantity_updated",
            productName: item.product.name,
            newQuantity: item.product.stock,
            reason: "Insufficient stock",
          });
        }
      } else if (item.price !== item.product.price) {
        const oldPrice = item.price;
        item.price = item.product.price;
        changes.push({
          type: "price_updated",
          productName: item.product.name,
          oldPrice,
          newPrice: item.product.price,
        });
      }
    });

    // Remove unavailable items (in reverse order to maintain indices)
    itemsToRemove.reverse().forEach((index) => {
      cart.items.splice(index, 1);
    });

    // Save changes if any
    if (changes.length > 0) {
      await cart.save();
    }

    res.json({
      success: true,
      message:
        changes.length > 0
          ? "Cart synchronized with current prices and availability"
          : "Cart is up to date",
      data: cart,
      changes,
    });
  } catch (error) {
    console.error("Sync cart error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync cart",
      error: error.message,
    });
  }
});

module.exports = router;
