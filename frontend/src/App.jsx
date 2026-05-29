import { useState, useEffect } from "react";
import axios from "axios";
import {
    LayoutDashboard,
    ListFilter,
    PlusCircle,
    UploadCloud,
    DollarSign,
    Coins,
    Banknote,
    Menu,
    X
} from "lucide-react";

import NewPrediction from "./components/NewPrediction";
import BatchProcess from "./components/BatchProcess";
import ReviewQueue from "./components/ReviewQueue";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import TransactionInspector from "./components/TransactionInspector";

import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const EMPTY_FORM = {
    Amount: "",
    ...Object.fromEntries(Array.from({ length: 28 }, (_, i) => [`V${i + 1}`, ""])),
};

const PCA_KEYS = Array.from({ length: 28 }, (_, i) => `V${i + 1}`);

export default function App() {
    const [activeTab, setActiveTab] = useState("new");
    const [sidebarOpen, setSidebarOpen] = useState(false);



    // Dashboard states
    const [stats, setStats] = useState({
        total_volume: 0,
        overall_fraud_rate: 0,
        pending_reviews: 0,
        false_positive_ratio: 0,
        average_resolution_time: 0,
        timeline: [],
        class_breakdown: { Normal: 0, Fraud: 0 },
        global_importances: [],
        latest_fraud_explanation: null
    });

    // Transaction Table states
    const [transactions, setTransactions] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [minAmount, setMinAmount] = useState("");
    const [maxAmount, setMaxAmount] = useState("");

    // New Transaction Form states
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [loadingForm, setLoadingForm] = useState(false);
    const [errorBanner, setErrorBanner] = useState("");

    // Batch states
    const [batchFile, setBatchFile] = useState(null);
    const [batchError, setBatchError] = useState("");
    const [batchTask, setBatchTask] = useState(null);
    const [downloadTaskId, setDownloadTaskId] = useState(null);
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchStatus, setBatchStatus] = useState("");
    const [batchProcessedCount, setBatchProcessedCount] = useState(0);
    const [batchTotalCount, setBatchTotalCount] = useState(0);

    // Drawer Inspector State
    const [selectedTx, setSelectedTx] = useState(null);

    // Refresh stats & queue
    const refreshAllData = async () => {
        try {
            // 1. Fetch metrics
            const statsRes = await axios.get(`${API_BASE_URL}/dashboard/stats`);
            setStats(statsRes.data);

            // 2. Fetch current page of queue
            fetchQueue();
        } catch (err) {
            console.error("Failed to load dashboard statistics:", err);
        }
    };

    const fetchQueue = async () => {
        try {
            const params = {
                page,
                limit: 15,
            };
            if (statusFilter) params.status = statusFilter;
            if (minAmount) params.min_amount = parseFloat(minAmount);
            if (maxAmount) params.max_amount = parseFloat(maxAmount);

            const res = await axios.get(`${API_BASE_URL}/transactions`, { params });
            setTransactions(res.data.items);
            setTotalCount(res.data.total_count);
        } catch (err) {
            console.error("Failed to load transactions queue:", err);
        }
    };

    // Run on mount & tab changes
    useEffect(() => {
        document.documentElement.classList.remove("dark");
        refreshAllData();
    }, [page, statusFilter, activeTab]);

    // Handle transaction queue filter submissions
    const handleFilterReset = () => {
        setStatusFilter("");
        setMinAmount("");
        setMaxAmount("");
        setPage(1);
    };

    // Handle single transaction field change
    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value === "" ? "" : parseFloat(value)
        }));
    };

    // Autofill form with realistic test data
    const handleAutofillMock = (options = {}) => {
        if (options && options.clear) {
            setFormData(EMPTY_FORM);
            setErrorBanner("");
            return;
        }
        const randomAmount = (Math.random() * 800 + 5).toFixed(2);
        const mockData = {
            Amount: parseFloat(randomAmount),
            ...Object.fromEntries(
                PCA_KEYS.map((k) => [
                    k,
                    parseFloat(((Math.random() - 0.5) * 4).toFixed(4))
                ])
            )
        };
        if (Math.random() > 0.6) {
            mockData["V14"] = parseFloat((-4 - Math.random() * 6).toFixed(4));
            mockData["V17"] = parseFloat((-3 - Math.random() * 5).toFixed(4));
        }
        setFormData(mockData);
        setErrorBanner("");
    };

    // Submit manual transaction
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (formData.Amount === "") {
            setErrorBanner("Transaction Amount is required.");
            return;
        }

        setLoadingForm(true);
        setErrorBanner("");
        try {
            const res = await axios.post(`${API_BASE_URL}/predict`, formData);
            setSelectedTx(res.data);
            setFormData(EMPTY_FORM);
            refreshAllData();
        } catch (err) {
            setErrorBanner("Server did not respond. Check your API server connection.");
        } finally {
            setLoadingForm(false);
        }
    };

    // Status transitions from Review Panel
    const handleUpdateStatus = async (txId, newStatus) => {
        try {
            const res = await axios.post(`${API_BASE_URL}/transactions/${txId}/status`, {
                status: newStatus,
                actor: "System Analyst"
            });

            if (res.data.success) {
                if (selectedTx && selectedTx.id === txId) {
                    setSelectedTx((prev) => ({ ...prev, status: newStatus }));
                }
                refreshAllData();
            }
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    // CSV Drag-and-Drop Batch Uploader
    const handleCsvSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBatchFile(file);
        setBatchError("");
        setBatchStatus("");
        setBatchProgress(0);
        setBatchProcessedCount(0);
        setBatchTotalCount(0);
        setDownloadTaskId(null);
    };

    const handleBatchUpload = () => {
        if (!batchFile) return;

        setBatchError("");
        setBatchStatus("pending");
        setBatchProgress(0);
        setDownloadTaskId(null);

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const text = ev.target.result;
                const lines = text.trim().split(/\r?\n/);
                if (lines.length < 2) throw new Error("CSV must contain headers and records");

                const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
                const missing = ["Amount", ...PCA_KEYS].filter((k) => !headers.includes(k));
                if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);

                const transactionsList = [];
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    const values = lines[i].split(",").map((v) => v.replace(/^"|"$/g, "").trim());
                    const row = {};
                    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });

                    transactionsList.push({
                        Amount: row.Amount === "" ? 0.0 : parseFloat(row.Amount),
                        ...Object.fromEntries(PCA_KEYS.map((k) => [k, row[k] === "" ? 0.0 : parseFloat(row[k])]))
                    });
                }

                const res = await axios.post(`${API_BASE_URL}/predict_batch`, transactionsList);
                setBatchTask(res.data.task_id);
                setDownloadTaskId(res.data.task_id);
                setBatchTotalCount(res.data.total_records);
                setBatchProcessedCount(0);
            } catch (err) {
                setBatchError(err.message || "Failed to parse CSV file");
                setBatchStatus("");
            }
        };
        reader.readAsText(batchFile);
    };

    // Poll background task progress
    useEffect(() => {
        let intervalId;
        if (batchTask) {
            intervalId = setInterval(async () => {
                try {
                    const res = await axios.get(`${API_BASE_URL}/batch/status/${batchTask}`);
                    setBatchStatus(res.data.status);
                    setBatchProgress(res.data.progress_percent);
                    setBatchProcessedCount(res.data.processed_records);

                    if (res.data.status === "completed" || res.data.status === "failed") {
                        clearInterval(intervalId);
                        setBatchTask(null);
                        refreshAllData();
                    }
                } catch (err) {
                    console.error("Error polling batch status:", err);
                    clearInterval(intervalId);
                    setBatchTask(null);
                }
            }, 1000);
        }
        return () => clearInterval(intervalId);
    }, [batchTask]);

    return (
        <div className="app-container">
            {/* Sidebar Navigation Panel */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

            {/* Mobile Header Bar */}
            <div className="mobile-header">
                <button type="button" className="btn-menu-toggle" onClick={() => setSidebarOpen(true)}>
                    <Menu size={20} strokeWidth={2} />
                </button>
                <span className="mobile-brand-name">FRAUDGUARD</span>
            </div>

            <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="sidebar-mobile-header">
                    <button type="button" className="btn-menu-close" onClick={() => setSidebarOpen(false)}>
                        <X size={20} strokeWidth={2} />
                    </button>
                </div>

                <div className="brand">
                    <div className="brand-logo">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <div className="brand-text">
                        <h1 className="brand-name">FRAUDGUARD</h1>
                    </div>
                </div>

                <nav className="nav-menu">
                    <div
                        className={`nav-item ${activeTab === "new" ? "active" : ""}`}
                        onClick={() => { setActiveTab("new"); setSidebarOpen(false); }}
                    >
                        <PlusCircle className="nav-icon" size={18} strokeWidth={2} />
                        <span>New Prediction</span>
                    </div>

                    <div
                        className={`nav-item ${activeTab === "batch" ? "active" : ""}`}
                        onClick={() => { setActiveTab("batch"); setSidebarOpen(false); }}
                    >
                        <UploadCloud className="nav-icon" size={18} strokeWidth={2} />
                        <span>Batch Process</span>
                    </div>

                    <div
                        className={`nav-item ${activeTab === "queue" ? "active" : ""}`}
                        onClick={() => { setActiveTab("queue"); setSidebarOpen(false); }}
                    >
                        <ListFilter className="nav-icon" size={18} strokeWidth={2} />
                        <span>Review Queue</span>
                        {stats.pending_reviews > 0 && (
                            <span className="badge pending-review" style={{ marginLeft: "auto", fontSize: "10px", padding: "2px 6px" }}>
                                {stats.pending_reviews}
                            </span>
                        )}
                    </div>

                    <div
                        className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                        onClick={() => { setActiveTab("dashboard"); setSidebarOpen(false); }}
                    >
                        <LayoutDashboard className="nav-icon" size={18} strokeWidth={2} />
                        <span>Analytics Dashboard</span>
                    </div>
                </nav>

                <footer className="sidebar-footer">
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px", fontWeight: 500 }}>
                        <span className="status-indicator"></span>
                        <span>System Online</span>
                    </div>
                </footer>
            </aside>

            {/* Main Workspace Frame */}
            <main className="main-content">
                {/* Subtle watermark background decorations */}
                <div className="workspace-decorations">
                    <div className="watermark-item top-right">
                        <DollarSign size={160} strokeWidth={1} />
                    </div>
                    <div className="watermark-item mid-left">
                        <Banknote size={140} strokeWidth={1} />
                    </div>
                    <div className="watermark-item bottom-right">
                        <Coins size={150} strokeWidth={1} />
                    </div>
                    <div className="watermark-item top-left-decor">
                        <Coins size={110} strokeWidth={1} />
                    </div>
                    <div className="watermark-item mid-right-decor">
                        <DollarSign size={130} strokeWidth={1} />
                    </div>
                    <div className="watermark-item bottom-left-decor">
                        <Banknote size={120} strokeWidth={1} />
                    </div>
                </div>

                {/* VIEW 1: MANUAL INFERENCE FORM */}
                {activeTab === "new" && (
                    <NewPrediction
                        formData={formData}
                        handleFieldChange={handleFieldChange}
                        handleAutofillMock={handleAutofillMock}
                        handleFormSubmit={handleFormSubmit}
                        onClear={() => handleAutofillMock({ clear: true })}
                        loadingForm={loadingForm}
                        errorBanner={errorBanner}
                        PCA_KEYS={PCA_KEYS}
                    />
                )}

                {/* VIEW 2: BATCH CSV PROCESSOR */}
                {activeTab === "batch" && (
                    <BatchProcess
                        batchFile={batchFile}
                        batchError={batchError}
                        batchStatus={batchStatus}
                        batchProgress={batchProgress}
                        batchProcessedCount={batchProcessedCount}
                        batchTotalCount={batchTotalCount}
                        handleCsvSelect={handleCsvSelect}
                        handleBatchUpload={handleBatchUpload}
                        API_BASE_URL={API_BASE_URL}
                        batchTask={downloadTaskId}
                    />
                )}

                {/* VIEW 3: INCIDENT REVIEW QUEUE */}
                {activeTab === "queue" && (
                    <ReviewQueue
                        transactions={transactions}
                        totalCount={totalCount}
                        page={page}
                        setPage={setPage}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        minAmount={minAmount}
                        setMinAmount={setMinAmount}
                        maxAmount={maxAmount}
                        setMaxAmount={setMaxAmount}
                        setSelectedTx={setSelectedTx}
                        handleFilterReset={handleFilterReset}
                    />
                )}

                {/* VIEW 4: OPERATIONAL ANALYTICS DASHBOARD */}
                {activeTab === "dashboard" && (
                    <AnalyticsDashboard stats={stats} />
                )}

            </main>

            {/* SLIDING DRAWER DETAIL VIEW PANEL */}
            <TransactionInspector
                selectedTx={selectedTx}
                setSelectedTx={setSelectedTx}
                handleUpdateStatus={handleUpdateStatus}
            />
        </div>
    );
}