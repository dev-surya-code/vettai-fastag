import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "../css/WorkerDashboard.css";
import {
  FaClock,
  FaPowerOff,
  FaRegMoneyBillAlt,
  FaTrash,
} from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function WorkerDashboard({ worker }) {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [pendingAmount, setPendingAmount] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [liveInterval, setLiveInterval] = useState(null);
  const [allVehicles, setAllVehicles] = useState([]);
  const [shiftType, setShiftType] = useState("");
  const [vehicleInputFocused, setVehicleInputFocused] = useState(false);
  const [profit, setProfit] = useState("");

  const inputRef = useRef(null);
  const initialBanks = [
    { name: "AXIS BANK", account: "3447", balance: "", submitted: false },
    { name: "AXIS BANK", account: "1531", balance: "", submitted: false },
    { name: "IDFC FIRST BANK", account: "6006", balance: "", submitted: false },
    { name: "INDUSIND BANK", account: "6006", balance: "", submitted: false },
    { name: "SBI BANK", account: "6006", balance: "", submitted: false },
    { name: "CASH", balance: "", submitted: false },
  ];
  const [banks, setBanks] = useState(
    JSON.parse(localStorage.getItem("banks")) || initialBanks
  );
  const [transactions, setTransactions] = useState(
    JSON.parse(localStorage.getItem("transactions")) || []
  );
  const [pendingBalance, setPendingBalance] = useState(
    JSON.parse(localStorage.getItem("pendingBalance")) || 0
  );

  const [transactionForm, setTransactionForm] = useState({
    vehicleNumber: "",
    transactionType: "",
    amount: "",
    paymentType: "",
  });
  const [payAmount, setPayAmount] = useState("");

  const transactionOptions = [
    "IDFC FIRST BANK",
    "STATE BANK OF INDIA(SBI)",
    "AIRTEL PAYMENTS BANK",
    "ICICI BANK",
    "INDUSIND BANK",
    "KOTAK MAHINDRA BANK",
    "EQUITAS BANK",
    "AXIS BANK",
    "HDFC BANK",
    "BANK OF BARODA",
    "IDBI BANK",
    "FEDRAL BANK",
    "IDFC TAG",
    "SBI TAG",
    "INDUS TAG",
    "AIRTEL TAG",
    "BAJAJ PAY",
    "LIVQUIK FASTAG",
    "OTHERS FASTAG",
    "GPAY/PHONE PAY",
    "PENDING",
    "CASH",
  ];

  const paymentOptions = ["CASH", "GPAY/PHONE PAY", "PENDING", "EXP"];

  // save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem("banks", JSON.stringify(banks));
  }, [banks]);

  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("pendingBalance", JSON.stringify(pendingBalance));
  }, [pendingBalance]);

  const handleBankChange = (index, field, value) => {
    const updated = [...banks];
    updated[index][field] = value;
    setBanks(updated);
  };

  const submitBank = (index) => {
    const updated = [...banks];
    updated[index].submitted = true;
    setBanks(updated);
  };

  const handleTransactionChange = (e) => {
    setTransactionForm({ ...transactionForm, [e.target.name]: e.target.value });
  };
  useEffect(() => {
    axios
      .get(`${API_URL}/api/transactions/all`)
      .then((res) => {
        // get unique vehicle numbers
        const vehicles = [...new Set(res.data.map((t) => t.vehicleNumber))];

        // only keep vehicles with pending amount > 0
        const pendingVehicles = vehicles.filter((v) => {
          const vehicleTxns = res.data.filter(
            (t) => t.vehicleNumber?.toLowerCase() === v.toLowerCase()
          );
          let pendingTotal = 0;
          vehicleTxns.forEach((t) => {
            const amt = parseFloat(t.amount || 0);
            if (
              t.transactionType === "PENDING" &&
              t.paymentType === "GPAY/PHONE PAY"
            ) {
              pendingTotal -= amt;
            } else if (t.paymentType === "PENDING") {
              pendingTotal += amt;
            }
          });
          return pendingTotal > 0; // only vehicles with pending
        });

        setAllVehicles(pendingVehicles); // store pending vehicles
      })
      .catch((err) => console.error(err));
  }, []);

  const addTransaction = async (e) => {
    e.preventDefault();

    try {
      const txVehicle = transactionForm.vehicleNumber || vehicleNumber;
      if (!txVehicle) {
        Swal.fire({
          icon: "warning",
          title: "Enter Vehicle Number",
          text: "Please enter the vehicle number before adding a transaction.",
          timer: 3000,
          showConfirmButton: false,
          position: "top-center",
          toast: true,
        });
        return;
      }

      const worker = localStorage.getItem("username") || "Worker1";
      const newTx = { ...transactionForm, vehicleNumber: txVehicle, worker };

      // Add transaction to backend
      await axios.post(API_URL + "/api/transactions/add", newTx);

      // Only show popup if transaction type is "PENDING"
      if (transactionForm.transactionType.toUpperCase() === "PENDING") {
        const collectedAmt = parseFloat(transactionForm.amount || 0);
        const prevPending = pendingAmount || 0;
        const newPending = prevPending - collectedAmt;

        // ✅ Update UI pending balance
        setPendingAmount(newPending > 0 ? newPending : 0);

        // ✅ Update dropdown list
        setSuggestions((prev) =>
          prev.map((item) =>
            item.vehicle === txVehicle
              ? { ...item, pending: newPending > 0 ? newPending : 0 }
              : item
          )
        );

        // ✅ Create "cleared" transaction object
        const clearedTx = {
          vehicleNumber: txVehicle,
          transactionType: "PENDING_CLEARED", // distinguishable type
          paymentType: transactionForm.paymentType, // CASH / GPAY / EXP
          amount: collectedAmt,
          worker,
        };

        // ✅ Send cleared transaction to backend
        await axios.post(API_URL + "/api/transactions/add", clearedTx);

        // ✅ Add it locally so totals update instantly
        setTransactions((prev) => [...prev, clearedTx]);

        // ✅ Update backend with new pending amount
        await axios.put(
          `${API_URL}/api/transactions/updatePending/${txVehicle}`,
          { newPending }
        );

        Swal.fire({
          icon: "success",
          title: `₹${collectedAmt} collected from ${txVehicle}`,
          text: `Remaining pending balance: ₹${newPending.toFixed(2)}`,
          position: "top-center",
          toast: true,
          timer: 3000,
          showConfirmButton: false,
        });
      }

      // Update transactions locally
      setTransactions([...transactions, newTx]);

      // Reset form & input states
      setTransactionForm({
        vehicleNumber: "",
        transactionType: "",
        amount: "",
        paymentType: "",
      });
      setVehicleNumber("");
      setPendingAmount(null);
      setSelectedVehicle(null);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Failed to Add Transaction",
        text: "Something went wrong. Please try again.",
        position: "top-center",
        toast: true,
        timer: 5000,
        showConfirmButton: false,
      });
    }
  };

  const totalAmount = transactions.reduce(
    (sum, t) => sum + parseFloat(t.amount || 0),
    0
  );
  const handleConfirmLogout = async () => {
    try {
      const worker = localStorage.getItem("username");
      if (!worker) {
        Swal.fire({
          icon: "error",
          title: "Worker not found",
          text: "No worker session found. Please log in again.",
        });
        return navigate("/worker/login");
      }

      const logoutTime = new Date().toISOString();

      const res = await axios.post(API_URL + "/api/auth/workers/logout", {
        worker,
        logoutTime,
      });

      Swal.fire({
        icon: "success",
        title: "Logged Out Successfully",
        timer: 1500,
        showConfirmButton: false,
        position: "top-center",
        toast: true,
      });

      localStorage.removeItem("token");
      localStorage.removeItem("username");
      navigate("/worker/login");
    } catch (err) {
      console.error("Logout error:", err.response || err.message);
      Swal.fire({
        icon: "error",
        title: "Failed to Logout",
        text: err.response?.data?.message || "Server not responding",
      });
    }
  };
  const defaultTotals = {
    CASH: 0,
    "GPAY/PHONE PAY": 0,
    EXP: 0,
    PENDING: 0,
  };

  const startingCash = parseFloat(
    banks.find((b) => b.name === "CASH")?.balance || 0
  );

  // ✅ Display-only totals (no pending subtraction)
  const totalsByPaymentType = transactions.reduce(
    (acc, t) => {
      const amt = parseFloat(t.amount || 0);
      const payType = t.paymentType?.toUpperCase();
      const txnType = t.transactionType?.toUpperCase();

      if (!amt || !payType) return acc;

      // 💡 If transactionType is PENDING with CASH/GPAY/EXP → add to payment type only
      if (
        txnType === "PENDING" &&
        ["CASH", "GPAY/PHONE PAY", "EXP"].includes(payType)
      ) {
        acc[payType] = (acc[payType] || 0) + amt;
        // ❌ Do not modify acc.PENDING here (only backend handles it)
        return acc;
      }

      if (
        txnType === "CASH" &&
        ["GPAY/PHONE PAY", "PENDING", "EXP"].includes(payType)
      ) {
        acc.CASH -= amt; // subtract from cash
        acc[payType] = (acc[payType] || 0) + amt; // add to target payment type
        return acc;
      }
      // 💡 Normal transaction — add to its payment type
      acc[payType] = (acc[payType] || 0) + amt;

      // 💡 If pending sale (not collected yet)
      if (
        txnType === "PENDING" &&
        !["CASH", "GPAY/PHONE PAY", "EXP"].includes(payType)
      ) {
        acc.PENDING = (acc.PENDING || 0) + amt;
      }
      return acc;
    },
    { ...defaultTotals }
  );

  // ✅ Add starting cash once
  totalsByPaymentType.CASH += isNaN(startingCash) ? 0 : startingCash;

  // fetch all vehicle numbers for suggestions
  useEffect(() => {
    axios.get(API_URL + "/api/transactions/all").then((res) => {
      const vehicles = [...new Set(res.data.map((t) => t.vehicleNumber))];
      setSuggestions(vehicles);
    });
  }, []);

  // fetch pending amount when vehicle changes
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch pending vehicles on mount
  useEffect(() => {
    axios
      .get(`${API_URL}/api/transactions/all`)
      .then((res) => {
        const vehicles = [...new Set(res.data.map((t) => t.vehicleNumber))];

        const vehiclePendingList = vehicles.map((v) => {
          const vehicleTxns = res.data.filter(
            (t) => t.vehicleNumber?.toLowerCase() === v?.toLowerCase()
          );

          let pendingTotal = 0;

          vehicleTxns.forEach((t) => {
            const amt = parseFloat(t.amount || 0);

            if (t.transactionType === "PENDING") {
              if (t.paymentType === "GPAY/PHONE PAY") {
                pendingTotal -= amt; // GPAY reduces pending when collected
              } else if (["CASH", "EXP"].includes(t.paymentType)) {
                pendingTotal -= amt; // CASH or EXP reduces pending too
              } else if (t.paymentType === "PENDING") {
                pendingTotal += amt; // Original pending amount
              }
            }
          });

          return {
            vehicleNumber: v,
            pending: pendingTotal > 0 ? pendingTotal : 0,
          };
        });

        setAllVehicles(vehiclePendingList);
      })
      .catch((err) => console.error(err));
  }, []);

  const handlePayment = async (type) => {
    await fetch(`${API_URL}/transactions/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });

    const res = await fetch(`${API_URL}/transactions`);
    const data = await res.json();
    setTransactions(data);
  };

  const handleVehicleChange = async (val) => {
    setVehicleNumber(val);
    setSelectedVehicle(null);
    setPendingAmount(null);

    if (val.trim().length < 1) {
      setSuggestions([]);
      if (liveInterval) clearInterval(liveInterval);
      return;
    }

    // 🔄 Fetch vehicles matching input and show live pending
    const fetchSuggestions = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/transactions/all`);

        const vehicles = [
          ...new Set(res.data.map((t) => t.vehicleNumber)),
        ].filter((v) => v?.toLowerCase().includes(val.toLowerCase()));

        const results = await Promise.all(
          vehicles.map(async (vehicle) => {
            try {
              const pendingRes = await axios.get(
                `${API_URL}/api/transactions/pending/${vehicle}`
              );
              return {
                vehicle,
                pending: parseFloat(pendingRes.data.totalPending || 0),
              };
            } catch {
              return { vehicle, pending: 0 };
            }
          })
        );

        setSuggestions(results);
      } catch (err) {
        console.error("Error fetching vehicles:", err);
      }
    };

    // Call once immediately
    await fetchSuggestions();

    // 🔁 Live refresh every 8 seconds
    if (liveInterval) clearInterval(liveInterval);
    const intervalId = setInterval(fetchSuggestions, 8000);
    setLiveInterval(intervalId);
  };

  // 🧹 Clear interval when unmounting
  useEffect(() => {
    return () => {
      if (liveInterval) clearInterval(liveInterval);
    };
  }, [liveInterval]);
  // 🔄 Keep selected vehicle's pending updated
  useEffect(() => {
    if (!selectedVehicle) return;
    const interval = setInterval(() => {
      axios
        .get(`${API_URL}/api/transactions/pending/${selectedVehicle}`)
        .then((res) => setPendingAmount(res.data.totalPending || 0))
        .catch(() => setPendingAmount(0));
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedVehicle]);

  const handleSelectSuggestion = async (vehicle) => {
    setVehicleNumber(vehicle);

    setTransactionForm((prev) => ({
      ...prev,
      vehicleNumber: vehicle,
    }));

    setSuggestions([]); // hide dropdown
    setSelectedVehicle(vehicle);

    try {
      const res = await axios.get(
        `${API_URL}/api/transactions/pending/${vehicle}`
      );
      setPendingAmount(parseFloat(res.data.totalPending || 0));
    } catch {
      setPendingAmount(0);
    }
  };

  // Filter transactions for selected vehicle
  const displayedTransactions = selectedVehicle
    ? transactions.filter(
        (t) => t.vehicleNumber?.toLowerCase() === selectedVehicle.toLowerCase()
      )
    : transactions;
  const handleShiftClose = async () => {
    try {
      if (!shiftType) {
        Swal.fire({
          icon: "warning",
          title: "Shift Type Required",
          text: "Please select DAY or NIGHT before closing the shift.",
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: "top-center",
        });
        return;
      }

      const worker = localStorage.getItem("username");
      const closedTime = new Date().toISOString();
      const logoutTime = new Date().toISOString();

      // ⭐ COLLECT FULL DASHBOARD DATA
      const shiftData = {
        worker,
        shiftType,
        closedTime,
        logoutTime,
        profit: Number(profit), // ⭐ ADD THIS
        bankBalances: banks,
        totalsByPaymentType,
        transactions,
      };

      if (profit === "" || Number.isNaN(Number(profit))) {
        Swal.fire(
          "Profit Required",
          "Please enter profit before closing shift.",
          "warning"
        );
        return;
      }

      // ⭐ SEND TO BACKEND
      await axios.post(`${API_URL}/api/auth/workers/shiftclose`, shiftData);

      console.log("SHIFT CLOSE DATA SENT:", {
        worker,
        closedTime,
        logoutTime,
        shiftType,
      });

      Swal.fire({
        icon: "success",
        title: `Shift Closed (${shiftType})`,
        text: "Your transactions have been submitted to the owner dashboard.",
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: "top-center",
      });

      // Clear local data
      localStorage.removeItem("token");
      localStorage.removeItem("transactions");
      localStorage.removeItem("banks");
      setProfit("");
      setShiftType("");
      setTransactions([]);
      setBanks(initialBanks);
      navigate("/worker/login");
    } catch (err) {
      console.error("Error closing shift:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Close Shift",
        text: "Something went wrong. Please try again.",
      });
    }
  }; // 🗑️ Delete by ID
  const handleDeleteTransaction = async (tx) => {
    if (!tx._id) {
      console.error("Missing transaction ID:", tx);
      Swal.fire({
        icon: "error",
        title: "Invalid Transaction",
        text: "This transaction doesn't have a valid ID and cannot be deleted.",
        timer: 2500,
        showConfirmButton: false,
        toast: true,
        position: "top-center",
      });
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: `Delete transaction ${tx.vehicleNumber} - ₹${tx.amount}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          console.log("Deleting transaction with ID:", tx._id);

          // ✅ Delete from backend
          await axios.delete(`${API_URL}/api/transactions/${tx._id}`);

          // ✅ Update frontend
          const updated = transactions.filter((t) => t._id !== tx._id);
          setTransactions(updated);
          localStorage.setItem("transactions", JSON.stringify(updated));

          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Transaction removed successfully.",
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: "top-center",
          });
        } catch (err) {
          console.error("Error deleting transaction:", err);
          Swal.fire({
            icon: "error",
            title: "Delete Failed",
            text:
              err.response?.data?.message || "Unable to delete transaction.",
          });
        }
      }
    });
  };
  // 🗑️ Delete a specific transaction using vehicleNumber, transactionType, amount, and paymentType
  const handleDelete = async (tx) => {
    console.log("Deleting transaction:", tx);

    if (
      !tx.vehicleNumber ||
      !tx.transactionType ||
      !tx.amount ||
      !tx.paymentType
    ) {
      Swal.fire({
        icon: "error",
        title: "Missing Details",
        text: "Incomplete transaction data. Cannot delete.",
        timer: 2500,
        showConfirmButton: false,
        toast: true,
        position: "top-center",
      });
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: `Delete ${tx.vehicleNumber} - ${tx.transactionType} - ₹${tx.amount}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // send all matching fields to backend for precise delete
          await axios.delete(`${API_URL}/api/transactions/delete-specific`, {
            data: {
              vehicleNumber: tx.vehicleNumber,
              transactionType: tx.transactionType,
              amount: tx.amount,
              paymentType: tx.paymentType,
            },
          });

          // Remove from local state
          const updated = transactions.filter(
            (t) =>
              !(
                t.vehicleNumber === tx.vehicleNumber &&
                t.transactionType === tx.transactionType &&
                parseFloat(t.amount) === parseFloat(tx.amount) &&
                t.paymentType === tx.paymentType
              )
          );

          setTransactions(updated);
          localStorage.setItem("transactions", JSON.stringify(updated));

          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Transaction removed successfully.",
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: "top-center",
          });
        } catch (err) {
          console.error("Error deleting transaction:", err);
          Swal.fire({
            icon: "error",
            title: "Delete Failed",
            text:
              err.response?.data?.message || "Unable to delete transaction.",
          });
        }
      }
    });
  };
  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-end mb-3">
        <button
          className="btn btn-danger mx-3"
          onClick={() => setShowLogoutModal(true)}
        >
          <FaClock style={{ marginRight: "8px" }} />
          Logout
        </button>
        <button
          className="btn btn-warning"
          onClick={() => setShowLogoutModal("shift")}
        >
          <FaPowerOff style={{ marginRight: "8px" }} />
          Shift Close
        </button>
      </div>
      <h2>Worker Dashboard</h2>
      {showLogoutModal && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {showLogoutModal === "shift"
                    ? "Confirm Shift Close"
                    : "Confirm Logout"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowLogoutModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {showLogoutModal === "shift" ? (
                  <>
                    <p>Are you sure you want to close this shift?</p>

                    <div className="form-group mt-3">
                      <label className="fw-bold mb-2">Select Shift Type:</label>
                      <select
                        className="form-select"
                        value={shiftType}
                        onChange={(e) => setShiftType(e.target.value)}
                        required
                      >
                        <option value="">Select Shift</option>
                        <option value="DAY">DAY</option>
                        <option value="NIGHT">NIGHT</option>
                      </select>
                    </div>

                    <div className="form-group mt-3">
                      <label className="fw-bold mb-2">Profit (₹):</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Enter profit"
                        required
                        value={profit}
                        onChange={(e) => setProfit(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <p>Are you sure you want to logout?</p>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLogoutModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn ${
                    showLogoutModal === "shift" ? "btn-warning" : "btn-danger"
                  }`}
                  onClick={() =>
                    showLogoutModal === "shift"
                      ? handleShiftClose() // modified below
                      : handleConfirmLogout()
                  }
                >
                  {showLogoutModal === "shift" ? "Close Shift" : "Logout"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Balances */}
      <h4 className="mt-4">Bank Balances</h4>
      <div className="row">
        {banks.map((bank, i) => (
          <div className="col-md-4 mb-3" key={i}>
            <div className="card p-3">
              <h5>{bank.name}</h5>
              {bank.name === "CASH" ? (
                bank.submitted ? (
                  <p>
                    <strong>Balance:</strong> ₹{bank.balance}
                  </p>
                ) : (
                  <>
                    <input
                      type="number"
                      className="form-control mb-2"
                      placeholder="Balance"
                      value={bank.balance}
                      onChange={(e) =>
                        handleBankChange(i, "balance", e.target.value)
                      }
                    />
                    <button
                      className="btn btn-success btn-sm w-100 fw-bolder"
                      onClick={() => submitBank(i)}
                    >
                      <FaRegMoneyBillAlt className="me-2" /> Save
                    </button>
                  </>
                )
              ) : bank.submitted ? (
                <div>
                  <p>
                    <strong>Balance:</strong> {bank.balance}
                  </p>
                </div>
              ) : (
                <>
                  {bank.account && (
                    <p>
                      <strong>Account NO:</strong> {bank.account}
                    </p>
                  )}
                  <input
                    type="number"
                    className="form-control mb-2"
                    placeholder="Balance"
                    value={bank.balance}
                    onChange={(e) =>
                      handleBankChange(i, "balance", e.target.value)
                    }
                  />
                  <button
                    className="btn btn-success btn-sm w-100 fw-bolder"
                    onClick={() => submitBank(i)}
                  >
                    <FaRegMoneyBillAlt className="me-2 " /> Save
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="totals">
        <h4 className="mt-4">Totals by Payment Type</h4>
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Payment Type</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(totalsByPaymentType).map(([type, amt]) => (
              <tr key={type}>
                <td>{type}</td>
                <td>₹{amt.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Transaction Form */}
      <h4 className="mt-4">Add Transaction</h4>
      <form onSubmit={addTransaction} className="mb-4">
        <div className="row col-md-12 p-3">
          <div className="col-md-3 mb-2">
            <div className="mb-2 position-relative" ref={inputRef}>
              <input
                type="text"
                className="form-control"
                placeholder="Enter Vehicle Number..."
                value={vehicleNumber}
                onFocus={() => setVehicleInputFocused(true)}
                onBlur={() => {
                  setTimeout(() => setVehicleInputFocused(false), 150);
                }}
                onChange={(e) => handleVehicleChange(e.target.value)}
              />

              {vehicleNumber && (
                <div
                  className={`mt-2 fw-bold ${
                    pendingAmount > 0 ? "text-danger" : "text-success"
                  }`}
                >
                  Pending Amount: ₹{(pendingAmount ?? 0).toFixed(2)}
                </div>
              )}

              {vehicleInputFocused &&
                vehicleNumber &&
                suggestions.length > 0 && (
                  <ul
                    className="list-group position-absolute w-100 shadow-lg"
                    style={{
                      zIndex: 2000,
                      maxHeight: "220px",
                      overflowY: "auto",
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                    }}
                  >
                    {suggestions.map((item, i) => (
                      <li
                        key={i}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                        style={{ cursor: "pointer" }}
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevents input from losing focus
                          handleSelectSuggestion(item.vehicle);
                        }}
                      >
                        <span>{item.vehicle}</span>
                        <span
                          className={`fw-bold ${
                            item.pending > 0 ? "text-danger" : "text-success"
                          }`}
                        >
                          ₹{Number(item.pending || 0).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
            <datalist id="vehicleSuggestions">
              {[...new Set(transactions.map((t) => t.vehicleNumber))].map(
                (v, i) => (
                  <option key={i} value={v} />
                )
              )}
            </datalist>
          </div>
          <div className="col-md-3 mb-2">
            <select
              className="form-control"
              name="transactionType"
              value={transactionForm.transactionType}
              onChange={handleTransactionChange}
              required
            >
              <option value="">Select Transaction Type</option>
              {transactionOptions.map((opt, i) => (
                <option
                  key={i}
                  value={opt}
                  disabled={
                    opt.toUpperCase() === "PENDING" &&
                    (!pendingAmount || pendingAmount <= 0)
                  }
                >
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2 mb-2">
            <input
              type="number"
              className="form-control"
              placeholder="Amount"
              name="amount"
              value={transactionForm.amount}
              onChange={handleTransactionChange}
              required
            />
          </div>
          <div className="col-md-2 mb-2">
            <select
              className="form-control"
              name="paymentType"
              value={transactionForm.paymentType}
              onChange={handleTransactionChange}
              required
            >
              <option value="">Select Payment Type</option>
              {paymentOptions.map((opt, i) => (
                <option key={i} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2 mb-2">
            <button className="btn btn-primary btn-glow" type="submit">
              Add Transaction
            </button>
          </div>
        </div>
      </form>

      {/* Transaction Table */}
      <h4>Transactions</h4>
      <table className="table table-bordered mb-5 mt-2">
        <thead>
          <tr>
            <th>Vehicle Number</th>
            <th>Transaction Type</th>
            <th>Payment Type</th>
            <th>Amount</th>
            <th>Action</th> {/* New column */}
          </tr>
        </thead>

        <tbody>
          {transactions.map((t, i) => (
            <tr key={t._id || i}>
              <td>{t.vehicleNumber}</td>
              <td>{t.transactionType}</td>
              <td>{t.paymentType}</td>
              <td>₹{parseFloat(t.amount).toFixed(2)}</td>
              <td className="text-center">
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(t)}
                >
                  <FaTrash /> Delete
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan="4" className="text-end fw-bold">
              Total
            </td>
            <td className="fw-bold">₹{totalAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
