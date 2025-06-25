import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  quantity: Number,
  priceAtPurchase: Number
});

const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "Buyer" },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller" },
  items: [orderItemSchema],
  totalAmount: Number,
  status: { type: String, default: "Pending" }, // e.g. "Pending", "Shipped", "Delivered"
  paymentStatus: { type: String, default: "Unpaid" }, // "Paid", "COD", etc.
  invoiceUrl: String,
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Order", orderSchema);
