import React, { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts"; // ✅ include this
import "../css/OwnerDashboard.css";
import vettailogo from "../images/vettai_fastag_logo.jpg";
pdfMake.vfs = pdfFonts.pdfMake?.vfs;
import {
  FaSearch,
  FaFilePdf,
  FaCalendarAlt,
  FaMoneyBillAlt,
  FaTruckLoading,
  FaPlus,
  FaTrash,
  FaUserCircle,
  FaUserAlt,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { use } from "react";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
  const [transports, setTransports] = useState([]);
  const [transportName, setTransportName] = useState("");
  const [transportVehicle, setTransportVehicle] = useState("");
  // 🚘 Add Vehicle Popup States
  const [showAddVehiclePopup, setShowAddVehiclePopup] = useState(false);
  const [currentTransportName, setCurrentTransportName] = useState("");
  const [newVehicleInput, setNewVehicleInput] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [workerSearch, setWorkerSearch] = useState("");
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [transportPdfUrl, setTransportPdfUrl] = useState(null);
  const [selectedTransportName, setSelectedTransportName] = useState("");
  const [transportFromDate, setTransportFromDate] = useState("");
  const [transportToDate, setTransportToDate] = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [workerFromDate, setWorkerFromDate] = useState("");
  const [workerToDate, setWorkerToDate] = useState("");
  const [workerPreviewUrl, setWorkerPreviewUrl] = useState(null);
  const [showWorkerPreview, setShowWorkerPreview] = useState(false);
  const [shiftRecords, setShiftRecords] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showShiftPopup, setShowShiftPopup] = useState(false);
  const [selectedShiftIndex, setSelectedShiftIndex] = useState(null);
  const [editingDateIndex, setEditingDateIndex] = useState(null);
  const [tempDate, setTempDate] = useState("");

  const tableRef = useRef(null);
  const inputRef = useRef(null);
  const vehicleWrapperRef = useRef(null);

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

        const matchesWorker =
          !workerSearch.trim() ||
          t.worker?.toLowerCase().includes(workerSearch.toLowerCase());

        let matchesDate = true;

        if (fromDate) {
          const from = new Date(fromDate);
          const txnDate = new Date(t.createdAt);
          if (txnDate < from) matchesDate = false;
        }

        if (toDate) {
          const to = new Date(toDate);
          const txnDate = new Date(t.createdAt);
          to.setHours(23, 59, 59, 999);
          if (txnDate > to) matchesDate = false;
        }

        return matchesVehicle && matchesPayment && matchesDate && matchesWorker;
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return sortAsc ? dateA - dateB : dateB - dateA;
      });
  }, [
    transactions,
    searchVehicle,
    selectedPaymentType,
    selectedDate,
    workerSearch,
    fromDate,
    toDate,
    sortAsc,
  ]);

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

    // ⭐ Remove PENDING_CLEARED
    const filteredTransactions = sortedTransactions
      .filter((t) => t.transactionType?.toUpperCase() !== "PENDING_CLEARED")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // ⭐ ASC sort

    // ⭐ Table Header
    const tableHeader = [
      { text: "Date & Time", style: "tableHeader" },
      { text: "Vehicle", style: "tableHeader" },
      { text: "Type", style: "tableHeader" },
      { text: "Payment", style: "tableHeader" },
      { text: "Amount", style: "tableHeader" },
    ];

    // ⭐ Table Rows
    const tableBody = filteredTransactions.map((t) => {
      const d = new Date(t.createdAt);
      return [
        d.toLocaleString(),
        t.vehicleNumber,
        t.transactionType,
        t.paymentType,
        `₹${parseFloat(t.amount).toFixed(2)}`,
      ];
    });

    // ⭐ Total (after removing PENDING_CLEARED)
    const total = filteredTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0),
      0
    );

    tableBody.push([
      "",
      "",
      "",
      { text: "Total", bold: true },
      { text: `₹${total.toFixed(2)}`, bold: true },
    ]);

    // ⭐ PDF Definition (same as transport)
    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 100, 40, 100],

      header: (currentPage) => {
        if (currentPage !== 1) return {};

        return {
          margin: [40, 20, 20, 0],
          stack: [
            {
              canvas: [
                {
                  type: "rect",
                  x: 0,
                  y: 0,
                  w: 517,
                  h: 50,
                  r: 5,
                  linearGradient: ["#00255cff", "#002c63ff"],
                },
              ],
            },
            {
              absolutePosition: { x: 50, y: 37 },
              bold: true,
              text: "Vettai Fastag Service Centre",
              color: "white",
              fontSize: 18,
            },
            {
              absolutePosition: { x: 400, y: 20 },
              stack: [
                {
                  canvas: [
                    {
                      type: "rect",
                      x: 70,
                      y: 5,
                      w: 60,
                      h: 40,
                      r: 2,
                      color: "#ffffff",
                    },
                  ],
                },
                {
                  image: "logo",
                  width: 45,
                  height: 30,
                  alignment: "center",
                  margin: [20, -35, 0, 0],
                },
              ],
            },
          ],
        };
      },

      images: { logo: logoBase64 },

      content: [
        {
          text: "Statement of Account",
          alignment: "center",
          bold: true,
          fontSize: 16,
          margin: [0, 0, 0, 10],
        },

        // ⭐ Info Table Similar to Transport PDF
        {
          table: {
            widths: ["25%", "25%", "25%", "25%"],
            body: [
              [
                {
                  text: "Vehicle",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "Worker",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "From Date",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "To Date",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
              ],
              [
                { text: searchVehicle || "--", alignment: "center" },
                { text: workerSearch || "--", alignment: "center" },
                { text: fromDate || "--", alignment: "center" },
                { text: toDate || "--", alignment: "center" },
              ],
            ],
          },
          layout: {
            fillColor: (i) => (i === 0 ? "#0066cc" : null),
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => "#cccccc",
            vLineColor: () => "#cccccc",
          },
          margin: [0, 10, 0, 20],
        },

        // ⭐ Main Table
        {
          table: {
            headerRows: 1,
            widths: ["20%", "20%", "20%", "20%", "20%"],
            body: [tableHeader, ...tableBody],
          },
          layout: { fillColor: (i) => (i === 0 ? "#34495E" : null) },
        },

        // ⭐ Footer
        {
          margin: [0, 20, 0, 0],
          stack: [
            {
              text: "***END OF STATEMENT***",
              alignment: "center",
              bold: true,
              fontSize: 11,
              margin: [0, 10, 20, 20],
            },
            {
              text: "* This is computer generated statement and hence does not require signature.",
              fontSize: 10,
            },
            {
              text: "* Customer Contact Center Number: 9751926006, 9943252055",
              fontSize: 10,
              margin: [0, 5, 0, 20],
            },
            {
              text: `Generated On: ${new Date().toLocaleString()}`,
              alignment: "center",
              fontSize: 11,
            },
          ],
        },
      ],

      styles: {
        tableHeader: { bold: true, color: "white" },
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`transactions_${searchVehicle || "all"}_${Date.now()}.pdf`);
  };

  const handlePreviewPDF = () => {
    if (!sortedTransactions.length) {
      Swal.fire({
        icon: "warning",
        title: "No Data",
        text: "There are no transactions to preview.",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    const filteredTransactions = sortedTransactions
      .filter((t) => t.transactionType?.toUpperCase() !== "PENDING_CLEARED")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // ⭐ ASC sort

    const tableHeader = [
      { text: "Date & Time", style: "tableHeader" },
      { text: "Vehicle", style: "tableHeader" },
      { text: "Type", style: "tableHeader" },
      { text: "Payment", style: "tableHeader" },
      { text: "Amount", style: "tableHeader" },
    ];

    const tableBody = filteredTransactions.map((t) => {
      const d = new Date(t.createdAt);
      return [
        d.toLocaleString(),
        t.vehicleNumber,
        t.transactionType,
        t.paymentType,
        `₹${parseFloat(t.amount).toFixed(2)}`,
      ];
    });

    const total = filteredTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0),
      0
    );

    tableBody.push([
      "",
      "",
      "",
      { text: "Total", bold: true },
      { text: `₹${total.toFixed(2)}`, bold: true },
    ]);

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 100, 40, 100],

      header: (currentPage) => {
        if (currentPage !== 1) return {};
        return {
          margin: [40, 20, 20, 0],
          stack: [
            {
              canvas: [
                {
                  type: "rect",
                  x: 0,
                  y: 0,
                  w: 517,
                  h: 50,
                  r: 5,
                  linearGradient: ["#00255cff", "#002c63ff"],
                },
              ],
            },
            {
              absolutePosition: { x: 50, y: 37 },
              bold: true,
              text: "Vettai Fastag Service Centre",
              color: "white",
              fontSize: 18,
            },
            {
              absolutePosition: { x: 400, y: 20 },
              stack: [
                {
                  canvas: [
                    {
                      type: "rect",
                      x: 70,
                      y: 5,
                      w: 60,
                      h: 40,
                      r: 2,
                      color: "#ffffff",
                    },
                  ],
                },
                {
                  image: "logo",
                  width: 45,
                  height: 30,
                  alignment: "center",
                  margin: [20, -35, 0, 0],
                },
              ],
            },
          ],
        };
      },

      images: { logo: logoBase64 },

      content: [
        {
          text: "Statement of Account",
          alignment: "center",
          bold: true,
          fontSize: 16,
          margin: [0, 0, 0, 10],
        },

        {
          table: {
            widths: ["25%", "25%", "25%", "25%"],
            body: [
              [
                {
                  text: "Vehicle",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "Worker",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "From Date",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "To Date",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
              ],
              [
                { text: searchVehicle || "--", alignment: "center" },
                { text: workerSearch || "--", alignment: "center" },
                { text: fromDate || "--", alignment: "center" },
                { text: toDate || "--", alignment: "center" },
              ],
            ],
          },
          layout: {
            fillColor: (i) => (i === 0 ? "#0066cc" : null),
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => "#cccccc",
            vLineColor: () => "#cccccc",
          },
          margin: [0, 10, 0, 20],
        },

        {
          table: {
            headerRows: 1,
            widths: ["20%", "20%", "20%", "20%", "20%"],
            body: [tableHeader, ...tableBody],
          },
          layout: {
            fillColor: (i) => (i === 0 ? "#34495e" : null),
          },
        },

        {
          margin: [0, 20, 0, 0],
          stack: [
            {
              text: "***END OF STATEMENT***",
              alignment: "center",
              bold: true,
              fontSize: 11,
              margin: [0, 10, 20, 20],
            },
            {
              text: "* This is computer generated statement and hence does not require signature.",
              fontSize: 10,
            },
            {
              text: "* Customer Contact Center Number: 9751926006, 9943252055",
              fontSize: 10,
              margin: [0, 5, 0, 20],
            },
            {
              text: `Generated On: ${new Date().toLocaleString()}`,
              alignment: "center",
              fontSize: 11,
            },
          ],
        },
      ],

      styles: {
        tableHeader: { bold: true, color: "white" },
      },
    };

    pdfMake.createPdf(docDefinition).getBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setShowPdfPreview(true);
    });
  };

  // ✅ Load transports when page loads
  useEffect(() => {
    axios.get(`${API_URL}/api/transports/all`).then((res) => {
      setTransports(res.data);
    });
  }, []);

  // ✅ Save transport to DB
  const handleAddTransport = async () => {
    if (!transportName.trim() || !transportVehicle.trim()) return;

    await axios.post(`${API_URL}/api/transports/add`, {
      name: transportName,
      vehicle: transportVehicle,
    });

    // reload transport list after save
    const res = await axios.get(`${API_URL}/api/transports/all`);
    setTransports(res.data);

    setTransportName("");
    setTransportVehicle("");
  };

  // ✅ Remove ONLY the vehicle
  const removeTransport = async (name, vehicle) => {
    await axios.delete(`${API_URL}/api/transports/remove`, {
      params: { name, vehicle },
    });
    Swal.fire({
      icon: "success",
      title: "Vehicle Deleted!",
      text: `Vehicle ${newVehicleInput.trim()} deleted in ${currentTransportName}`,
      timer: 1800,
      showConfirmButton: false,
    });
    const res = await axios.get(`${API_URL}/api/transports/all`);
    setTransports(res.data);
  };

  // ✅ POPUP STATE
  const [showPopup, setShowPopup] = useState(false);
  const [selectedVehicleData, setSelectedVehicleData] = useState([]);

  const handleShowPopup = (vehicle) => {
    const filtered = transactions.filter((t) => t.vehicleNumber === vehicle);
    setSelectedVehicleData(filtered);
    setShowPopup(true);
  };
  const handleOpenAddVehiclePopup = (name) => {
    setCurrentTransportName(name);
    setNewVehicleInput("");
    setShowAddVehiclePopup(true);
  };
  const handleAddVehicleToTransport = async () => {
    if (!newVehicleInput.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Input",
        text: "Please enter a valid vehicle number before adding.",
        confirmButtonColor: "#0078ff",
      });
      return;
    }

    try {
      // Send directly to backend
      await axios.post(`${API_URL}/api/transports/add`, {
        name: currentTransportName,
        vehicle: newVehicleInput.trim(),
      });
      const res = await axios.get(`${API_URL}/api/transports/all`);
      setTransports(res.data);
      // Update frontend instantly
      setTransports((prev) => {
        const existing = prev.find((t) => t.name === currentTransportName);
        if (existing) {
          return prev.map((t) =>
            t.name === currentTransportName
              ? {
                  ...t,
                  vehicle: t.vehicle ? t.vehicle : "",
                  vehicles: [
                    ...new Set([...(t.vehicles || []), newVehicleInput]),
                  ],
                }
              : t
          );
        } else {
          return [
            ...prev,
            { name: currentTransportName, vehicles: [newVehicleInput] },
          ];
        }
      });
      Swal.fire({
        icon: "success",
        title: "Vehicle Added!",
        text: `Vehicle ${newVehicleInput.trim()} added to ${currentTransportName}`,
        timer: 1800,
        showConfirmButton: false,
      });
      setShowAddVehiclePopup(false);
      setNewVehicleInput("");
    } catch (err) {
      console.error("Error adding vehicle:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Add Vehicle",
        text:
          err.response?.data?.message ||
          "Something went wrong while adding the vehicle. Please try again.",
        confirmButtonColor: "#d33",
      });
    }
  };
  const handleTransportExportPDF = () => {
    if (!selectedVehicleData.length) {
      Swal.fire({
        icon: "warning",
        title: "No Data",
        text: "This transport has no transactions.",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    const tableHeader = [
      { text: "Vehicle", style: "tableHeader" },
      { text: "Date & Time", style: "tableHeader" },
      { text: "Type", style: "tableHeader" },
      { text: "Payment", style: "tableHeader" },
      { text: "Amount", style: "tableHeader" },
    ];

    // ⭐ SORT ASCENDING — oldest first, newest last
    const sortedVehicleData = selectedVehicleData
      .filter((t) => t.transactionType?.toUpperCase() !== "PENDING_CLEARED")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // TABLE BODY
    const tableBody = sortedVehicleData.map((t) => {
      const d = new Date(t.createdAt);

      const isPaid = ["CASH", "GPAY/PHONE PAY"].includes(
        t.paymentType?.toUpperCase()
      );

      return [
        t.vehicleNumber,
        d.toLocaleString(),
        t.transactionType,
        { text: t.paymentType },
        {
          text: `₹${parseFloat(t.amount).toFixed(2)}`,
          color: isPaid ? "green" : "red",
          bold: true,
        },
      ];
    });

    let pendingHandled = {};
    // ⭐ CALCULATE PENDING BALANCE
    let pendingBalance = 0;

    selectedVehicleData.forEach((t) => {
      const txn = t.transactionType?.toUpperCase();
      const amount = parseFloat(t.amount || 0);

      if (txn === "PENDING") pendingBalance += amount;
      if (txn === "PENDING_CLEARED") pendingBalance -= amount;
    });

    let total = 0;

    selectedVehicleData.forEach((t) => {
      const txn = t.transactionType?.toUpperCase();
      const payment = t.paymentType?.toUpperCase();
      const amount = parseFloat(t.amount || 0);

      // ⭐ CASE 1: PENDING → subtract only once per amount/payment pair
      if (txn === "PENDING") {
        const key = `${payment}_${amount}`;

        if (!pendingHandled[key]) {
          total -= amount; // subtract only ONCE
          pendingHandled[key] = true;
        }
        return;
      }

      // ⭐ CASE 2: PENDING_CLEARED → ignore completely
      if (txn === "PENDING_CLEARED") {
        return; // DO NOT add or subtract
      }
      if (payment === "PENDING" || payment === "EXP") {
        total += amount;
        pendingBalance += amount;
      }
    });
    const totalColor = pendingBalance > 0 ? "red" : "green";
    // ⭐ TOTAL DISPLAY (0 → NIL)
    const displayTotal = total === 0 ? "NIL" : `₹${total.toFixed(2)}`;
    tableBody.push([
      "",
      "",
      "",
      { text: "Total", bold: true },
      { text: displayTotal, bold: true, color: totalColor },
    ]);

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 100, 40, 100], // extra space for header & footer

      header: function (currentPage, pageCount) {
        if (currentPage !== 1) return {};
        return {
          margin: [40, 20, 20, 0],
          stack: [
            // 🎨 Gradient Background + Rounded Corners
            {
              canvas: [
                {
                  type: "rect",
                  x: 0,
                  y: 0,
                  w: 517, // adjust width to fit your PDF page
                  h: 50, // height of header (BIGGER header)
                  r: 5, // 🎉 rounded corners
                  linearGradient: ["#00255cff", "#002c63ff"], // 💙 GRADIENT BLUE
                },
              ],
              margin: [0, 0, 0, 0],
            },

            // TITLE + LOGO OVERLAYED ABOVE THE GRADIENT BAR
            {
              absolutePosition: { x: 50, y: 37 },
              width: 555,
              bold: true,
              alignment: "start",
              text: "Vettai Fastag Service Centre",
              style: "headerTitle",
              color: "white",
            },

            // LOGO RIGHT SIDE WITH WHITE BORDER
            {
              absolutePosition: { x: 400, y: 20 },
              stack: [
                // Rounded Shape (acts like rounded mask)
                {
                  canvas: [
                    {
                      type: "rect",
                      x: 70,
                      y: 5,
                      w: 60,
                      h: 40,
                      r: 2, // rounded corners
                      color: "#ffffff", // background (white)
                    },
                  ],
                },

                // Logo placed over the rounded background
                {
                  image: "logo",
                  width: 45,
                  height: 30,
                  alignment: "center",
                  margin: [20, -35, 0, 0], // overlays perfectly
                },
              ],
            },
          ],
        };
      },
      images: {
        // Replace with your base64 logo
        logo: logoBase64,
      },

      content: [
        { text: `Statement of Account`, style: "header", alignment: "center" },

        {
          table: {
            widths: ["33%", "33%", "33%"],

            body: [
              // 🔵 Header Row (Blue Background)
              [
                {
                  text: "Transport Name",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "From Date",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "To Date",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
              ],

              // Values Row
              [
                {
                  text: selectedTransportName || "--",
                  alignment: "center",
                  margin: [0, 3, 0, 3],
                },
                {
                  text: transportFromDate || "--",
                  alignment: "center",
                  margin: [0, 3, 0, 3],
                },
                {
                  text: transportToDate || "--",
                  alignment: "center",
                  margin: [0, 3, 0, 3],
                },
              ],
            ],
          },

          // TABLE STYLE
          layout: {
            fillColor: function (rowIndex) {
              return rowIndex === 0 ? "#0066cc" : null; // blue header
            },
            hLineWidth: function () {
              return 1;
            },
            vLineWidth: function () {
              return 1;
            },
            hLineColor: function () {
              return "#cccccc";
            },
            vLineColor: function () {
              return "#cccccc";
            },
            paddingTop: function () {
              return 6;
            },
            paddingBottom: function () {
              return 6;
            },
          },

          margin: [0, 10, 0, 20],
        },

        {
          table: {
            headerRows: 1,
            widths: ["20%", "20%", "20%", "20%", "20%"],
            body: [tableHeader, ...tableBody],
          },
          layout: { fillColor: (i) => (i === 0 ? "#840000f6" : null) },
        },
        {
          margin: [0, 20, 0, 0],
          stack: [
            {
              text: "***END OF STATEMENT***",
              alignment: "center",
              bold: true,
              fontSize: 11,
              margin: [0, 10, 20, 20],
            },
            {
              text: "* This is computer generated statement and hence does not require signature.",
              alignment: "left",
              fontSize: 10,
              margin: [0, 5, 0, 0],
            },
            {
              text: "* Customer Contact Center Number: 9751926006, 9943252055",
              alignment: "left",
              fontSize: 10,
              margin: [0, 5, 0, 20],
            },
            {
              text: `Generated On: ${new Date().toLocaleString()}`,
              alignment: "center",
              fontSize: 11,
              margin: [0, 5, 0, 0],
            },
          ],
        },
      ],
      styles: {
        header: {
          textAlign: "center",
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 10],
        },
        headerLeft: {
          fontSize: 18,
          bold: true,
          margin: [0, 10, 0, 0],
        },
        subHeader: {
          fontSize: 14,
          bold: true,
          margin: [0, 20, 0, 10],
        },
        tableHeader: {
          bold: true,
          color: "white",
        },
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`transport_${selectedTransportName}_${Date.now()}.pdf`);
  };

  const handleResetFilters = () => {
    setSearchVehicle("");
    setWorkerSearch("");
    setSelectedPaymentType("");
    setFromDate("");
    setToDate("");
    setSuggestions([]);
    setSelectedVehicle(null);
    setPendingSuggestion(null);
    setHighlightVehicle(null);

    Swal.fire({
      icon: "success",
      title: "Reset Successful!",
      text: "All search filters have been cleared.",
      timer: 1500,
      showConfirmButton: false,
    });
  };
  const handleShowTransportDetails = (transportName) => {
    setSelectedTransportName(transportName);

    const vehicles = transports
      .filter((t) => t.name === transportName)
      .map((t) => t.vehicle);

    let allTxns = transactions.filter((t) =>
      vehicles.includes(t.vehicleNumber)
    );

    // Reset dates when opening popup
    setTransportFromDate("");
    setTransportToDate("");

    setSelectedVehicleData(allTxns);
    setShowPopup(true);
  };
  useEffect(() => {
    fetch(vettailogo)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result);
        reader.readAsDataURL(blob);
      });
  }, []);

  // ------------ FILTER WORKER LOGIN RECORDS --------------
  const filteredWorkers = useMemo(() => {
    return records.filter((r) => {
      const matchWorker =
        !workerFilter.trim() ||
        r.worker?.toLowerCase().includes(workerFilter.toLowerCase());

      const matchShift = !shiftFilter || r.shiftType === shiftFilter;

      let matchDate = true;

      if (workerFromDate) {
        const from = new Date(workerFromDate);
        const login = new Date(r.loginTime);
        if (login < from) matchDate = false;
      }

      if (workerToDate) {
        const to = new Date(workerToDate);
        to.setHours(23, 59, 59, 999);
        const login = new Date(r.loginTime);
        if (login > to) matchDate = false;
      }

      return matchWorker && matchShift && matchDate;
    });
  }, [records, workerFilter, shiftFilter, workerFromDate, workerToDate]);

  // ------------ EXPORT PDF --------------
  // ----------------- Worker Export (download) -----------------
  const exportWorkerPDF = () => {
    if (!filteredWorkers.length) {
      Swal.fire("No Data", "No worker login records to export.", "warning");
      return;
    }

    // 2×2 info table
    const infoTableRow = [
      {
        stack: [
          { text: "Worker", bold: true, color: "white" },
          {
            text: workerFilter?.trim() || "--",
            margin: [0, 6, 0, 0],
            color: "black",
          },
        ],
        alignment: "center",
      },
      {
        stack: [
          { text: "Shift Type", bold: true, color: "white" },
          {
            text: shiftFilter?.trim() || "--",
            margin: [0, 6, 0, 0],
            color: "white",
          },
        ],
        alignment: "center",
      },
      {
        stack: [
          { text: "From Date", bold: true, color: "white" },
          {
            text: workerFromDate || "--",
            margin: [0, 6, 0, 0],
            color: "white",
          },
        ],
        alignment: "center",
      },
      {
        stack: [
          { text: "To Date", bold: true, color: "white" },
          { text: workerToDate || "--", margin: [0, 6, 0, 0], color: "white" },
        ],
        alignment: "center",
      },
    ];

    const workerTableBody = filteredWorkers.map((w) => [
      w.worker || "--",
      w.shiftType || "--",
      w.loginTime ? new Date(w.loginTime).toLocaleString() : "--",
      w.shiftCloseTime ? new Date(w.shiftCloseTime).toLocaleString() : "--",
    ]);

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 100, 40, 100],

      header: function (currentPage, pageCount) {
        if (currentPage !== 1) return {};
        return {
          margin: [40, 20, 20, 0],
          stack: [
            {
              canvas: [
                {
                  type: "rect",
                  x: 0,
                  y: 0,
                  w: 517,
                  h: 50,
                  r: 5,
                  linearGradient: ["#00255cff", "#002c63ff"],
                },
              ],
            },
            {
              absolutePosition: { x: 50, y: 37 },
              bold: true,
              text: "Vettai Fastag Service Centre",
              color: "white",
              fontSize: 18,
            },
            {
              absolutePosition: { x: 400, y: 20 },
              stack: [
                {
                  canvas: [
                    {
                      type: "rect",
                      x: 70,
                      y: 5,
                      w: 60,
                      h: 40,
                      r: 2,
                      color: "#ffffff",
                    },
                  ],
                },
                {
                  image: "logo",
                  width: 45,
                  height: 30,
                  alignment: "center",
                  margin: [20, -35, 0, 0],
                },
              ],
            },
          ],
        };
      },

      images: { logo: logoBase64 },

      content: [
        {
          text: "Statement of Account",
          alignment: "center",
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 10],
        },

        {
          table: {
            widths: ["25%", "25%", "25%", "25%"],
            body: [
              // ⭐ ROW 1 (BLUE)
              [
                {
                  text: "Worker",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "Shift Type",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "From Date",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "To Date",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
              ],

              // ⭐ ROW 2 (WHITE)
              [
                { text: workerFilter?.trim() || "--", alignment: "center" },
                { text: shiftFilter?.trim() || "--", alignment: "center" },
                { text: workerFromDate || "--", alignment: "center" },
                { text: workerToDate || "--", alignment: "center" },
              ],
            ],
          },

          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#0066cc" : null), // ⭐ Blue first row only
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => "#cccccc",
            vLineColor: () => "#cccccc",
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },

          margin: [0, 10, 0, 20],
        },

        {
          table: {
            headerRows: 1,
            widths: ["*", "*", "*", "*"],
            body: [
              [
                { text: "Worker", style: "tableHeader" },
                { text: "Shift", style: "tableHeader" },
                { text: "Login Time", style: "tableHeader" },
                { text: "Shift Close", style: "tableHeader" },
              ],
              ...workerTableBody,
            ],
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#34495e" : null),
          },
        },

        {
          margin: [0, 20, 0, 0],
          stack: [
            {
              text: "***END OF STATEMENT***",
              alignment: "center",
              bold: true,
              fontSize: 11,
              margin: [0, 10, 20, 20],
            },
            {
              text: "* This is computer generated statement and hence does not require signature.",
              fontSize: 10,
              margin: [0, 5, 0, 0],
            },
            {
              text: "* Customer Contact Center Number: 9751926006, 9943252055",
              fontSize: 10,
              margin: [0, 5, 0, 20],
            },
            {
              text: `Generated On: ${new Date().toLocaleString()}`,
              alignment: "center",
              fontSize: 11,
              margin: [0, 5, 0, 0],
            },
          ],
        },
      ],

      styles: {
        tableHeader: { bold: true, color: "white" },
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`worker_statement_${Date.now()}.pdf`);
  };

  // ----------------- Worker Preview (open inside modal) -----------------
  const previewWorkerPDF = () => {
    if (!filteredWorkers.length) {
      Swal.fire("No Data", "No worker login records to preview.", "warning");
      return;
    }

    const infoTableRow = [
      {
        stack: [
          { text: "Worker", bold: true, color: "white" },
          {
            text: workerFilter?.trim() || "--",
            margin: [0, 6, 0, 0],
            color: "black",
          },
        ],
        alignment: "center",
      },
      {
        stack: [
          { text: "Shift Type", bold: true, color: "white" },
          {
            text: shiftFilter?.trim() || "--",
            margin: [0, 6, 0, 0],
            color: "white",
          },
        ],
        alignment: "center",
      },
      {
        stack: [
          { text: "From Date", bold: true, color: "white" },
          {
            text: workerFromDate || "--",
            margin: [0, 6, 0, 0],
            color: "white",
          },
        ],
        alignment: "center",
      },
      {
        stack: [
          { text: "To Date", bold: true, color: "white" },
          { text: workerToDate || "--", margin: [0, 6, 0, 0], color: "white" },
        ],
        alignment: "center",
      },
    ];

    const workerTableBody = filteredWorkers.map((w) => [
      w.worker || "--",
      w.shiftType || "--",
      w.loginTime ? new Date(w.loginTime).toLocaleString() : "--",
      w.shiftCloseTime ? new Date(w.shiftCloseTime).toLocaleString() : "--",
    ]);

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 100, 40, 100],

      header: function (currentPage, pageCount) {
        if (currentPage !== 1) return {};
        return {
          margin: [40, 20, 20, 0],
          stack: [
            {
              canvas: [
                {
                  type: "rect",
                  x: 0,
                  y: 0,
                  w: 517,
                  h: 50,
                  r: 5,
                  linearGradient: ["#00255cff", "#002c63ff"],
                },
              ],
            },
            {
              absolutePosition: { x: 50, y: 37 },
              bold: true,
              text: "Vettai Fastag Service Centre",
              color: "white",
              fontSize: 18,
            },
            {
              absolutePosition: { x: 400, y: 20 },
              stack: [
                {
                  canvas: [
                    {
                      type: "rect",
                      x: 70,
                      y: 5,
                      w: 60,
                      h: 40,
                      r: 2,
                      color: "#ffffff",
                    },
                  ],
                },
                {
                  image: "logo",
                  width: 45,
                  height: 30,
                  alignment: "center",
                  margin: [20, -35, 0, 0],
                },
              ],
            },
          ],
        };
      },

      images: { logo: logoBase64 },

      content: [
        {
          text: "Statement of Account",
          alignment: "center",
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 10],
        },

        {
          table: {
            widths: ["25%", "25%", "25%", "25%"],
            body: [
              // ⭐ ROW 1 (BLUE)
              [
                {
                  text: "Worker",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "Shift Type",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "From Date",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
                {
                  text: "To Date",
                  bold: true,
                  color: "white",
                  alignment: "center",
                },
              ],

              // ⭐ ROW 2 (WHITE)
              [
                { text: workerFilter?.trim() || "--", alignment: "center" },
                { text: shiftFilter?.trim() || "--", alignment: "center" },
                { text: workerFromDate || "--", alignment: "center" },
                { text: workerToDate || "--", alignment: "center" },
              ],
            ],
          },

          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#0066cc" : null), // ⭐ Blue first row only
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => "#cccccc",
            vLineColor: () => "#cccccc",
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },

          margin: [0, 10, 0, 20],
        },

        {
          table: {
            headerRows: 1,
            widths: ["*", "*", "*", "*"],
            body: [
              [
                { text: "Worker", style: "tableHeader" },
                { text: "Shift", style: "tableHeader" },
                { text: "Login Time", style: "tableHeader" },
                { text: "Shift Close", style: "tableHeader" },
              ],
              ...workerTableBody,
            ],
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#34495e" : null),
          },
        },

        {
          margin: [0, 20, 0, 0],
          stack: [
            {
              text: "***END OF STATEMENT***",
              alignment: "center",
              bold: true,
              fontSize: 11,
              margin: [0, 10, 20, 20],
            },
            {
              text: "* This is computer generated statement and hence does not require signature.",
              fontSize: 10,
              margin: [0, 5, 0, 0],
            },
            {
              text: "* Customer Contact Center Number: 9751926006, 9943252055",
              fontSize: 10,
              margin: [0, 5, 0, 20],
            },
            {
              text: `Generated On: ${new Date().toLocaleString()}`,
              alignment: "center",
              fontSize: 11,
              margin: [0, 5, 0, 0],
            },
          ],
        },
      ],

      styles: {
        tableHeader: { bold: true, color: "white" },
      },
    };

    pdfMake.createPdf(docDefinition).getBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setWorkerPreviewUrl(url);
      setShowWorkerPreview(true);
    });
  };
  useEffect(() => {
    axios
      .get(`${API_URL}/api/auth/owner/shiftrecords`)
      .then((res) => setShiftRecords(res.data))
      .catch((err) => console.error(err));
  }, []);
  const previewShiftPDF = () => {
    const docDefinition = generateShiftPDF(selectedShift);
    pdfMake.createPdf(docDefinition).getBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setWorkerPreviewUrl(url);
      setShowWorkerPreview(true);
    });
  };

  const exportShiftPDF = () => {
    const docDefinition = generateShiftPDF(selectedShift);

    pdfMake
      .createPdf(docDefinition)
      .download(`worker_shift_${selectedShift.worker}_${Date.now()}.pdf`);
  };

  const generateShiftPDF = (shift) => {
    // ⭐ MUST BE HERE — TOP OF FUNCTION (GLOBAL TO PDF)
    const totalTransactionAmount = shift.transactions.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );

    return {
      pageSize: "A4",
      pageMargins: [40, 100, 40, 80],

      header: function (currentPage) {
        if (currentPage !== 1) return {};

        return {
          margin: [40, 20, 20, 0],
          stack: [
            {
              canvas: [
                {
                  type: "rect",
                  x: 0,
                  y: 0,
                  w: 517,
                  h: 50,
                  r: 5,
                  linearGradient: ["#00255cff", "#002c63ff"],
                },
              ],
            },

            {
              absolutePosition: { x: 50, y: 37 },
              text: "Vettai Fastag Service Centre",
              style: "headerTitle",
              color: "white",
            },

            {
              absolutePosition: { x: 400, y: 20 },
              stack: [
                {
                  canvas: [
                    {
                      type: "rect",
                      x: 70,
                      y: 5,
                      w: 60,
                      h: 40,
                      r: 2,
                      color: "white",
                    },
                  ],
                },
                {
                  image: "logo",
                  width: 45,
                  height: 30,
                  alignment: "center",
                  margin: [20, -35, 0, 0],
                },
              ],
            },
          ],
        };
      },

      images: {
        logo: logoBase64,
      },

      content: [
        { text: `Statement of Account`, style: "header", alignment: "center" },

        // WORKER / SHIFT / DATE TABLE
        {
          table: {
            widths: ["33%", "33%", "33%"],
            body: [
              [
                { text: "Worker", bold: true },
                { text: "Shift Type", bold: true },
                { text: "Date", bold: true },
              ],
              [
                shift.worker || "--",
                shift.shiftType || "--",
                new Date(
                  shift.date || shift.loginTime || Date.now()
                ).toLocaleString(),
              ],
            ],
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#0066cc" : null),
          },
          margin: [0, 10, 0, 10],
        },

        // BANK BALANCES
        { text: "Bank Balances", style: "subheader" },
        {
          table: {
            headerRows: 1,
            widths: ["33%", "33%", "33%"],
            body: [
              [
                { text: "Bank", color: "white", bold: true },
                { text: "Account", color: "white", bold: true },
                { text: "Balance", color: "white", bold: true },
              ],
              ...shift.bankBalances.map((b) => [
                b.name,
                b.account || "--",
                { text: `₹${b.balance || 0}`, bold: true },
              ]),
            ],
          },
          layout: { fillColor: (i) => (i === 0 ? "#0066cc" : null) },
          margin: [0, 0, 0, 10],
        },

        // TOTALS BY PAYMENT TYPE
        { text: "Totals by Payment Type", style: "subheader" },
        {
          table: {
            headerRows: 1,
            widths: ["50%", "50%"],
            body: [
              [
                { text: "Type", bold: true, color: "white" },
                { text: "Total", bold: true, color: "white" },
              ],
              ...Object.entries(shift.totalsByPaymentType).map(([t, v]) => [
                t,
                { text: `₹${v}`, bold: true },
              ]),
            ],
          },
          layout: { fillColor: (i) => (i === 0 ? "#840000f6" : null) },
          margin: [0, 0, 0, 10],
        },

        // TRANSACTIONS
        { text: "Transactions", style: "subheader" },
        {
          table: {
            headerRows: 1,
            widths: ["25%", "25%", "25%", "25%"],
            body: [
              [
                { text: "Vehicle", bold: true, color: "white" },
                { text: "Type", bold: true, color: "white" },
                { text: "Payment", bold: true, color: "white" },
                { text: "Amount", bold: true, color: "white" },
              ],

              ...shift.transactions.map((t) => [
                t.vehicleNumber,
                t.transactionType,
                t.paymentType,
                { text: `₹${t.amount}`, bold: true },
              ]),

              // ⭐ TOTAL ROW (NOW WORKING)
              [
                { text: "", colSpan: 2 },
                {},
                { text: "Total", bold: true },
                {
                  text: `₹${totalTransactionAmount.toFixed(2)}`,
                  bold: true,
                },
              ],
            ],
          },
          layout: { fillColor: (i) => (i === 0 ? "#0066cc" : null) },
        },

        // FOOTER
        {
          margin: [0, 20, 0, 0],
          stack: [
            {
              text: "***END OF SHIFT SUMMARY***",
              alignment: "center",
              bold: true,
            },
            {
              text: "Generated On: " + new Date().toLocaleString(),
              alignment: "center",
              fontSize: 10,
              margin: [0, 5, 0, 0],
            },
          ],
        },
      ],

      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        headerTitle: { fontSize: 20, bold: true },
        subheader: { fontSize: 15, bold: true, margin: [0, 10, 0, 5] },
      },
    };
  };
  const formatForInput = (date) => {
    const d = new Date(date);
    return d.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
  };
  // When clicking a date cell
  const handleStartEdit = (currentDate, index) => {
    setEditingDateIndex(index);
    setTempDate(formatForInput(currentDate));
  };

  // When clicking OK button
  const handleConfirmDate = async (index) => {
    const newDate = tempDate;

    // Update UI instantly
    setSelectedVehicleData((prev) => {
      const updated = [...prev];
      updated[index].createdAt = newDate;
      return updated;
    });

    setEditingDateIndex(null); // close edit mode

    // OPTIONAL: Update backend
    try {
      await axios.put(`${API_URL}/api/transactions/updateDate`, {
        id: selectedVehicleData[index]._id,
        createdAt: newDate,
      });
      Swal.fire({
        icon: "success",
        title: "Date updated",
        timer: 2000,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to update date",
        timer: 2000,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
      });
      console.error(err);
    }
  };

  return (
    <div className="container mt-5 mb-2">
      {/* Search & Filters */}
      <div
        className="p-4 rounded shadow-lg mb-5"
        style={{ background: "#E8F6F3", transition: "all 0.3s ease" }}
      >
        <h2 className="fw-bold mb-3 align-items-center gap-2 text-black">
          <FaTruckLoading /> Add Transport
        </h2>

        <div className="d-flex flex-wrap gap-3">
          <input
            type="text"
            className="form-control form-control-lg"
            placeholder="Enter Transport Name"
            value={transportName}
            onChange={(e) => setTransportName(e.target.value)}
            required
          />

          <input
            type="text"
            className="form-control form-control-lg"
            placeholder="Enter Vehicle Number"
            value={transportVehicle}
            onChange={(e) => setTransportVehicle(e.target.value)}
            required
          />

          <button
            className="btn btn-primary btn-lg d-flex align-items-center gap-2 w-50 justify-content-center fw-bolder m-auto"
            onClick={handleAddTransport}
          >
            <FaPlus size={20} /> Add
          </button>
        </div>

        {transports.length > 0 ? (
          <table className="table table-bordered table-hover mt-4">
            <thead className="table-dark">
              <tr>
                <th>Transport Name</th>
                <th>Vehicle Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                transports.reduce((acc, item) => {
                  if (!acc[item.name]) acc[item.name] = [];
                  acc[item.name].push(item.vehicle);
                  return acc;
                }, {})
              ).map(([name, vehicles], i) => (
                <React.Fragment key={i}>
                  {vehicles.map((vehicle, index) => (
                    <tr key={index}>
                      {index === 0 && (
                        <td
                          rowSpan={vehicles.length}
                          className="fw-bold align-middle text-center"
                          style={{ cursor: "pointer" }}
                          onClick={() => handleShowTransportDetails(name)}
                        >
                          {name}
                        </td>
                      )}
                      <td
                        className="fw-bold align-middle text-center"
                        style={{
                          cursor: "pointer",
                          color: "#0078ff",
                          textDecoration: "underline",
                        }}
                        onClick={() => handleShowPopup(vehicle)}
                      >
                        {vehicle}
                      </td>
                      <td className="text-center d-flex justify-content-center align-items-center">
                        <button
                          className="btn btn-outline-primary btn-sm m-2"
                          onClick={() => handleOpenAddVehiclePopup(name)}
                        >
                          <FaPlus />
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm m-2"
                          onClick={() => removeTransport(name, vehicle)}
                        >
                          <FaTrash size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center fw-bolder text-danger mt-4">
            NO TRANSPORTS ADDED!
          </p>
        )}

        {showAddVehiclePopup && (
          <div
            className="popup-overlay"
            onClick={(e) => {
              if (e.target.classList.contains("popup-overlay"))
                setShowAddVehiclePopup(false);
            }}
          >
            <div className="popup-card">
              <h4 className="fw-bold mb-3 text-center text-primary">
                Add Vehicle to{" "}
                <span className="text-dark">{currentTransportName}</span>
              </h4>
              <input
                type="text"
                className="form-control form-control-lg mb-3"
                placeholder="Enter vehicle number"
                value={newVehicleInput}
                onChange={(e) => setNewVehicleInput(e.target.value)}
                autoFocus
              />
              <div className="d-flex justify-content-center gap-3">
                <button
                  className="btn btn-success btn-lg px-4"
                  onClick={handleAddVehicleToTransport}
                >
                  Add
                </button>
                <button
                  className="btn btn-secondary btn-lg px-4"
                  onClick={() => setShowAddVehiclePopup(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showPopup && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
            }}
          >
            <div
              className="card p-4"
              style={{ width: "600px", maxHeight: "90vh", overflowY: "auto" }}
            >
              <h4 className="mb-3">Transaction Details</h4>
              {selectedVehicleData.length > 0 ? (
                (() => {
                  // ⭐ SORT ASCENDING — oldest first, newest last
                  // ⭐ REMOVE PENDING_CLEARED ROWS + SORT ASC
                  const sortedPopupData = selectedVehicleData
                    .filter(
                      (txn) =>
                        txn.transactionType?.toUpperCase() !== "PENDING_CLEARED"
                    )
                    .sort(
                      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                    );

                  return (
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Vehicle Number</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Payment</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPopupData.map((txn, i) => {
                          const pay = txn.paymentType?.toUpperCase();

                          const amountColor =
                            pay === "CASH" || pay === "GPAY/PHONE PAY"
                              ? "green"
                              : pay === "PENDING" || pay === "EXP"
                              ? "red"
                              : "black";

                          return (
                            <tr key={i}>
                              <td>{txn.vehicleNumber}</td>
                              <td style={{ cursor: "pointer" }}>
                                {editingDateIndex === i ? (
                                  <div
                                    className="d-flex align-items-center gap-2"
                                    style={{ minWidth: "260px" }}
                                  >
                                    {/* Editable date input */}
                                    <input
                                      type="datetime-local"
                                      className="form-control form-control-sm"
                                      style={{ width: "65%" }}
                                      value={tempDate}
                                      onChange={(e) =>
                                        setTempDate(e.target.value)
                                      }
                                      autoFocus
                                    />

                                    {/* OK BUTTON */}
                                    <button
                                      className="btn btn-success btn-sm px-3"
                                      style={{ fontWeight: "bold" }}
                                      onClick={() => handleConfirmDate(i)}
                                    >
                                      ✓
                                    </button>

                                    {/* CANCEL BUTTON */}
                                    <button
                                      className="btn btn-outline-danger btn-sm px-3"
                                      style={{ fontWeight: "bold" }}
                                      onClick={() => setEditingDateIndex(null)}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <span
                                    onClick={() =>
                                      handleStartEdit(txn.createdAt, i)
                                    }
                                    style={{
                                      display: "inline-block",
                                      width: "100%",
                                    }}
                                  >
                                    {new Date(txn.createdAt).toLocaleString()}
                                  </span>
                                )}
                              </td>

                              <td>{txn.transactionType}</td>
                              <td>{txn.paymentType}</td>
                              <td
                                style={{
                                  color: amountColor,
                                  fontWeight: "bold",
                                }}
                              >
                                ₹{parseFloat(txn.amount).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()
              ) : (
                <p>No transactions found.</p>
              )}

              {/* DATE FILTERS */}
              <div className="d-flex gap-3 mb-3">
                <div className="flex-grow-1">
                  <label className="form-label fw-bold">From Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={transportFromDate}
                    required
                    onChange={(e) => {
                      setTransportFromDate(e.target.value);

                      // Apply filter live
                      const vehicles = transports
                        .filter((t) => t.name === selectedTransportName)
                        .map((t) => t.vehicle);

                      let filtered = transactions.filter(
                        (t) =>
                          vehicles.includes(t.vehicleNumber) &&
                          t.transactionType?.toUpperCase() !== "PENDING_CLEARED"
                      );

                      if (e.target.value) {
                        const from = new Date(e.target.value);
                        filtered = filtered.filter(
                          (txn) => new Date(txn.createdAt) >= from
                        );
                      }

                      if (transportToDate) {
                        const to = new Date(transportToDate);
                        to.setHours(23, 59, 59, 999);
                        filtered = filtered.filter(
                          (txn) => new Date(txn.createdAt) <= to
                        );
                      }

                      setSelectedVehicleData(filtered);
                    }}
                  />
                </div>

                <div className="flex-grow-1">
                  <label className="form-label fw-bold">To Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={transportToDate}
                    min={transportFromDate}
                    required
                    onChange={(e) => {
                      setTransportToDate(e.target.value);

                      const vehicles = transports
                        .filter((t) => t.name === selectedTransportName)
                        .map((t) => t.vehicle);

                      let filtered = transactions.filter((t) =>
                        vehicles.includes(t.vehicleNumber)
                      );

                      if (transportFromDate) {
                        const from = new Date(transportFromDate);
                        filtered = filtered.filter(
                          (txn) => new Date(txn.createdAt) >= from
                        );
                      }

                      if (e.target.value) {
                        const to = new Date(e.target.value);
                        to.setHours(23, 59, 59, 999);
                        filtered = filtered.filter(
                          (txn) => new Date(txn.createdAt) <= to
                        );
                      }

                      setSelectedVehicleData(filtered);
                    }}
                  />
                </div>
              </div>

              <div className="d-flex justify-content-between mt-3">
                {/* Export PDF Button */}
                <button
                  className="btn btn-danger me-3"
                  onClick={handleTransportExportPDF}
                >
                  <FaFilePdf className="me-2" />
                  Export PDF
                </button>

                {/* Close Button */}
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPopup(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <h2>Search Vehicle Number</h2>

      <div
        className="mb-4 position-relative mt-3 d-flex flex-column"
        ref={inputRef}
      >
        <div className="mb-4 position-relative mt-3 p-3 bg-light rounded shadow-sm">
          {/* Row 1 */}
          <div className="mb-3 mt-4">
            <label className="form-label fw-bold">
              <FaUserAlt className="mb-1 me-2 text-primary" />
              Search Worker
            </label>
            <input
              type="text"
              className="form-control form-control-lg shadow-sm"
              placeholder="Enter worker name..."
              value={workerSearch}
              onChange={(e) => setWorkerSearch(e.target.value)}
            />
          </div>
          <div className="d-flex flex-wrap mb-3 gap-3">
            <div
              className="flex-grow-1 position-relative"
              ref={vehicleWrapperRef}
              style={{ minWidth: 0 }}
            >
              <label className="form-label fw-bold d-flex align-items-center">
                <FaSearch className="me-2 text-primary" /> Vehicle Number
              </label>
              <input
                type="text"
                className="form-control form-control-lg shadow-sm"
                placeholder="Enter Vehicle Number..."
                value={searchVehicle}
                onChange={(e) => setSearchVehicle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter"}
                style={{ transition: "all 0.3s ease-in-out" }}
              />
              {searchVehicle && suggestions.length > 0 && (
                <ul
                  className="list-group position-absolute shadow-sm"
                  style={{
                    zIndex: 1000,
                    top: "calc(100% + 8px)",
                    left: 0,
                    width: "100%",
                    maxWidth: "400px",
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

          <div className="d-flex flex-wrap mb-2 gap-3">
            {/* From Date */}
            <div className="flex-grow-1 position-relative">
              <label className="form-label fw-bold d-flex align-items-center">
                <FaCalendarAlt className="me-2 text-warning" /> From Date
              </label>
              <input
                type="date"
                className="form-control form-control-lg shadow-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            {/* To Date */}
            <div className="flex-grow-1 position-relative">
              <label className="form-label fw-bold d-flex align-items-center">
                <FaCalendarAlt className="me-2 text-warning" /> To Date
              </label>
              <input
                type="date"
                className="form-control form-control-lg shadow-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate} // prevents selecting wrong range
              />
            </div>
          </div>
          <div className="flex-grow-1 d-flex justify-content-end mt-3">
            <button
              className="btn btn-info btn-lg w-100 d-flex align-items-center justify-content-center gap-2 shadow-lg mb-3"
              onClick={handlePreviewPDF}
            >
              <FaFilePdf /> Preview
            </button>
          </div>
          <div className="flex-grow-1 d-flex justify-content-end ">
            {showPdfPreview && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 99999,
                }}
              >
                <div
                  style={{
                    width: "80%",
                    height: "90%",
                    background: "white",
                    borderRadius: "10px",
                    overflow: "hidden",
                    boxShadow: "0px 0px 20px rgba(0,0,0,0.4)",
                    position: "relative",
                  }}
                >
                  {/* PDF Preview Frame */}
                  <iframe
                    src={pdfBlobUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                    title="PDF Preview"
                  ></iframe>
                  {/* Close Button */}
                  <button
                    onClick={() => setShowPdfPreview(false)}
                    style={{
                      position: "absolute",
                      bottom: "-10px",
                      right: "0px",
                      zIndex: 10000,
                    }}
                    className="btn btn-danger btn-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

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
          <button
            className="btn btn-secondary btn-lg w-100 mt-2 d-flex align-items-center justify-content-center gap-2 shadow"
            onClick={handleResetFilters}
            style={{ transition: "transform 0.2s, box-shadow 0.3s" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            🔄 Reset
          </button>
        </div>
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
        {sortedTransactions.length === 0 ? (
          <div className="text-center fw-bolder text-danger py-4 fs-5">
            TRANSACTIONS NOT FOUND!
          </div>
        ) : (
          <table
            className="table table-bordered table-hover mb-0"
            ref={tableRef}
          >
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
                  txnDate &&
                  txnDate.toDateString() === new Date().toDateString();
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
        )}
      </div>
      <h2 className="mt-5">Worker Login Details</h2>
      <div className="p-3 bg-light rounded shadow-sm mb-3">
        <div className="row g-3">
          {/* Worker Name */}
          <div className="col-md-3">
            <label className="fw-bold">Worker Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search worker..."
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
            />
          </div>

          {/* Shift Type */}
          <div className="col-md-3">
            <label className="fw-bold">Shift Type</label>
            <select
              className="form-select"
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="DAY">DAY</option>
              <option value="NIGHT">NIGHT</option>
            </select>
          </div>

          {/* From Date */}
          <div className="col-md-3">
            <label className="fw-bold">From Date</label>
            <input
              type="date"
              className="form-control"
              value={workerFromDate}
              onChange={(e) => setWorkerFromDate(e.target.value)}
            />
          </div>

          {/* To Date */}
          <div className="col-md-3">
            <label className="fw-bold">To Date</label>
            <input
              type="date"
              className="form-control"
              value={workerToDate}
              onChange={(e) => setWorkerToDate(e.target.value)}
              min={workerFromDate}
            />
          </div>
        </div>

        <div className="d-flex gap-3 mt-3">
          <button
            className="btn btn-info w-50 btn-lg d-flex align-items-center justify-content-center gap-2 shadow-lg"
            onClick={previewWorkerPDF}
          >
            <FaFilePdf />
            Preview
          </button>

          <button
            className="btn btn-danger btn-lg w-50 d-flex align-items-center justify-content-center gap-2 shadow-lg"
            onClick={exportWorkerPDF}
          >
            <FaFilePdf /> Export PDF
          </button>
        </div>
        {showWorkerPreview && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                width: "80%",
                height: "90%",
                background: "white",
                borderRadius: "10px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <iframe
                src={workerPreviewUrl}
                style={{ width: "100%", height: "100%", border: "none" }}
              ></iframe>

              <button
                className="btn btn-danger"
                onClick={() => setShowWorkerPreview(false)}
                style={{
                  position: "absolute",
                  width: "100%",
                  bottom: "-10px",
                  right: "0px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        <table className="table table-bordered table-hover mb-4">
          <thead className="table-dark">
            <tr>
              <th>Worker</th>
              <th>Shift Type</th>
              <th>Login Time</th>
              <th>Shift Close Time</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-danger fw-bold">
                  No shift records found
                </td>
              </tr>
            ) : (
              records.map((s, i) => (
                <tr key={i}>
                  <td
                    style={{ cursor: "pointer", color: "blue" }}
                    onClick={() => {
                      const isSameDate = (d1, d2) => {
                        const date1 = new Date(d1).toISOString().split("T")[0];
                        const date2 = new Date(d2).toISOString().split("T")[0];
                        return date1 === date2;
                      };

                      const rec = shiftRecords.find(
                        (r) =>
                          r.worker === s.worker &&
                          r.shiftType === s.shiftType &&
                          isSameDate(r.loginTime, s.loginTime)
                      );

                      if (!rec) {
                        console.log("NO MATCH FOUND FOR:", s);
                        return;
                      }

                      setSelectedShift(rec);
                      setSelectedShiftIndex(i + 1);
                      setShowShiftPopup(true);
                    }}
                  >
                    {s.worker}
                  </td>

                  <td>
                    <span
                      className={`badge ${
                        s.shiftType === "DAY" ? "bg-primary" : "bg-dark"
                      }`}
                      style={{ fontSize: "1rem" }}
                    >
                      {s.shiftType}
                    </span>
                  </td>

                  <td>
                    {s.loginTime
                      ? new Date(s.loginTime).toLocaleString()
                      : "--"}
                  </td>
                  <td>
                    {s.shiftCloseTime
                      ? new Date(s.shiftCloseTime).toLocaleString()
                      : "--"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showShiftPopup && selectedShift && (
        <div className="shift-popup-overlay">
          <div className="shift-popup-card">
            <h3 className="text-center fw-bold mb-3 popup-title">
              Shift Details – S.No {selectedShiftIndex}
            </h3>

            <h5 className="section-title text-center mb-3">
              {selectedShift.worker} ({selectedShift.shiftType})
            </h5>

            {/* Bank Balances */}
            <h5 className="section-title">Bank Balances</h5>
            <div className="table-responsive">
              <table className="table table-bordered table-striped popup-table">
                <thead className="table-dark">
                  <tr>
                    <th>Bank</th>
                    <th>Account</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedShift.bankBalances.map((b, i) => (
                    <tr key={i}>
                      <td>{b.name}</td>
                      <td>{b.account || "--"}</td>
                      <td className="amount-green">₹{b.balance || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <h5 className="section-title">Totals by Payment Type</h5>
            <div className="table-responsive">
              <table className="table table-bordered popup-table">
                <tbody>
                  {Object.entries(selectedShift.totalsByPaymentType).map(
                    ([k, v], i) => (
                      <tr key={i}>
                        <td className="fw-bold">{k}</td>
                        <td className={v > 0 ? "amount-green" : "amount-red"}>
                          ₹{v}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Transactions */}
            <h5 className="section-title">Transactions</h5>
            <div className="table-responsive">
              <table className="table table-striped popup-table">
                <thead className="table-primary">
                  <tr>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Payment</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedShift.transactions.map((t, i) => {
                    const pay = t.paymentType?.toUpperCase();
                    const color =
                      pay === "CASH" || pay === "GPAY/PHONE PAY"
                        ? "amount-green"
                        : "amount-red";

                    return (
                      <tr key={i}>
                        <td>{t.vehicleNumber}</td>
                        <td>{t.transactionType}</td>
                        <td>{t.paymentType}</td>
                        <td className={color}>₹{t.amount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between mt-4">
              <button
                className="btn btn-danger btn-lg w-50 mx-1"
                onClick={exportShiftPDF}
              >
                Export PDF
              </button>
              <button
                className="btn btn-secondary btn-lg w-50 mx-1"
                onClick={() => setShowShiftPopup(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
