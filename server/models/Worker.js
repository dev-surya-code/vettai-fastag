import mongoose from "mongoose";

const BankSchema = new mongoose.Schema({
  name: { type: String, required: true },
  account: { type: String, default: "" }, // last 4 digits
  balance: { type: Number, default: 0 },
  submitted: { type: Boolean, default: false },
});

const WorkerTransactionSchema = new mongoose.Schema({
  vehicleNumber: String,
  transactionType: String,
  amount: Number,
  paymentType: String,
  date: { type: Date, default: Date.now },
});

const WorkerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  banks: { type: [BankSchema], default: [] },
  transactions: { type: [WorkerTransactionSchema], default: [] },
  pendingBalance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Worker", WorkerSchema);
