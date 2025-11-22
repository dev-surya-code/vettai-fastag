import express from "express";
const router = express.Router();
import Transport from "../models/Transport.js";
// ✅ Add transport (name + vehicle)
router.post("/add", async (req, res) => {
  const { name, vehicle } = req.body;

  if (!name || !vehicle)
    return res.status(400).json({ message: "Missing fields" });

  await Transport.create({ name, vehicle });
  res.json({ success: true });
});

// ✅ Get all transports
router.get("/all", async (req, res) => {
  const transports = await Transport.find();
  res.json(transports);
});

// ✅ Remove ONLY the vehicle (not transport)
router.delete("/remove", async (req, res) => {
  const { name, vehicle } = req.query;
  await Transport.deleteOne({ name, vehicle });
  res.json({ success: true });
});

export default router;
