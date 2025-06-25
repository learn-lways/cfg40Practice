const express = require("express");

const app = express();

// Test each route file individually
const routeFiles = [
  "auth",
  "users",
  "products",
  "orders",
  "categories",
  "cart",
  "sellers",
  "admin",
  "reviews",
];

console.log("🔍 Testing route files individually...\n");

for (const route of routeFiles) {
  try {
    console.log(`Loading ${route} routes...`);
    const routeModule = require(`./routes/${route}`);

    // Create a test app for each route
    const testApp = express();
    testApp.use(`/api/${route}`, routeModule);

    console.log(`✅ ${route} routes loaded successfully`);
  } catch (error) {
    console.error(`❌ Error loading ${route} routes:`);
    console.error(`   ${error.message}`);
    console.error(`   Stack: ${error.stack.split("\n")[1]?.trim()}`);
    break; // Stop at first error
  }
}

console.log("\n🔍 Route testing complete");
