const nodemailer = require("nodemailer");

class PaymentService {
  constructor() {
    this.initializeEmailTransporter();
  }

  // Initialize Gmail SMTP transporter
  initializeEmailTransporter() {
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.emailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD, // App Password, not regular password
        },
      });
      console.log("✅ Gmail SMTP transporter initialized");
    } else {
      console.log(
        "⚠️  Gmail SMTP not configured. Email sending will be skipped."
      );
      this.emailTransporter = null;
    }
  }

  // Mock Razorpay order creation (for showcase)
  async createRazorpayOrder(amount, currency = "INR", orderId) {
    // Simulate Razorpay order creation
    const mockRazorpayOrder = {
      id: `order_${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      entity: "order",
      amount: amount * 100, // Razorpay expects amount in paise
      amount_paid: 0,
      amount_due: amount * 100,
      currency,
      receipt: orderId,
      status: "created",
      attempts: 0,
      created_at: Math.floor(Date.now() / 1000),
    };

    console.log("🎭 Mock Razorpay Order Created:", mockRazorpayOrder.id);
    return mockRazorpayOrder;
  }

  // Mock payment verification (for showcase)
  async verifyPayment(paymentId, orderId, signature) {
    // In real implementation, this would verify the signature
    // For showcase, we'll always return success
    console.log("🎭 Mock Payment Verification:");
    console.log(`  Payment ID: ${paymentId}`);
    console.log(`  Order ID: ${orderId}`);
    console.log(`  Signature: ${signature}`);

    // Simulate verification
    const isValid = true; // Always true for demo

    if (isValid) {
      return {
        success: true,
        paymentId,
        orderId,
        status: "captured",
        amount: 100000, // Mock amount in paise
        currency: "INR",
        method: "card",
        captured: true,
        description: "Payment successful",
        created_at: Math.floor(Date.now() / 1000),
      };
    } else {
      throw new Error("Payment verification failed");
    }
  }

  // Process successful payment
  async processPayment(orderData) {
    try {
      // Create Razorpay order
      const razorpayOrder = await this.createRazorpayOrder(
        orderData.totalAmount,
        "INR",
        orderData._id.toString()
      );

      // For demo, immediately simulate successful payment
      const paymentResult = await this.verifyPayment(
        `pay_${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        razorpayOrder.id,
        `signature_${Math.random().toString(36).substr(2, 20)}`
      );

      return {
        success: true,
        razorpayOrder,
        paymentResult,
        message: "Payment processed successfully (Demo Mode)",
      };
    } catch (error) {
      console.error("Payment processing error:", error);
      throw new Error(`Payment failed: ${error.message}`);
    }
  }

  // Send email with invoice
  async sendInvoiceEmail(invoice, pdfBuffer) {
    if (!this.emailTransporter) {
      console.log("📧 Email sending skipped - Gmail not configured");
      return { success: false, message: "Email service not configured" };
    }

    try {
      const mailOptions = {
        from: {
          name: "Your E-commerce Store",
          address: process.env.GMAIL_USER,
        },
        to: invoice.billingAddress.email,
        subject: `Invoice ${invoice.invoiceNumber} - Order Confirmation`,
        html: this.generateEmailTemplate(invoice),
        attachments: [
          {
            filename: `Invoice-${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      };

      const result = await this.emailTransporter.sendMail(mailOptions);

      console.log("📧 Invoice email sent successfully:", result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        message: "Invoice sent successfully",
      };
    } catch (error) {
      console.error("Email sending error:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to send invoice email",
      };
    }
  }

  // Generate email template
  generateEmailTemplate(invoice) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #007bff; }
          .invoice-details { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .order-items { margin: 20px 0; }
          .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .total { font-weight: bold; font-size: 18px; color: #007bff; text-align: right; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
          .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Your E-commerce Store</div>
            <h2>Invoice & Order Confirmation</h2>
          </div>
          
          <div class="invoice-details">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Order Date:</strong> ${new Date(
              invoice.invoiceDate
            ).toLocaleDateString()}</p>
            <p><strong>Payment Method:</strong> ${invoice.paymentMethod.toUpperCase()}</p>
            <p><strong>Payment Status:</strong> <span style="color: green;">${invoice.paymentStatus.toUpperCase()}</span></p>
          </div>

          <div class="order-items">
            <h3>Order Items</h3>
            ${invoice.items
              .map(
                (item) => `
              <div class="item">
                <span>${item.name} (x${item.quantity})</span>
                <span>₹${item.total.toFixed(2)}</span>
              </div>
            `
              )
              .join("")}
          </div>

          <div class="total">
            <p>Subtotal: ₹${invoice.subtotal.toFixed(2)}</p>
            <p>Tax (${invoice.taxRate}%): ₹${invoice.tax.toFixed(2)}</p>
            <p>Shipping: ₹${invoice.shippingCost.toFixed(2)}</p>
            <p style="font-size: 22px; color: #007bff;">Total: ₹${invoice.totalAmount.toFixed(
              2
            )}</p>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Please find your detailed invoice attached as PDF.</p>
            <p>If you have any questions, please contact us at ${
              invoice.companyInfo.email
            }</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Test email configuration
  async testEmailConnection() {
    if (!this.emailTransporter) {
      return { success: false, message: "Email transporter not configured" };
    }

    try {
      await this.emailTransporter.verify();
      console.log("✅ Gmail SMTP connection verified");
      return { success: true, message: "Email connection successful" };
    } catch (error) {
      console.error("❌ Gmail SMTP connection failed:", error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new PaymentService();
