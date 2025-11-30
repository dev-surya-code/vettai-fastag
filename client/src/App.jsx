import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import WorkerSignup from "./pages/WorkerSignup";
import WorkerLogin from "./pages/WorkerLogin";
import OwnerLogin from "./pages/OwnerLogin";
import WorkerDashboard from "./pages/WorkerDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import "./App.css";
import Loader from "./components/Loader";
// Dark mode: persists choice in localStorage
const useDarkModeInit = () => {
  try {
    const v = localStorage.getItem("vf_dark");
    return v === "1";
  } catch (e) {
    return false;
  }
};
function App() {
  const [dark, setDark] = useState(useDarkModeInit());
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("vf_dark", dark ? "1" : "0");
  }, [dark]);
  const toggleDark = () => setDark((d) => !d);

  const [worker, setWorker] = useState(null); // Initialize worker state

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fake loading for 2 seconds
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <Loader />;
  }
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/" element={<Navbar />} />
        <Route path="/worker/signup" element={<WorkerSignup />} />
        <Route path="/worker/login" element={<WorkerLogin />} />
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route
          path="/worker/dashboard"
          element={<WorkerDashboard worker={worker} />}
        />
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
