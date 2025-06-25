import mongoose from "mongoose";

const sellerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, unique: true },
  shgName: String,

  isVerified: { type: Boolean, default: true }, // ✅ Auto-verified by default

  address: {
    village: String,
    district: String,
    state: String,
    pincode: String
  },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Seller", sellerSchema);
