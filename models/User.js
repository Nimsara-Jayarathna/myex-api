import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    fname: { type: String, required: true, trim: true },
    lname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    categoryLimit: { type: Number, default: 10, immutable: true },
    defaultIncomeCategories: {
      type: [String],
      default: ["Sales"],
      immutable: true,
    },
    defaultExpenseCategories: {
      type: [String],
      default: ["Stock"],
      immutable: true,
    },
  },
  { timestamps: true }
);

userSchema.virtual("fullName").get(function fullName() {
  if (this.name) return this.name;
  return `${this.fname} ${this.lname}`.trim();
});

export default mongoose.model("User", userSchema);
