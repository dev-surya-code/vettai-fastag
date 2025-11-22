import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema({
  worker: { type: String, required: true },
  shiftType: { type: String, enum: ["DAY", "NIGHT"], required: true }, // ✅ new
  loginTime: { type: Date, required: true },
  shiftCloseTime: { type: Date, required: true },
  transaction: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
  ],
});

export default mongoose.model("Shift", shiftSchema);
