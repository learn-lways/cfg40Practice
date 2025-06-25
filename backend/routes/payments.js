const express = require("express");
const { body, validationResult } = require("express-validator");
const { authenticate, authorize } = require("../middleware/auth");
const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const paymentService = require("../services/paymentService");
const invoiceService = require("../services/invoiceService");

const router = express.Router();

// @route   POST /api/payments/create-order
// @desc    Create a payment order (Mock Razorpay)
// @access  Private (Buyer)
router.post(
  "/create-order",
  [
    authenticate,
    authorize("buyer"),
    body("orderId").isMongoId().withMessage("Valid order ID is required"),
    body("amount").isNumeric().withMessage("Valid amount is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { orderId, amount } = req.body;

      // Get order details
      const order = await Order.findById(orderId)
        .populate("buyer", "name email")
        .populate("items.product", "name price");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Verify user owns this order
      if (order.buyer._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized access to order",
        });
      }

      // Create Razorpay order (mock)
      const razorpayOrder = await paymentService.createRazorpayOrder(
        amount,
        "INR",
        orderId
      );

      res.status(201).json({
        success: true,
        data: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
        },
        message: "Payment order created successfully (Demo Mode)",
      });
    } catch (error) {
      console.error("Create payment order error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create payment order",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/payments/verify
// @desc    Verify payment and process order
// @access  Private (Buyer)
router.post(
  "/verify",
  [
    authenticate,
    authorize("buyer"),
    body("paymentId").notEmpty().withMessage("Payment ID is required"),
    body("orderId").notEmpty().withMessage("Order ID is required"),
    body("signature").notEmpty().withMessage("Signature is required"),
    body("orderDbId")
      .isMongoId()
      .withMessage("Valid order database ID is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { paymentId, orderId, signature, orderDbId } = req.body;

      // Get order from database
      const order = await Order.findById(orderDbId)
        .populate("buyer", "name email phone")
        .populate("items.product", "name price");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Verify user owns this order
      if (order.buyer._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized access to order",
        });
      }

      // Verify payment (mock)
      const paymentResult = await paymentService.verifyPayment(
        paymentId,
        orderId,
        signature
      );

      if (paymentResult.success) {
        // Update order status
        order.paymentStatus = "paid";
        order.status = "confirmed";
        order.transactionId = paymentResult.paymentId;
        order.paymentDate = new Date();
        await order.save();

        // Create invoice
        const invoice = await Invoice.createFromOrder(order._id);

        // Generate PDF invoice
        const invoiceResult = await invoiceService.createInvoice(invoice);

        // Update invoice with PDF path
        invoice.pdfPath = invoiceResult.filepath;

        // Send invoice email (if Gmail is configured)
        const emailResult = await paymentService.sendInvoiceEmail(
          invoice,
          invoiceResult.pdfBuffer
        );

        if (emailResult.success) {
          invoice.emailSent = true;
          invoice.emailSentAt = new Date();
        }

        await invoice.save();

        res.status(200).json({
          success: true,
          data: {
            order: {
              id: order._id,
              orderNumber: order.orderNumber,
              status: order.status,
              paymentStatus: order.paymentStatus,
              totalAmount: order.totalAmount,
            },
            invoice: {
              invoiceNumber: invoice.invoiceNumber,
              pdfGenerated: invoiceResult.success,
              emailSent: emailResult.success,
            },
            payment: {
              paymentId: paymentResult.paymentId,
              amount: paymentResult.amount,
              method: paymentResult.method,
            },
          },
          message: "Payment verified and order processed successfully",
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Payment verification failed",
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({
        success: false,
        message: "Payment verification failed",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/payments/mock-success
// @desc    Mock successful payment for demo purposes
// @access  Private (Buyer)
router.post(
  "/mock-success",
  [
    authenticate,
    authorize("buyer"),
    body("orderId").isMongoId().withMessage("Valid order ID is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { orderId } = req.body;

      // Get order from database
      const order = await Order.findById(orderId)
        .populate("buyer", "name email phone")
        .populate("items.product", "name price");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Verify user owns this order
      if (order.buyer._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized access to order",
        });
      }

      // Mock successful payment
      order.paymentStatus = "paid";
      order.status = "confirmed";
      order.transactionId = `mock_pay_${Date.now()}`;
      order.paymentDate = new Date();
      await order.save();

      // Create invoice
      const invoice = await Invoice.createFromOrder(order._id);

      // Generate PDF invoice
      const invoiceResult = await invoiceService.createInvoice(invoice);

      // Update invoice with PDF path
      invoice.pdfPath = invoiceResult.filepath;

      // Send invoice email (if Gmail is configured)
      const emailResult = await paymentService.sendInvoiceEmail(
        invoice,
        invoiceResult.pdfBuffer
      );

      if (emailResult.success) {
        invoice.emailSent = true;
        invoice.emailSentAt = new Date();
      }

      await invoice.save();

      res.status(200).json({
        success: true,
        data: {
          order: {
            id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
          },
          invoice: {
            invoiceNumber: invoice.invoiceNumber,
            pdfGenerated: invoiceResult.success,
            emailSent: emailResult.success,
            pdfPath: invoiceResult.filepath,
          },
          payment: {
            transactionId: order.transactionId,
            amount: order.totalAmount,
            method: order.paymentMethod,
            status: "Demo Payment Successful",
          },
        },
        message:
          "🎭 Demo payment processed successfully! Invoice generated and email sent.",
      });
    } catch (error) {
      console.error("Mock payment error:", error);
      res.status(500).json({
        success: false,
        message: "Mock payment processing failed",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/payments/invoice/:invoiceId
// @desc    Get invoice details
// @access  Private
router.get("/invoice/:invoiceId", authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId)
      .populate("user", "name email")
      .populate("order", "orderNumber")
      .populate("items.product", "name");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Check if user owns this invoice or is admin
    if (
      invoice.user._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to invoice",
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
      message: "Invoice retrieved successfully",
    });
  } catch (error) {
    console.error("Get invoice error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve invoice",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// @route   GET /api/payments/invoice/:invoiceId/download
// @desc    Download invoice PDF
// @access  Private
router.get("/invoice/:invoiceId/download", authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Check if user owns this invoice or is admin
    if (invoice.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to invoice",
      });
    }

    if (invoice.pdfPath && require("fs").existsSync(invoice.pdfPath)) {
      // Serve existing PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`
      );

      const fs = require("fs");
      const pdfStream = fs.createReadStream(invoice.pdfPath);
      pdfStream.pipe(res);
    } else {
      // Generate new PDF
      const populatedInvoice = await Invoice.findById(
        req.params.invoiceId
      ).populate("items.product", "name");

      const invoiceResult = await invoiceService.createInvoice(
        populatedInvoice
      );

      if (invoiceResult.success) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`
        );
        res.send(invoiceResult.pdfBuffer);
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to generate PDF",
        });
      }
    }
  } catch (error) {
    console.error("Download invoice error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download invoice",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// @route   POST /api/payments/test-email
// @desc    Test email configuration
// @access  Private (Admin)
router.post(
  "/test-email",
  [authenticate, authorize("admin")],
  async (req, res) => {
    try {
      const testResult = await paymentService.testEmailConnection();

      res.status(200).json({
        success: testResult.success,
        message: testResult.message,
        data: {
          configured: !!process.env.GMAIL_USER,
          service: "Gmail SMTP",
        },
      });
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({
        success: false,
        message: "Email test failed",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
