import mongoose from "mongoose";

const buyerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Should be hashed
  mobile: { type: String, required: true, unique: true },
  email: { type: String, unique: true },
  tags: { type: [String], default: [] }, // e.g., ["handicrafts", "organic", "weaving"]
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Buyer", buyerSchema);
