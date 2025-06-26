const express = require("express");
const Cart = require("../models/Cart");
const router = express.Router();

// Add to cart
router.post("/add", async (req, res) => {
  try {
    const { buyerId, productId, quantity } = req.body;
    let item = await Cart.findOne({ buyerId, productId });
    if (item) {
      item.quantity += quantity;
      await item.save();
      return res.json({ message: "Cart updated", item });
    }
    item = new Cart({ buyerId, productId, quantity });
    await item.save();
    res.status(201).json({ message: "Added to cart", item });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Get cart items
router.get("/:buyerId", async (req, res) => {
  try {
    const items = await Cart.find({ buyerId: req.params.buyerId }).populate("productId");
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Remove from cart
router.delete("/remove/:buyerId/:productId", async (req, res) => {
  try {
    await Cart.findOneAndDelete({ buyerId: req.params.buyerId, productId: req.params.productId });
    res.json({ message: "Removed" });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

module.exports = router;
