import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema({
  worker: { type: String, required: true },
  loginTime: { type: Date, required: true, default: Date.now },
  logoutTime: { type: Date, default: null },
  shiftCloseTime: { type: Date, default: null },
});

const Activity = mongoose.model("Activity", ActivitySchema);
export default Activity;
