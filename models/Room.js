const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    number: { type: String, required: true, uppercase: true, trim: true, unique: true },
    description: { type: String, default: "Standard Room" },
    price: { type: Number, default: 5000 },
    createdAt: { type: String, default: () => new Date().toISOString() }
  },
  { versionKey: false }
);

module.exports = mongoose.model("Room", roomSchema);
