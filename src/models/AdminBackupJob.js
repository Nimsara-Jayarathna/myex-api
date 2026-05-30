import mongoose from "mongoose";

const adminBackupJobSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["running", "success", "failed", "canceled"],
      default: "running",
      index: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    stage: { type: String, default: "Preparing backup..." },
    target: { type: String, default: "remote_cloud_storage_node_01" },
    initiatedBy: { type: String, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    fileName: { type: String, default: null },
    storagePath: { type: String, default: null },
    fileSizeBytes: { type: Number, default: null },
    errorCode: { type: String, default: null },
    errorMessage: { type: String, default: null },
    shouldFail: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("AdminBackupJob", adminBackupJobSchema);
