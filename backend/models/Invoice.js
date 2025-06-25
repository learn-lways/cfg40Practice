const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Invoice Details
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        total: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    // Amounts
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
      default: 18, // GST rate in percentage
      min: 0,
      max: 100,
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
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Billing Information
    billingAddress: {
      name: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: "India",
      },
    },

    // Company Information
    companyInfo: {
      name: {
        type: String,
        default: "Your E-commerce Store",
      },
      address: {
        type: String,
        default: "123 Business Street, City, State, 110001",
      },
      phone: {
        type: String,
        default: "+91 9876543210",
      },
      email: {
        type: String,
        default: "orders@yourstore.com",
      },
      gst: {
        type: String,
        default: "GST123456789",
      },
      website: {
        type: String,
        default: "www.yourstore.com",
      },
    },

    // Payment Information
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "netbanking", "wallet", "cod", "bank_transfer"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "failed", "refunded"],
      default: "paid",
    },
    transactionId: String,
    paymentDate: {
      type: Date,
      default: Date.now,
    },

    // Invoice Status
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      default: "sent",
    },

    // PDF and Email
    pdfPath: String,
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: Date,

    // Dates
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      },
    },

    // Notes
    notes: {
      type: String,
      default: "Thank you for your business!",
    },
    terms: {
      type: String,
      default:
        "Payment is due within 30 days. Late payments may incur additional charges.",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate invoice number
invoiceSchema.pre("save", async function (next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    // Find the last invoice of this month
    const lastInvoice = await this.constructor
      .findOne({
        invoiceNumber: new RegExp(`^INV-${year}${month}-`),
      })
      .sort({ invoiceNumber: -1 });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split("-")[2]);
      sequence = lastSequence + 1;
    }

    this.invoiceNumber = `INV-${year}${month}-${String(sequence).padStart(
      4,
      "0"
    )}`;
  }
  next();
});

// Calculate tax before saving
invoiceSchema.pre("save", function (next) {
  this.tax = Math.round(((this.subtotal * this.taxRate) / 100) * 100) / 100;
  this.totalAmount =
    this.subtotal + this.tax + this.shippingCost - this.discount;
  next();
});

// Virtual for formatted total
invoiceSchema.virtual("formattedTotal").get(function () {
  return `₹${this.totalAmount.toFixed(2)}`;
});

// Virtual for due status
invoiceSchema.virtual("isDue").get(function () {
  return this.dueDate < new Date() && this.status !== "paid";
});

// Static method to generate invoice from order
invoiceSchema.statics.createFromOrder = async function (orderId) {
  const Order = mongoose.model("Order");
  const User = mongoose.model("User");

  const order = await Order.findById(orderId)
    .populate("buyer", "name email phone")
    .populate("items.product", "name price");

  if (!order) {
    throw new Error("Order not found");
  }

  const user = await User.findById(order.buyer._id);

  const invoiceData = {
    order: order._id,
    user: order.buyer._id,
    items: order.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
    })),
    subtotal: order.subtotal,
    shippingCost: order.shippingCost || 0,
    discount: order.discount || 0,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    transactionId: order.transactionId,
    billingAddress: {
      name: order.shippingAddress.name || user.name,
      email: user.email,
      phone: order.shippingAddress.phone || user.phone,
      address: order.shippingAddress.address,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country || "India",
    },
  };

  const invoice = new this(invoiceData);
  await invoice.save();

  return invoice;
};

module.exports = mongoose.model("Invoice", invoiceSchema);
