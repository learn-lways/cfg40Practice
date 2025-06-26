const express = require("express");
const Product = require("../models/Product");
const router = express.Router();

// Add Product (Seller)
router.post("/add", async (req, res) => {
  try {
    const { title, description, price, category, sellerId } = req.body;
    const product = new Product({ title, description, price, category, sellerId });
    await product.save();
    res.status(201).json({ message: "Product added", product });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Get All Products
router.get("/all", async (req, res) => {
  try {
    const products = await Product.find().populate("sellerId", "name");
    res.json(products);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Get Product by ID
router.get("/:id", async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).populate("sellerId", "name");
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Get by Category/Tag
router.get("/category/:tag", async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.tag });
    res.json(products);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Add Review
router.post("/:id/review", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    product.reviews.push(req.body); // expect { buyerId, rating, comment }
    await product.save();
    res.json({ message: "Review added", product });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Get Reviews
router.get("/:id/reviews", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.json(product.reviews);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

module.exports = router;
