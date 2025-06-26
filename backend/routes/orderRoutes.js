const express = require("express");
const Razorpay = require("razorpay");
const Order = require("../models/Order");
const Buyer = require("../models/Buyer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const twilio = require("twilio");
const router = express.Router();

// Razorpay setup
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Cloudinary setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Twilio setup
const twClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Create Razorpay order
router.post("/create", async (req, res) => {
  try {
    const { amount } = req.body;
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });
    res.json(order);
  } catch (e) {
    res.status(500).json({ message: "Payment error", error: e });
  }
});

// Confirm payment, save order, send invoice
router.post("/confirm", async (req, res) => {
  try {
    const { buyerId, items, totalAmount, deliveryAddress } = req.body;
    const buyer = await Buyer.findById(buyerId);

    const order = new Order({
      buyerId,
      sellerId: items[0].sellerId,
      items,
      totalAmount,
      deliveryAddress,
      paymentStatus: "Paid",
      status: "Confirmed"
    });
    await order.save();

    // Generate PDF
    const pdfPath = `invoice_${order._id}.pdf`;
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(pdfPath));
    doc.text("Taru Foundation Invoice", { align: "center" });
    doc.text(`Order ID: ${order._id}`);
    doc.text(`Buyer: ${buyer.username}`);
    items.forEach((it, i) => {
      doc.text(`${i+1}. ${it.title} x${it.quantity} @₹${it.priceAtPurchase}`);
    });
    doc.text(`Total: ₹${totalAmount}`);
    doc.end();

    doc.on("finish", async () => {
      const upload = await cloudinary.uploader.upload(pdfPath, {
        resource_type: "raw",
        folder: "invoices"
      });
      order.invoiceUrl = upload.secure_url;
      await order.save();
      fs.unlinkSync(pdfPath);

      await twClient.messages.create({
        from: "whatsapp:+14155238886",
        to: `whatsapp:+91${buyer.mobile}`,
        body: `🧾 Here is your invoice: ${upload.secure_url}`
      });

      res.json({ message: "Order created & invoice sent", order });
    });
  } catch (e) {
    res.status(500).json({ message: "Order error", error: e });
  }
});

// Fetch buyer's orders
router.get("/:buyerId", async (req, res) => {
  try {
    const orders = await Order.find({ buyerId: req.params.buyerId });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

// Invoice URL for specific order
router.get("/invoice/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ invoiceUrl: order.invoiceUrl });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e });
  }
});

module.exports = router;
