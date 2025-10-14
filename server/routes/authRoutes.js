import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Worker from "../models/Worker.js";
import Owner from "../models/Owner.js";
import Activity from "../models/Activity.js";
import nodemailer from "nodemailer";
import crypto from "crypto";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_default_secret";

// Worker Signup
router.post("/worker/signup", async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    if (!username || !password || !confirmPassword)
      return res.status(400).json({ msg: "All fields are required" });
    if (password !== confirmPassword)
      return res.status(400).json({ msg: "Passwords do not match" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ msg: "Password should be at least 6 characters" });

    const existing = await Worker.findOne({ username });
    if (existing)
      return res.status(400).json({ msg: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const worker = new Worker({ username, password: hashed });
    await worker.save();

    res.json({ msg: "Worker registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Worker Login
router.post("/worker/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ msg: "Username and password are required" });
  }
  try {
    const worker = await Worker.findOne({ username });
    if (!worker) return res.status(400).json({ msg: "Worker not found" });
    if (!worker.password)
      return res.status(500).json({ msg: "Worker has no password set" });

    const isMatch = await bcrypt.compare(password, worker.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const loginTime = new Date();
    worker.lastLogin = loginTime;
    await worker.save();

    await Activity.create({ worker: worker.username, loginTime });

    const token = jwt.sign({ id: worker._id, role: "worker" }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token, msg: "Worker login success", loginTime });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
});

// Worker Logout
router.post("/workers/logout", async (req, res) => {
  try {
    const { worker, logoutTime } = req.body;

    if (!worker) {
      return res.status(400).json({ msg: "Worker is required" });
    }

    const parsedDate = new Date(logoutTime);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ msg: "Invalid logout time received" });
    }

    const activity = await Activity.findOne({
      worker,
      logoutTime: null, // find active session
    }).sort({ loginTime: -1 });

    if (!activity) {
      return res.status(404).json({ msg: "No active login found" });
    }

    activity.logoutTime = parsedDate;
    await activity.save();

    // ✅ Send only one response
    return res.json({
      msg: "Logout recorded",
      message: `${worker} logged out at ${logoutTime}`,
      activity,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: err.message });
  }
});

// Get Worker Logs
router.get("/workers/logs", async (req, res) => {
  // <-- added leading /
  try {
    const logs = await Activity.find().sort({ loginTime: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Owner Login
router.post("/owner/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ msg: "All fields are required" });

    const owner = await Owner.findOne({ username });
    if (!owner) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: owner._id, role: "owner" }, JWT_SECRET, {
      expiresIn: "2h",
    });
    res.json({ token, role: "owner", username: owner.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});
router.post("/workers/shiftclose", async (req, res) => {
  try {
    const { worker, closedTime, logoutTime } = req.body;

    // Basic validation
    if (!worker || !closedTime) {
      return res.status(400).json({ message: "Missing worker or closedTime" });
    }

    const parsedDate = new Date(closedTime);
    const logoutParsedDate = new Date(logoutTime);

    if (isNaN(logoutParsedDate.getTime())) {
      return res.status(400).json({ msg: "Invalid logout time received" });
    }

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ msg: "Invalid shift close time received" });
    }

    // Find the latest active shift
    const activity = await Activity.findOneAndUpdate(
      { worker, logoutTime: null, shiftCloseTime: null },
      {},
      { sort: { loginTime: -1 } }
    );

    if (!activity) {
      return res
        .status(404)
        .json({ message: "No active shift found for this worker" });
    }

    // Update logout and close times
    activity.logoutTime = logoutParsedDate;
    activity.shiftCloseTime = parsedDate;
    await activity.save();

    // ✅ Send only ONE final response
    return res.json({
      message: `${worker} shift closed successfully at ${closedTime}`,
      record: activity,
    });
  } catch (err) {
    console.error("Shift Close Error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

// Owner Dashboard API - get all worker login activities
router.get("/owner/activities", async (req, res) => {
  try {
    const records = await Activity.find().sort({ loginTime: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});
// ===========================
// FORGOT PASSWORD
// ===========================
router.post("/forgot-password", async (req, res) => {
  try {
    const { username, email } = req.body;

    // ✅ Validation
    if (!username || !email) {
      return res.status(400).json({ msg: "Username and email are required." });
    }

    // ✅ Find user by username + email (can check Worker or Owner)
    let user = await Worker.findOne({ username, email });
    let role = "worker";

    if (!user) {
      user = await Owner.findOne({ username, email });
      role = "owner";
    }

    if (!user) {
      return res
        .status(404)
        .json({ msg: "No account found with that username and email." });
    }

    // ✅ Generate reset token
    const resetToken = jwt.sign({ id: user._id, role }, JWT_SECRET, {
      expiresIn: "15m",
    });

    // ✅ Save token temporarily in DB
    user.resetToken = resetToken;
    user.resetTokenExpires = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
    await user.save();

    // ✅ Send reset email (configure nodemailer)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: `"Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Link",
      html: `
        <div style="font-family: system-ui, sans-serif; padding: 16px;">
          <h2>Password Reset Request</h2>
          <p>Hello ${username},</p>
          <p>Click the button below to reset your password. This link is valid for 15 minutes.</p>
          <a href="${resetLink}" 
            style="display: inline-block; padding: 10px 20px; background: #007bff; color: #fff; border-radius: 5px; text-decoration: none;">
            Reset Password
          </a>
          <p>If you didn’t request this, you can ignore this email.</p>
        </div>
      `,
    });

    res.json({ msg: "Reset link sent successfully to your email." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res
      .status(500)
      .json({ msg: "Something went wrong while sending the reset link." });
  }
});
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword)
      return res.status(400).json({ msg: "All fields are required." });

    if (newPassword !== confirmPassword)
      return res.status(400).json({ msg: "Passwords do not match." });

    if (newPassword.length < 6)
      return res
        .status(400)
        .json({ msg: "Password must be at least 6 characters." });

    // ✅ Verify the token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_default_secret"
    );
    const { id, role } = decoded;

    // ✅ Find the correct model (Worker or Owner)
    const Model = role === "owner" ? Owner : Worker;
    const user = await Model.findById(id);

    if (
      !user ||
      user.resetToken !== token ||
      user.resetTokenExpires < Date.now()
    ) {
      return res.status(400).json({ msg: "Invalid or expired reset link." });
    }

    // ✅ Hash the new password
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetToken = null;
    user.resetTokenExpires = null;

    await user.save();

    res.json({ msg: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res
      .status(500)
      .json({ msg: "Something went wrong while resetting password." });
  }
});
export default router;
