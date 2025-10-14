import React from "react";
import "../css/Loader.css";

export default function Loader() {
  return (
    <div className="loader-container">
      <div className="loader-content">
        <div className="spinner"></div>
        <img src="/vettai_fastag_logo.png" alt="Logo" className="loader-logo" />
      </div>
      <p className="loading-text">Loading...</p>
    </div>
  );
}
