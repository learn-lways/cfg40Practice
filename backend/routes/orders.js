const express = require("express");
const { body, validationResult } = require("express-validator");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private (Buyer)
router.post(
  "/",
  [
    authenticate,
    authorize("buyer"),
    body("items")
      .isArray({ min: 1 })
      .withMessage("Order must contain at least one item"),
    body("shippingAddress.street")
      .notEmpty()
      .withMessage("Shipping address is required"),
    body("shippingAddress.city").notEmpty().withMessage("City is required"),
    body("shippingAddress.zipCode")
      .notEmpty()
      .withMessage("Zip code is required"),
    body("paymentMethod")
      .isIn(["credit_card", "debit_card", "paypal", "stripe"])
      .withMessage("Invalid payment method"),
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

      const { items, shippingAddress, paymentMethod, paymentDetails } =
        req.body;
      const buyerId = req.user.id;

      // Validate products and calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findById(item.productId).populate(
          "seller"
        );

        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product with ID ${item.productId} not found`,
          });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
          });
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          product: product._id,
          seller: product.seller._id,
          quantity: item.quantity,
          price: product.price,
          sku: product.sku,
          productName: product.name,
          productImage: product.images[0]?.url || "default-product.png",
        });
      }

      // Calculate tax and total
      const taxRate = 0.08; // 8% tax
      const tax = subtotal * taxRate;
      const shippingCost = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
      const total = subtotal + tax + shippingCost;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`;

      // Create order
      const order = new Order({
        orderNumber,
        buyer: buyerId,
        items: orderItems,
        subtotal,
        tax,
        taxRate,
        shippingCost,
        total,
        shippingAddress,
        paymentMethod,
        paymentDetails: {
          method: paymentMethod,
          transactionId: paymentDetails?.transactionId,
          status: "pending",
        },
      });

      await order.save();

      // Update product stock
      for (const item of items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity },
        });
      }

      // Populate order details for response
      await order.populate([
        { path: "buyer", select: "name email" },
        { path: "items.product", select: "name images price" },
        { path: "items.seller", select: "name sellerInfo.businessName" },
      ]);

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: order,
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create order",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get("/", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = {};

    // Buyers see their orders, sellers see orders for their products
    if (userRole === "buyer") {
      query.buyer = userId;
    } else if (userRole === "seller") {
      query["items.seller"] = userId;
    } else if (userRole === "admin") {
      // Admin can see all orders
    }

    if (status) {
      query.status = status;
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
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order by ID
// @access  Private
router.get("/:id", authenticate, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await Order.findById(orderId)
      .populate("buyer", "name email phone")
      .populate("items.product", "name description images")
      .populate("items.seller", "name sellerInfo.businessName email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check authorization
    const isOwner = order.buyer._id.toString() === userId;
    const isSeller = order.items.some(
      (item) => item.seller._id.toString() === userId
    );
    const isAdmin = userRole === "admin";

    if (!isOwner && !isSeller && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Seller/Admin)
router.put(
  "/:id/status",
  [
    authenticate,
    body("status")
      .isIn([
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ])
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

      const orderId = req.params.id;
      const { status, trackingNumber } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check authorization - only sellers involved in the order or admins can update
      const isSeller = order.items.some(
        (item) => item.seller.toString() === userId
      );
      const isAdmin = userRole === "admin";

      if (!isSeller && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Update order status
      order.status = status;
      if (trackingNumber) {
        order.trackingNumber = trackingNumber;
      }

      // Add status history
      order.statusHistory.push({
        status,
        updatedBy: userId,
        updatedAt: new Date(),
        note: `Order ${status} by ${userRole}`,
      });

      if (status === "delivered") {
        order.deliveredAt = new Date();
      }

      await order.save();

      res.json({
        success: true,
        message: "Order status updated successfully",
        data: order,
      });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update order status",
        error: error.message,
      });
    }
  }
);

// @route   DELETE /api/orders/:id
// @desc    Cancel an order
// @access  Private (Buyer - only if pending/confirmed)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Only buyer can cancel their own order
    if (order.buyer.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Can only cancel if order is pending or confirmed
    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel order in current status",
      });
    }

    // Update order status to cancelled
    order.status = "cancelled";
    order.statusHistory.push({
      status: "cancelled",
      updatedBy: userId,
      updatedAt: new Date(),
      note: "Order cancelled by buyer",
    });

    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    res.json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.message,
    });
  }
});

module.exports = router;
