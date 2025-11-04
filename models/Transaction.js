import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true, trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ["active", "undone"], default: "active" },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, status: 1 });

export default mongoose.model("Transaction", transactionSchema);
