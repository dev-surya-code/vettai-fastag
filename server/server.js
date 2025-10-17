import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import Owner from "./models/Owner.js";
import bcrypt from "bcryptjs";
import transactionRoutes from "./routes/transactionRoutes.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const MONGO = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;
const DEFAULT_OWNER_USERNAME = process.env.DEFAULT_OWNER_USERNAME || "owner";
const DEFAULT_OWNER_PASSWORD =
  process.env.DEFAULT_OWNER_PASSWORD || "Owner@123";

mongoose
  .connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("MongoDB connected");
    // ensure default owner exists
    const existing = await Owner.findOne({ username: DEFAULT_OWNER_USERNAME });
    if (!existing) {
      const hashed = await bcrypt.hash(DEFAULT_OWNER_PASSWORD, 10);
      const owner = new Owner({
        username: DEFAULT_OWNER_USERNAME,
        password: hashed,
      });
      await owner.save();
      console.log(
        `Default owner created -> username: ${DEFAULT_OWNER_USERNAME} password: ${DEFAULT_OWNER_PASSWORD}`
      );
    } else {
    }
  })
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/auth", authRoutes);

app.use("/api/transactions", transactionRoutes);
app.post("/api/transactions/add", (req, res) => {
  try {
    res.status(200).send("Transaction added successfully");
  } catch (error) {
    console.error("Error adding transaction:", error);
  }
});
app.get("/", (req, res) => res.send("MERN Auth Backend is running"));

app.listen(PORT, () => console.log("Server running on port", PORT));
// Assuming you have an Express app instance named 'app'
