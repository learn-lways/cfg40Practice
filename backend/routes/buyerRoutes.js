const express = require("express");
const Buyer = require("../models/Buyer");
const router = express.Router();

// Register Buyer
router.post("/register", async (req, res) => {
  try {
    const { username, mobile, password } = req.body;
    const existing = await Buyer.findOne({ mobile });
    if (existing) return res.status(400).json({ message: "Buyer exists" });

    const buyer = new Buyer({ username, mobile, password, tags: [] });
    await buyer.save();
    res.status(201).json({ message: "Buyer registered", buyer });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Login Buyer
router.post("/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const buyer = await Buyer.findOne({ mobile, password });
    if (!buyer) return res.status(401).json({ message: "Invalid credentials" });
    res.json({ message: "Login successful", buyer });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Get Buyer Profile
router.get("/:id", async (req, res) => {
  try {
    const buyer = await Buyer.findById(req.params.id);
    if (!buyer) return res.status(404).json({ message: "Buyer not found" });
    res.json(buyer);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Update Buyer Tags
router.put("/update-tags/:id", async (req, res) => {
  try {
    const { tags } = req.body;
    const buyer = await Buyer.findByIdAndUpdate(req.params.id, { tags }, { new: true });
    res.json({ message: "Tags updated", buyer });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

module.exports = router;
