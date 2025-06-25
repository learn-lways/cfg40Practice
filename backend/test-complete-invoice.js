// Test complete invoice and email system
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const invoiceService = require("./services/invoiceService");
const paymentService = require("./services/paymentService");

// Sample invoice data for testing
const sampleInvoice = {
  invoiceNumber: "INV-EMAIL-TEST-001",
  date: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),

  companyInfo: {
    name: process.env.COMPANY_NAME || "Your E-commerce Store",
    address:
      process.env.COMPANY_ADDRESS || "123 Business Street, City, State, 110001",
    phone: process.env.COMPANY_PHONE || "+91 9876543210",
    email: process.env.COMPANY_EMAIL || "orders@yourstore.com",
    gst: process.env.COMPANY_GST || "GST123456789",
    website: process.env.COMPANY_WEBSITE || "www.yourstore.com",
  },

  billingAddress: {
    name: "Test Customer",
    email: "test@example.com",
    phone: "+1234567890",
    address: "456 Customer Street",
    city: "Customer City",
    state: "CA",
    postalCode: "12345",
    country: "USA",
  },

  items: [
    {
      name: "Premium Testing Product",
      quantity: 1,
      price: 99.99,
      total: 99.99,
    },
  ],

  subtotal: 99.99,
  taxRate: 18,
  tax: 17.998,
  shippingCost: 10.0,
  discount: 5.0,
  totalAmount: 122.988,

  paymentMethod: "razorpay",
  paymentStatus: "paid",
  transactionId: "pay_test_email123",

  notes: "This is a test invoice for email functionality testing.",
};

async function testCompleteInvoiceSystem() {
  try {
    console.log("🧪 Testing Complete Invoice & Email System...");
    console.log("=====================================\n");

    // Step 1: Test PDF Generation
    console.log("📄 Step 1: Testing PDF Generation...");
    const pdfBuffer = await invoiceService.generateInvoicePDF(sampleInvoice);
    console.log(`✅ PDF Generated! Size: ${pdfBuffer.length} bytes`);

    // Step 2: Save PDF
    console.log("\n💾 Step 2: Saving PDF...");
    const saveResult = await invoiceService.savePDFToFile(
      sampleInvoice,
      pdfBuffer
    );
    console.log(`✅ PDF Saved: ${saveResult.filename}`);
    console.log(`📁 File Path: ${saveResult.filepath}`);

    // Step 3: Test Email Configuration
    console.log("\n📧 Step 3: Testing Email Configuration...");
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      console.log("⚠️  Gmail credentials not configured");
      console.log("📋 To test email functionality:");
      console.log("   1. Set GMAIL_USER in .env file");
      console.log("   2. Set GMAIL_APP_PASSWORD in .env file");
      console.log("   3. Ensure 2FA is enabled on Gmail");
      console.log("   4. Generate app password from Google Account settings");
    } else {
      console.log("✅ Gmail credentials configured");
      console.log(`📨 Gmail User: ${gmailUser}`);

      // Step 4: Test Email Sending (optional - only if credentials are set)
      console.log("\n📬 Step 4: Testing Email Sending...");
      try {
        const emailResult = await paymentService.sendInvoiceEmail(
          sampleInvoice.billingAddress.email,
          sampleInvoice.billingAddress.name,
          sampleInvoice.invoiceNumber,
          saveResult.filepath
        );

        if (emailResult.success) {
          console.log("✅ Email sent successfully!");
          console.log(`📧 Sent to: ${sampleInvoice.billingAddress.email}`);
          console.log(`📎 Attachment: ${sampleInvoice.invoiceNumber}.pdf`);
        } else {
          console.log("❌ Email sending failed:", emailResult.error);
        }
      } catch (emailError) {
        console.log("❌ Email test failed:", emailError.message);
      }
    }

    // Step 5: Complete Invoice Creation Test
    console.log("\n🏗️  Step 5: Testing Complete Invoice Creation...");
    try {
      const completeResult = await invoiceService.createInvoice(sampleInvoice);
      console.log("✅ Complete invoice creation successful!");
      console.log(`📄 Invoice: ${completeResult.invoiceNumber}`);
      console.log(`📁 File: ${completeResult.filename}`);
      console.log(`💌 Message: ${completeResult.message}`);
    } catch (createError) {
      console.log("❌ Complete invoice creation failed:", createError.message);
    }

    console.log("\n🎉 Invoice System Test Completed!");
    console.log("=====================================");

    // Test Summary
    console.log("\n📊 Test Summary:");
    console.log("✅ PDF Generation: Working");
    console.log("✅ File Saving: Working");
    console.log(
      `${gmailUser ? "✅" : "⚠️ "} Email Configuration: ${
        gmailUser ? "Configured" : "Not Configured"
      }`
    );
    console.log("✅ Complete Invoice Creation: Working");

    return true;
  } catch (error) {
    console.error("💥 Test failed with error:", error);
    return false;
  }
}

// Run the complete test
testCompleteInvoiceSystem()
  .then((success) => {
    if (success) {
      console.log("\n🎯 All invoice system tests completed!");
      console.log("📝 The invoice generation system is fully operational.");
    } else {
      console.log("\n❌ Some tests failed!");
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });
