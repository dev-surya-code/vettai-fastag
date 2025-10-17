import { useState } from "react";
import axios from "axios";
import {
  FaUserPlus,
  FaArrowRight,
  FaUserAlt,
  FaUser,
  FaLock,
} from "react-icons/fa";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
import { useNavigate } from "react-router-dom";
import "../css/WorkerSignup.css";

export default function WorkerSignup() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(API_URL + "/api/auth/worker/signup", form);
      setMsg(res.data.msg);
    } catch (err) {
      setMsg(err.response?.data?.msg || "Error occurred");
    }
  };

  return (
    <div className="worker-signup-container">
      <div className="signup-card">
        <h2 className="mb-3">Worker Sign Up</h2>
        <FaUserPlus className="signup-icon" color="black" />
        <form onSubmit={handleSubmit}>
          <div className="input-icon">
            <FaUser className="icon" color="black" />{" "}
            <input
              type="text"
              name="username"
              placeholder="Username"
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-icon">
            <FaLock className="icon" color="black" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-icon">
            <FaLock className="icon" color="black" />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              onChange={handleChange}
              required
            />
          </div>

          <button className="btn-glow" type="submit">
            Sign Up <FaArrowRight className="btn-arrow" />
          </button>
        </form>

        <p className="mt-3">
          Already have an account?{" "}
          <span className="link-glow" onClick={() => navigate("/worker/login")}>
            Login
          </span>
        </p>

        {msg && (
          <div className="message">
            <p
              className={
                msg.toLowerCase().includes("success")
                  ? "text-success"
                  : "text-danger"
              }
            >
              {msg}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
