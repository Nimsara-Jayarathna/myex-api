import mongoose from "mongoose";

const currencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    symbol: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Ensure only one currency is set as default
currencySchema.pre("save", async function (next) {
  if (this.isDefault) {
    const existingDefault = await this.constructor.findOne({ isDefault: true });
    if (existingDefault && existingDefault._id.toString() !== this._id.toString()) {
      existingDefault.isDefault = false;
      await existingDefault.save();
    }
  }
  next();
});

export default mongoose.model("Currency", currencySchema);
