import mongoose from "mongoose";

const adminDeleteRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
      index: true,
    },
    reason: { type: String, default: "User requested account deletion." },
    requestedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: null },
    reviewNote: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("AdminDeleteRequest", adminDeleteRequestSchema);
