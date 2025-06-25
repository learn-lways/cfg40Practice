const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },

    // Customer Information
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Buyer is required"],
    },

    // Order Items
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        seller: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Price cannot be negative"],
        },
        variant: {
          name: String,
          value: String,
        },
        sku: String,
        productName: String, // Store at time of order
        productImage: String,
      },
    ],

    // Pricing
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // Payment Information
    payment: {
      method: {
        type: String,
        enum: [
          "credit-card",
          "debit-card",
          "paypal",
          "stripe",
          "bank-transfer",
          "cash-on-delivery",
        ],
        required: true,
      },
      status: {
        type: String,
        enum: [
          "pending",
          "processing",
          "completed",
          "failed",
          "refunded",
          "partially-refunded",
        ],
        default: "pending",
      },
      transactionId: String,
      paymentIntentId: String, // For Stripe
      paidAt: Date,
      refundedAt: Date,
      refundAmount: Number,
    },

    // Shipping Information
    shipping: {
      address: {
        name: {
          type: String,
          required: true,
        },
        street: {
          type: String,
          required: true,
        },
        city: {
          type: String,
          required: true,
        },
        state: {
          type: String,
          required: true,
        },
        zipCode: {
          type: String,
          required: true,
        },
        country: {
          type: String,
          required: true,
        },
        phone: String,
      },
      method: {
        type: String,
        enum: ["standard", "express", "overnight", "pickup"],
        default: "standard",
      },
      carrier: String,
      trackingNumber: String,
      estimatedDelivery: Date,
      actualDelivery: Date,
      shippedAt: Date,
    },

    // Billing Information
    billing: {
      address: {
        name: String,
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      sameAsShipping: {
        type: Boolean,
        default: true,
      },
    },

    // Order Status
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "out-for-delivery",
        "delivered",
        "cancelled",
        "returned",
        "refunded",
      ],
      default: "pending",
    },

    // Status History
    statusHistory: [
      {
        status: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // Coupon/Discount Information
    coupon: {
      code: String,
      discountType: {
        type: String,
        enum: ["percentage", "fixed"],
      },
      discountValue: Number,
      appliedAmount: Number,
    },

    // Notes
    customerNotes: String,
    adminNotes: String,

    // Cancellation/Return
    cancellation: {
      reason: String,
      cancelledAt: Date,
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      refundStatus: {
        type: String,
        enum: ["pending", "processed", "rejected"],
      },
    },

    return: {
      reason: String,
      requestedAt: Date,
      approvedAt: Date,
      status: {
        type: String,
        enum: ["requested", "approved", "rejected", "completed"],
      },
      refundAmount: Number,
    },

    // Analytics
    source: {
      type: String,
      enum: ["web", "mobile", "api"],
      default: "web",
    },

    // Timestamps
    estimatedDeliveryDate: Date,
    deliveredAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
orderSchema.virtual("orderAge").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

orderSchema.virtual("isDelivered").get(function () {
  return this.status === "delivered";
});

orderSchema.virtual("canBeCancelled").get(function () {
  return ["pending", "confirmed"].includes(this.status);
});

orderSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Indexes - Note: orderNumber already has unique:true so no need for manual index
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ "items.seller": 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "payment.status": 1 });
orderSchema.index({ createdAt: -1 });

// Pre-save middleware to generate order number
orderSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = "ORD-" + String(count + 1).padStart(6, "0");

    // Add initial status to history
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  }

  next();
});

// Pre-save middleware to calculate totals
orderSchema.pre("save", function (next) {
  // Calculate subtotal
  this.subtotal = this.items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  // Calculate tax
  this.tax = this.subtotal * this.taxRate;

  // Calculate total
  this.total = this.subtotal + this.tax + this.shippingCost - this.discount;

  // Ensure total is not negative
  if (this.total < 0) this.total = 0;

  next();
});

// Method to update status
orderSchema.methods.updateStatus = function (newStatus, note, updatedBy) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy,
  });

  // Set specific timestamps based on status
  switch (newStatus) {
    case "shipped":
      this.shipping.shippedAt = new Date();
      break;
    case "delivered":
      this.deliveredAt = new Date();
      this.shipping.actualDelivery = new Date();
      break;
    case "cancelled":
      this.cancelledAt = new Date();
      break;
  }

  return this.save();
};

// Method to process payment
orderSchema.methods.processPayment = function (transactionId, paymentIntentId) {
  this.payment.status = "completed";
  this.payment.transactionId = transactionId;
  this.payment.paymentIntentId = paymentIntentId;
  this.payment.paidAt = new Date();

  // Auto-confirm order after successful payment
  if (this.status === "pending") {
    this.updateStatus("confirmed", "Payment processed successfully");
  }

  return this.save();
};

// Method to cancel order
orderSchema.methods.cancelOrder = function (reason, cancelledBy) {
  if (!this.canBeCancelled) {
    throw new Error("Order cannot be cancelled in current status");
  }

  this.cancellation = {
    reason,
    cancelledAt: new Date(),
    cancelledBy,
    refundStatus: this.payment.status === "completed" ? "pending" : "processed",
  };

  return this.updateStatus(
    "cancelled",
    `Order cancelled: ${reason}`,
    cancelledBy
  );
};

// Static method to get orders by seller
orderSchema.statics.findBySeller = function (sellerId, options = {}) {
  const query = { "items.seller": sellerId };

  if (options.status) {
    query.status = options.status;
  }

  return this.find(query)
    .populate("buyer", "name email")
    .populate("items.product", "name images")
    .sort({ createdAt: -1 });
};

// Static method to get sales analytics
orderSchema.statics.getSalesAnalytics = function (
  sellerId,
  startDate,
  endDate
) {
  const matchStage = {
    "items.seller": mongoose.Types.ObjectId(sellerId),
    status: { $in: ["delivered", "shipped"] },
    createdAt: { $gte: startDate, $lte: endDate },
  };

  return this.aggregate([
    { $match: matchStage },
    { $unwind: "$items" },
    { $match: { "items.seller": mongoose.Types.ObjectId(sellerId) } },
    {
      $group: {
        _id: null,
        totalSales: {
          $sum: { $multiply: ["$items.price", "$items.quantity"] },
        },
        totalOrders: { $sum: 1 },
        totalQuantity: { $sum: "$items.quantity" },
      },
    },
  ]);
};

module.exports = mongoose.model("Order", orderSchema);
