import { Schema, model } from "mongoose";

const shiftSchema = new Schema({
  worker: { type: String, required: true },
  shiftType: { type: String, enum: ["DAY", "NIGHT"], required: true },
  loginTime: { type: Date, default: Date.now },
  shiftCloseTime: { type: Date, required: true },
  bankBalances: { type: Object, default: {} },
  profit: { type: Number, default: 0 },
  totalsByPaymentType: { type: Object, default: {} },
  transactions: { type: Array, default: [] },
});

export default model("ShiftRecord", shiftSchema);
