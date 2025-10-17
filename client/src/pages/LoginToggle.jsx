import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function LoginSingleButton() {
  const [role, setRole] = useState("worker"); // default role
  const [form, setForm] = useState({ username: "", password: "" });
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const toggleRole = () => {
    setRole(role === "worker" ? "owner" : "worker");
    setMsg("");
    setForm({ username: "", password: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url =
        role === "owner"
          ? "${API_URL}/api/auth/owner/login"
          : "${API_URL}/api/auth/worker/login";

      const res = await axios.post(url, form);

      // Save token locally
      localStorage.setItem("token", res.data.token);

      // Redirect based on role
      if (role === "worker") {
        navigate("/worker/dashboard", {
          state: { loginTime: res.data.loginTime },
        });
      } else {
        navigate("/owner/dashboard");
      }
    } catch (err) {
      setMsg(err.response?.data?.msg || "Error occurred");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card p-4 shadow" style={{ width: "400px" }}>
        {/* Toggle role button */}
        <div className="d-flex justify-content-end mb-3">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={toggleRole}
          >
            Switch to {role === "worker" ? "Owner Login" : "Worker Login"}
          </button>
        </div>

        <h3 className="text-center mb-3">
          {role === "worker" ? "Worker Login" : "Owner Login"}
        </h3>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="form-control mb-2"
            placeholder="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
          />
          <input
            type="password"
            className="form-control mb-3"
            placeholder="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
          <button className="btn btn-success w-100">Login</button>
        </form>

        <a href="/forgot" className="d-block text-center mt-2">
          Forgot Password?
        </a>
        {msg && <p className="text-center text-muted mt-2">{msg}</p>}
      </div>
    </div>
  );
}
