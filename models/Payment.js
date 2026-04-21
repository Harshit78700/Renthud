const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, default: "" },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "", lowercase: true, trim: true },
    roomNumber: { type: String, default: "" },
    month: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    status: { type: String, enum: ["collected", "pending", "overdue"], default: "pending" },
    method: { type: String, default: "UPI" },
    utr: { type: String, default: "" },
    screenshotName: { type: String, default: "" },
    createdAt: { type: String, default: () => new Date().toISOString() }
  },
  { versionKey: false }
);

module.exports = mongoose.model("Payment", paymentSchema);
