import mongoose from "mongoose";

const adminCategoryPolicySchema = new mongoose.Schema(
  {
    scope: { type: String, default: "global", unique: true, index: true },
    defaultIncomeCategoryName: { type: String, required: true, trim: true, default: "General Income" },
    defaultExpenseCategoryName: { type: String, required: true, trim: true, default: "Miscellaneous Expense" },
    defaultCategoryLimit: { type: Number, required: true, default: 10, min: 1, max: 1000 },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("AdminCategoryPolicy", adminCategoryPolicySchema);
