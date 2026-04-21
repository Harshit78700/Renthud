const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "User" },
    phone: { type: String, default: "" },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    password: { type: String, default: "1234" },
    role: { type: String, enum: ["admin", "customer"], default: "customer" },
    propertyName: { type: String, default: "" },
    location: { type: String, default: "" },
    bookedRoomNumber: { type: String, default: "" },
    createdAt: { type: String, default: () => new Date().toISOString() }
  },
  { versionKey: false }
);

module.exports = mongoose.model("User", userSchema);
