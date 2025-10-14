import { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import pdfMake from "pdfmake/build/pdfmake";
import {
  FaSearch,
  FaFilePdf,
  FaCalendarAlt,
  FaMoneyBillAlt,
} from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL || "https://vettai-fastag-backend.onrender.com";

export default function OwnerDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [records, setRecords] = useState([]);
  const [searchVehicle, setSearchVehicle] = useState("");
  const [pendingSuggestion, setPendingSuggestion] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [highlightVehicle, setHighlightVehicle] = useState(null);
  const [sortAsc, setSortAsc] = useState(false);

  const tableRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch worker login records
  useEffect(() => {
    axios
      .get(`${API_URL}/api/auth/owner/activities`)
      .then((res) => setRecords(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/transactions/all`);
        setTransactions(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate pending amounts per vehicle
  const pendingAmounts = useMemo(() => {
    const result = {};
    transactions.forEach((t) => {
      const vehicle = t.vehicleNumber;
      if (!vehicle) return;
      const amt = parseFloat(t.amount || 0);
      if (!result[vehicle]) result[vehicle] = 0;

      if (t.transactionType === "PENDING" && t.paymentType === "PENDING") {
        result[vehicle] += amt;
      } else if (
        t.transactionType === "PENDING" &&
        ["CASH", "GPAY/PHONE PAY", "EXP"].includes(t.paymentType)
      ) {
        result[vehicle] -= amt;
      }
    });
    return result;
  }, [transactions]);

  // Suggestions and pending update
  useEffect(() => {
    if (!searchVehicle.trim()) {
      setSuggestions([]);
      setPendingSuggestion(null);
      setSelectedVehicle(null);
      return;
    }

    const vehicleNumbers = [
      ...new Set(transactions.map((t) => t.vehicleNumber).filter(Boolean)),
    ];

    const filtered = vehicleNumbers.filter((v) =>
      v.toLowerCase().includes(searchVehicle.toLowerCase())
    );
    setSuggestions(filtered);

    const exactMatch = filtered.find(
      (v) => v.toLowerCase() === searchVehicle.toLowerCase()
    );

    if (exactMatch) {
      setPendingSuggestion(pendingAmounts[exactMatch] || 0);
      setSelectedVehicle(exactMatch);
    } else {
      setPendingSuggestion(null);
      setSelectedVehicle(null);
    }
  }, [searchVehicle, transactions, pendingAmounts]);

  const handleSelectSuggestion = (vehicle) => {
    setSearchVehicle(vehicle);
    setSuggestions([]);
    setPendingSuggestion(pendingAmounts[vehicle] || 0);
    setSelectedVehicle(vehicle);
    setHighlightVehicle(vehicle);
  };

  // Hide dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Highlight selected vehicle in table
  useEffect(() => {
    if (highlightVehicle && tableRef.current) {
      const row = tableRef.current.querySelector(
        `tr[data-vehicle="${highlightVehicle.toLowerCase()}"]`
      );
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        row.classList.add("table-warning");
        setTimeout(() => row.classList.remove("table-warning"), 2000);
      }
    }
  }, [highlightVehicle]);

  // Filtered and sorted transactions
  const sortedTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesVehicle =
          !searchVehicle.trim() ||
          t.vehicleNumber?.toLowerCase().includes(searchVehicle.toLowerCase());
        const matchesPayment =
          !selectedPaymentType || t.paymentType === selectedPaymentType;
        let matchesDate = true;
        if (selectedDate) {
          const txnDate = t.createdAt ? new Date(t.createdAt) : null;
          const filterDate = new Date(selectedDate);
          if (txnDate) {
            matchesDate =
              txnDate.getFullYear() === filterDate.getFullYear() &&
              txnDate.getMonth() === filterDate.getMonth() &&
              txnDate.getDate() === filterDate.getDate();
          } else {
            matchesDate = false;
          }
        }
        return matchesVehicle && matchesPayment && matchesDate;
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return sortAsc ? dateA - dateB : dateB - dateA;
      });
  }, [transactions, searchVehicle, selectedPaymentType, selectedDate, sortAsc]);

  const filteredTotalAmount = useMemo(() => {
    return sortedTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0),
      0
    );
  }, [sortedTransactions]);

  // Export PDF

  const handleExportPDF = () => {
    if (!sortedTransactions.length) {
      alert("No transactions to export");
      return;
    }

    // Table header
    const tableHeader = [
      { text: "Date & Time", style: "tableHeader" },
      { text: "Vehicle Number", style: "tableHeader" },
      { text: "Transaction Type", style: "tableHeader" },
      { text: "Payment Type", style: "tableHeader" },
      { text: "Amount", style: "tableHeader" },
    ];

    // Table body
    const tableBody = sortedTransactions.map((t) => {
      const txnDate = t.createdAt ? new Date(t.createdAt) : null;
      const formattedDateTime = txnDate
        ? `${txnDate.getDate().toString().padStart(2, "0")}/${(
            txnDate.getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}/${txnDate.getFullYear()} ${txnDate
            .getHours()
            .toString()
            .padStart(2, "0")}:${txnDate
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${txnDate
            .getSeconds()
            .toString()
            .padStart(2, "0")}`
        : "--";

      return [
        formattedDateTime,
        t.vehicleNumber,
        t.transactionType,
        t.paymentType,
        parseFloat(t.amount).toFixed(2),
      ];
    });

    // Add total row
    tableBody.push([
      "",
      "",
      "",
      { text: "Total", bold: true },
      { text: filteredTotalAmount.toFixed(2), bold: true },
    ]);

    const docDefinition = {
      pageOrientation: "portrait",
      pageSize: "A4",
      content: [
        { text: "Vehicle Transactions Report", style: "header" },
        {
          text: `Generated on: ${new Date().toLocaleString()}`,
          style: "subHeader",
        },
        searchVehicle
          ? { text: `Vehicle: ${searchVehicle}`, style: "subHeader" }
          : {},
        selectedPaymentType
          ? { text: `Payment Type: ${selectedPaymentType}`, style: "subHeader" }
          : {},
        { text: "\n" }, // spacing
        {
          table: {
            headerRows: 1,
            widths: ["*", "*", "*", "*", "*"],
            body: [tableHeader, ...tableBody],
          },
          layout: {
            fillColor: function (rowIndex) {
              return rowIndex === 0 ? "#34495E" : null;
            },
          },
        },
      ],
      styles: {
        header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
        subHeader: { fontSize: 11, margin: [0, 2, 0, 5] },
        tableHeader: { bold: true, color: "white", fontSize: 12 },
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`transactions_${searchVehicle || "all"}_${Date.now()}.pdf`);
  };

  return (
    <div className="container mt-5 mb-2">
      {/* Worker Activity */}
      <h2>Worker Login Details</h2>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        <table className="table table-bordered table-hover mb-4">
          <thead className="table-dark position-sticky top-0">
            <tr>
              <th>Worker</th>
              <th>Login Time</th>
              <th>Logout Time</th>
              <th>Shift Closed Time</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={i}>
                <td>{r.worker}</td>
                <td>{new Date(r.loginTime).toLocaleString()}</td>
                <td>
                  {r.logoutTime
                    ? new Date(r.logoutTime).toLocaleString()
                    : "--"}
                </td>
                <td>
                  {r.shiftCloseTime ? (
                    new Date(r.shiftCloseTime).toLocaleString()
                  ) : (
                    <span className="text-success fw-bold">Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Search & Filters */}
      <h2>Search Vehicle Number</h2>
      <div
        className="mb-4 position-relative mt-3 d-flex flex-column"
        ref={inputRef}
      >
        <div className="mb-4 position-relative mt-3 p-3 bg-light rounded shadow-sm">
          {/* Row 1 */}
          <div className="d-flex flex-wrap mb-3 gap-3">
            <div className="flex-grow-1 position-relative">
              <label className="form-label fw-bold d-flex align-items-center">
                <FaSearch className="me-2 text-primary" /> Vehicle Number
              </label>
              <input
                type="text"
                className="form-control form-control-lg shadow-sm"
                placeholder="Enter Vehicle Number..."
                value={searchVehicle}
                onChange={(e) => setSearchVehicle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setSuggestions([])}
                style={{ transition: "all 0.3s ease-in-out" }}
              />
            </div>
            <div className="flex-grow-1 position-relative">
              <label className="form-label fw-bold d-flex align-items-center">
                <FaMoneyBillAlt className="me-2 text-success" /> Payment Type
              </label>
              <select
                className="form-select form-select-lg shadow-sm"
                value={selectedPaymentType}
                onChange={(e) => setSelectedPaymentType(e.target.value)}
                style={{ transition: "all 0.3s ease-in-out" }}
              >
                <option value="">All Transactions</option>
                <option value="CASH">CASH</option>
                <option value="GPAY/PHONE PAY">GPAY/PHONE PAY</option>
                <option value="PENDING">PENDING</option>
                <option value="EXP">EXP</option>
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="d-flex flex-wrap mb-2 gap-3 align-items-end">
            <div className="flex-grow-1 position-relative">
              <label className="form-label fw-bold d-flex align-items-center">
                <FaCalendarAlt className="me-2 text-warning" /> Select Date
              </label>
              <input
                type="date"
                className="form-control form-control-lg shadow-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ transition: "all 0.3s ease-in-out" }}
              />
            </div>
          </div>

          <div className="flex-grow-1 d-flex justify-content-end mt-3">
            <button
              className="btn btn-danger btn-lg w-100 d-flex align-items-center justify-content-center gap-2 shadow-lg"
              onClick={handleExportPDF}
              style={{ transition: "transform 0.2s, box-shadow 0.3s" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <FaFilePdf /> Export PDF
            </button>
          </div>
        </div>

        {/* Suggestions */}
        {searchVehicle && suggestions.length > 0 && (
          <ul
            className="list-group position-absolute w-50 mt-1 shadow-sm"
            style={{
              zIndex: 1000,
              maxWidth: "400px",
              marginLeft: "25px",
              maxHeight: "200px",
              overflowY: "auto",
              borderRadius: "10px",
            }}
          >
            {suggestions.map((v, i) => (
              <li
                key={i}
                className="list-group-item list-group-item-action"
                style={{ cursor: "pointer" }}
                onClick={() => handleSelectSuggestion(v)}
              >
                {v}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Transactions Table */}
      <h2 className="mt-4">
        Transactions for <span>{searchVehicle || "All Vehicles"}</span>
        {selectedPaymentType && (
          <span className="text-primary"> ({selectedPaymentType})</span>
        )}
      </h2>
      <div
        style={{
          maxHeight: "100vh",
          overflowY: "auto",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <table className="table table-bordered table-hover mb-0" ref={tableRef}>
          <thead
            className="table-dark position-sticky top-0"
            style={{ zIndex: 10 }}
          >
            <tr>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => setSortAsc(!sortAsc)}
              >
                Date & Time {sortAsc ? "↑" : "↓"}
              </th>
              <th>Vehicle Number</th>
              <th>Transaction Type</th>
              <th>Payment Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((t, i) => {
              const txnDate = t.createdAt ? new Date(t.createdAt) : null;
              const formattedDateTime = txnDate
                ? `${txnDate.getDate().toString().padStart(2, "0")}/${(
                    txnDate.getMonth() + 1
                  )
                    .toString()
                    .padStart(2, "0")}/${txnDate.getFullYear()} ${txnDate
                    .getHours()
                    .toString()
                    .padStart(2, "0")}:${txnDate
                    .getMinutes()
                    .toString()
                    .padStart(2, "0")}:${txnDate
                    .getSeconds()
                    .toString()
                    .padStart(2, "0")}`
                : "--";

              const isToday =
                txnDate && txnDate.toDateString() === new Date().toDateString();
              return (
                <tr
                  key={i}
                  className={isToday ? "table-success fw-bold" : ""}
                  data-vehicle={t.vehicleNumber?.toLowerCase()}
                >
                  <td>{formattedDateTime}</td>
                  <td>{t.vehicleNumber}</td>
                  <td>{t.transactionType}</td>
                  <td>{t.paymentType}</td>
                  <td>{parseFloat(t.amount).toFixed(2)}</td>
                </tr>
              );
            })}
            <tr>
              <td colSpan="4" className="text-end fw-bold">
                Total
              </td>
              <td className="fw-bold">{filteredTotalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
