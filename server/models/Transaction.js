import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  worker: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  transactionType: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Transaction", transactionSchema);
