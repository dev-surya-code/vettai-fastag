import express from "express";
import Transaction from "../models/Transaction.js";

const router = express.Router();

// Add transaction (worker)
router.post("/add", async (req, res) => {
  try {
    const { worker, vehicleNumber, transactionType, amount, paymentType } =
      req.body;
    const transaction = new Transaction({
      worker,
      vehicleNumber,
      transactionType,
      amount,
      paymentType,
    });
    await transaction.save();
    res.status(201).json({ msg: "Transaction saved successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Get all transactions (owner)
router.get("/all", async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.status(200).json(transactions);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});
// GET /api/transactions/pending/:vehicleNumber
router.get("/pending/:vehicleNumber", async (req, res) => {
  const { vehicleNumber } = req.params;

  try {
    // Fetch all transactions for this vehicle
    const transactions = await Transaction.find({
      vehicleNumber: { $regex: new RegExp(`^${vehicleNumber}$`, "i") },
    });

    // Calculate total pending
    let totalPending = 0;
    transactions.forEach((t) => {
      const amt = parseFloat(t.amount || 0);
      if (t.transactionType === "PENDING" && t.paymentType === "CASH") {
        totalPending -= amt;
      } else if (
        t.transactionType === "PENDING" &&
        t.paymentType === "GPAY/PHONE PAY"
      ) {
        totalPending -= amt;
      } else if (t.transactionType === "PENDING" && t.paymentType === "EXP") {
        totalPending -= amt;
      } else if (t.paymentType === "PENDING") {
        totalPending += amt;
      }
    });

    res.json({ totalPending });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});
// PUT /api/transactions/updatePending/:vehicleNumber
router.put("/updatePending/:vehicleNumber", async (req, res) => {
  const { vehicleNumber } = req.params;
  const { newPending } = req.body;
  try {
    await Transaction.updateMany(
      { vehicleNumber },
      { $set: { totalPending: newPending } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update pending" });
  }
});
// DELETE transaction by ID
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTxn = await Transaction.findByIdAndDelete(id);

    if (!deletedTxn) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ message: "Transaction deleted successfully", deletedTxn });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ message: "Error deleting transaction" });
  }
});
router.delete("/vehicle/:vehicleNumber", async (req, res) => {
  try {
    const { vehicleNumber } = req.params;
    const result = await Transaction.deleteMany({ vehicleNumber });
    if (result.deletedCount === 0)
      return res.status(404).json({ message: "No transactions found" });
    res.json({ message: "Transactions deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
