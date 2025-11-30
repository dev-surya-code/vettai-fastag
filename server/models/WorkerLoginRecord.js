import { Schema, model } from "mongoose";

const WorkerLoginSchema = new Schema({
  worker: String,
  shiftType: String,
  loginTime: Date,
  shiftCloseTime: Date,
});

export default model("WorkerLoginRecord", WorkerLoginSchema);
