// models/WorkerLog.js
import mongoose from "mongoose";

const WorkerLogSchema = new mongoose.Schema({
  worker: String,
  loginTime: Date,
  logoutTime: Date,
});

export default mongoose.model("WorkerLog", WorkerLogSchema);
