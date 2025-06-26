const express = require("express");
const Seller = require("../models/Seller");
const router = express.Router();

// Register Seller
router.post("/register", async (req, res) => {
  try {
    const { name, mobile, email, shgName, address } = req.body;
    const existing = await Seller.findOne({ mobile });
    if (existing) return res.status(400).json({ message: "Seller exists" });

    const seller = new Seller({ name, mobile, email, shgName, address, isVerified: true });
    await seller.save();
    res.status(201).json({ message: "Seller registered", seller });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Login Seller
router.post("/login", async (req, res) => {
  try {
    const { mobile } = req.body;
    const seller = await Seller.findOne({ mobile });
    if (!seller) return res.status(401).json({ message: "Invalid credentials" });
    if (!seller.isVerified) return res.status(403).json({ message: "Not verified" });
    res.json({ message: "Login successful", seller });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Seller Profile
router.get("/:id", async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller) return res.status(404).json({ message: "Seller not found" });
    res.json(seller);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

module.exports = router;
