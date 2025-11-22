import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { FaCar, FaUserTie } from "react-icons/fa";
import "../css/Navbar.css";

export default function Navbar() {
  const [role, setRole] = useState("worker");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleRole = () => {
    const newRole = role === "worker" ? "owner" : "worker";
    setRole(newRole);
    navigate(`/${newRole}/login`);
  };

  return (
    <nav className="custom-navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <FaCar className="brand-icon" />
          <span>VETTAI FASTAG</span>
        </Link>
        <button className="role-toggle-btn" onClick={toggleRole}>
          <FaUserTie className="toggle-icon" />
          {role === "owner" ? "Worker" : "Owner"}
        </button>
      </div>
    </nav>
  );
}
