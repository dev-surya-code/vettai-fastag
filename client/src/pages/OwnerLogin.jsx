import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaUserShield,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function OwnerLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(API_URL + '/api/auth/owner/login',
        form
      );

      localStorage.setItem("token", res.data.token);
      setMsg(`Login Successful`);
      setMsgType("success");
      setTimeout(() => {
        navigate("/owner/dashboard");
      }, 1200);
    } catch (err) {
      setMsg(err.response?.data?.msg || "Invalid credentials");
      setMsgType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container d-flex justify-content-center align-items-center vh-100">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="login-card p-4 rounded-4"
      >
        <h3 className="text-center mb-4 fw-bold">Owner Login</h3>
        <FaUserShield
          className="owner-icon"
          color="black"
        />
        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="form-group mb-3 input-icon">
            <FaUserShield color="black" className="icon" />
            <input
              type="text"
              className="form-control text-black fw-bolder"
              placeholder="Username"
              name="username"
              required
              onChange={handleChange}
            />
          </div>

          {/* Password */}
          <div className="form-group mb-3 input-icon">
            <FaLock color="black" className="icon" />
            <input
              type={showPassword ? "text" : "password"}
              className="form-control text-black fw-bolder"
              placeholder="Password"
              name="password"
              required
              onChange={handleChange}
            />
            <span className="password-toggle" onClick={togglePassword}>
              {showPassword ? (
                <FaEyeSlash color="black" />
              ) : (
                <FaEye color="black" />
              )}
            </span>
          </div>

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-glass w-100 bg-primary text-light fw-bold py-2"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </motion.button>
        </form>
        {msg && (
          <p
            className={`text-center mt-3 fw-bold ${
              msgType === "success" ? "text-success" : "text-danger"
            } d-flex align-items-center justify-content-center gap-2`}
          >
            {msgType === "success" ? <FaCheckCircle /> : <FaTimesCircle />}
            {msg}
          </p>
        )}
      </motion.div>
    </div>
  );
}
