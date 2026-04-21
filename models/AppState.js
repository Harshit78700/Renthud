const mongoose = require("mongoose");

const appStateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    flags: { type: Object, default: {} },
    customScannerImage: { type: String, default: "" }
  },
  { versionKey: false }
);

module.exports = mongoose.model("AppState", appStateSchema);
