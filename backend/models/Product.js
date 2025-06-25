import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "Buyer" },
  rating: { type: Number, min: 1, max: 5 },
  comment: String,
  date: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: { type: String, required: true }, // for recommendation e.g. "handloom", "organic"
  quantityAvailable: { type: Number, default: 0 },
  imageUrls: [String],
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
  reviews: [reviewSchema],
  isUniqueListing: { type: Boolean, default: false }, // for artisanal tags
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Product", productSchema);
