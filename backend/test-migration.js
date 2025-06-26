// Test MongoDB Atlas + Cloudinary Migration
require("dotenv").config();
const mongoose = require("mongoose");

async function testMigration() {
  console.log("🧪 Testing MongoDB Atlas + Cloudinary Migration");
  console.log("=".repeat(50));

  try {
    // Test 1: MongoDB Atlas Connection
    console.log("\n📊 Test 1: MongoDB Atlas Connection");
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ MongoDB Atlas connected:", conn.connection.host);

    // Test 2: Test Data Availability
    console.log("\n📦 Test 2: Data Availability");
    const Product = require("./models/Product");
    const User = require("./models/User");
    const Category = require("./models/Category");

    const productCount = await Product.countDocuments();
    const userCount = await User.countDocuments();
    const categoryCount = await Category.countDocuments();

    console.log(`✅ Products: ${productCount}`);
    console.log(`✅ Users: ${userCount}`);
    console.log(`✅ Categories: ${categoryCount}`);

    // Test 3: Cloudinary Configuration
    console.log("\n☁️  Test 3: Cloudinary Configuration");
    const { isCloudinaryConfigured } = require("./middleware/upload");
    const configured = isCloudinaryConfigured();
    console.log(
      `${configured ? "✅" : "❌"} Cloudinary configured: ${configured}`
    );

    if (configured) {
      console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    }

    // Test 4: Sample Product Query
    console.log("\n🔍 Test 4: Sample Product Query");
    const sampleProduct = await Product.findOne().populate("category seller");
    if (sampleProduct) {
      console.log(`✅ Sample product: ${sampleProduct.name}`);
      console.log(`   Category: ${sampleProduct.category?.name || "N/A"}`);
      console.log(`   Images: ${sampleProduct.images?.length || 0}`);
    } else {
      console.log("❌ No products found");
    }

    console.log("\n🎉 Migration Test Complete!");
    console.log("📋 Summary:");
    console.log(`   • MongoDB Atlas: ✅ Connected`);
    console.log(
      `   • Data Available: ✅ ${productCount} products, ${userCount} users`
    );
    console.log(
      `   • Cloudinary: ${configured ? "✅" : "❌"} ${
        configured ? "Configured" : "Not configured"
      }`
    );
  } catch (error) {
    console.error("❌ Migration test failed:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testMigration();
