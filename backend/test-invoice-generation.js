// Test invoice generation
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const invoiceService = require("./services/invoiceService");

// Sample invoice data for testing
const sampleInvoice = {
  invoiceNumber: "INV-TEST-001",
  date: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now

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
      name: "Wireless Bluetooth Headphones",
      quantity: 1,
      price: 199.99,
      total: 199.99,
    },
    {
      name: "Smart LED Light Bulbs (4-Pack)",
      quantity: 2,
      price: 79.99,
      total: 159.98,
    },
  ],

  subtotal: 359.97,
  taxRate: 18,
  tax: 64.79,
  shippingCost: 15.0,
  discount: 10.0,
  totalAmount: 429.76,

  paymentMethod: "razorpay",
  paymentStatus: "paid",
  transactionId: "pay_test123456789",

  notes: "Thank you for your business!",
};

async function testInvoiceGeneration() {
  try {
    console.log("🧪 Testing Invoice Generation...");
    console.log("📋 Sample Invoice Data:");
    console.log(JSON.stringify(sampleInvoice, null, 2));

    // Test PDF generation
    console.log("\n🔄 Generating PDF...");
    const pdfBuffer = await invoiceService.generateInvoicePDF(sampleInvoice);

    console.log(`✅ PDF Generated! Size: ${pdfBuffer.length} bytes`);

    // Save PDF to file
    const fs = require("fs");
    const filename = `test-invoice-${Date.now()}.pdf`;
    const filepath = path.join(__dirname, "invoices", filename);

    fs.writeFileSync(filepath, pdfBuffer);
    console.log(`💾 PDF saved to: ${filepath}`);

    console.log("\n🎉 Invoice generation test completed successfully!");
    console.log(
      `📄 You can find the generated invoice at: invoices/${filename}`
    );

    return true;
  } catch (error) {
    console.error("❌ Invoice generation test failed:", error);
    return false;
  }
}

// Run the test
testInvoiceGeneration()
  .then((success) => {
    if (success) {
      console.log("\n✅ All tests passed!");
    } else {
      console.log("\n❌ Test failed!");
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });
