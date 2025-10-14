import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {

  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
  FaUserAlt,
  FaUserAltSlash,
  FaUserCircle,
} from "react-icons/fa";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

import "../css/WorkerLogin.css";

export default function WorkerLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setMsg("Please fill in all fields");
      setMsgType("error");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(API_URL + '/api/auth/worker/login',
        form
      );
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("worker", res.data.username || form.username);
      localStorage.setItem("username", res.data.username || form.username);
      setMsg("Login Successful");
      setMsgType("success");
      setTimeout(() => navigate("/worker/dashboard"), 1200);
    } catch (err) {
      setMsg(err.response?.data?.msg || "Invalid credentials");
      setMsgType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="worker-login-container">
      <div className="login-card">
        <h3 className="mb-4 fw-bold">Worker Login</h3>
        <FaUserCircle className="signup-icon" color="black" />
        <form onSubmit={handleSubmit}>
          <div className="input-icon">
            <FaUser className="icon" />
            <input
              type="text"
              name="username"
              placeholder="Username"
              onChange={handleChange}
            />
          </div>
          <div className="input-icon">
            <FaLock className="icon" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
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
          <button type="submit" className="btn-glow" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="d-flex justify-content-center mt-3">
          Create an account?{" "}
          <Link to="/worker/signup" className="link-glow fw-semibold">
            Signup
          </Link>
        </div>

        {msg && (
          <p
            className={`message ${
              msgType === "success" ? "text-success" : "text-danger"
            }`}
          >
            {msgType === "success" ? <FaCheckCircle /> : <FaTimesCircle />}{" "}
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
