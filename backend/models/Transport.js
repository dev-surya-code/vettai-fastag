import { Schema, model } from "mongoose";

const TransportSchema = new Schema({
  name: { type: String, required: true },
  vehicle: { type: String, required: true },
});

export default model("Transport", TransportSchema);
