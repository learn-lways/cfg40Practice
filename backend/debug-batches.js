const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

console.log("🔍 Testing route combinations...\n");

// Test batches of routes
const batches = [
  ["auth", "users"],
  ["auth", "users", "products"],
  ["auth", "users", "products", "orders"],
  ["auth", "users", "products", "orders", "categories"],
  ["auth", "users", "products", "orders", "categories", "cart"],
  ["auth", "users", "products", "orders", "categories", "cart", "sellers"],
  [
    "auth",
    "users",
    "products",
    "orders",
    "categories",
    "cart",
    "sellers",
    "admin",
  ],
  [
    "auth",
    "users",
    "products",
    "orders",
    "categories",
    "cart",
    "sellers",
    "admin",
    "reviews",
  ],
];

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i];
  try {
    console.log(`Batch ${i + 1}: Testing routes [${batch.join(", ")}]`);

    // Create fresh app for each test
    const testApp = express();
    testApp.use(express.json());

    // Load routes
    for (const route of batch) {
      testApp.use(`/api/${route}`, require(`./routes/${route}`));
    }

    console.log(`✅ Batch ${i + 1} successful`);
  } catch (error) {
    console.error(`❌ Batch ${i + 1} failed: ${error.message}`);
    console.error(`   Problem occurs when adding: ${batch[batch.length - 1]}`);
    break;
  }
}

console.log("\n🔍 Batch testing complete");
