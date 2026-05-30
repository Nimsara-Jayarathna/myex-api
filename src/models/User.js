import mongoose from "mongoose";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    fname: { type: String, required: true, trim: true },
    lname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    categoryLimit: { type: Number, default: 10 },
    defaultIncomeCategories: {
      type: [String],
      default: ["Sales"],
    },
    defaultExpenseCategories: {
      type: [String],
      default: ["Stock"],
    },
    currency: { type: mongoose.Schema.Types.ObjectId, ref: "Currency" },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

userSchema.virtual("fullName").get(function fullName() {
  if (this.name) return this.name;
  return `${this.fname} ${this.lname}`.trim();
});

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

export default mongoose.model("User", userSchema);
