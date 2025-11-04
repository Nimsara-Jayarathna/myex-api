import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Transaction", transactionSchema);
