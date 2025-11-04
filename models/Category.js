import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  name: { type: String, required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
});

export default mongoose.model("Category", categorySchema);
