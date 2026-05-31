import { useState, useEffect } from "react";
import axios from "axios";
import {
    UploadCloud,
    AlertTriangle,
    FileDown
} from "lucide-react";

const PCA_KEYS = Array.from({ length: 28 }, (_, i) => `V${i + 1}`);

export default function BatchProcess({ API_BASE_URL }) {
    const [batchFile, setBatchFile] = useState(null);
    const [batchError, setBatchError] = useState("");
    const [batchStatus, setBatchStatus] = useState("");
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchProcessedCount, setBatchProcessedCount] = useState(0);
    const [batchTotalCount, setBatchTotalCount] = useState(0);
    const [batchTask, setBatchTask] = useState(null);
    const [downloadTaskId, setDownloadTaskId] = useState(null);

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
        setBatchTask(null);
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
                    }
                } catch (err) {
                    console.error("Error polling batch status:", err);
                    clearInterval(intervalId);
                    setBatchTask(null);
                }
            }, 1000);
        }
        return () => clearInterval(intervalId);
    }, [batchTask, API_BASE_URL]);

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Asynchronous batch scanner</h2>
                <p className="page-subtitle">Upload transaction CSV files for concurrent background scanning and download predicted sheets.</p>
            </div>

            {batchError && (
                <div className="alert-banner">
                    <AlertTriangle size={16} />
                    <span>{batchError}</span>
                </div>
            )}

            <div className="form-container" style={{ maxWidth: "700px" }}>
                <div className="csv-drop-zone">
                    <div className="csv-icon-wrap">
                        <UploadCloud size={28} />
                    </div>
                    <div>
                        <h3 style={{ marginBottom: "6px" }}>Select or Drop CSV Data Sheet</h3>
                        <p className="csv-drop-text">CSV file must map standard V1-V28 vectors and Amount headers.</p>
                    </div>
                    <input
                        type="file"
                        accept=".csv"
                        id="csv-file-picker"
                        style={{ display: "none" }}
                        onChange={handleCsvSelect}
                    />
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => document.getElementById("csv-file-picker").click()}
                    >
                        Choose File
                    </button>
                    {batchFile && (
                        <div className="badge legitimate" style={{ padding: "6px 12px", marginTop: "8px" }}>
                            ✓ Selected: {batchFile.name} ({(batchFile.size / 1024).toFixed(1)} KB)
                        </div>
                    )}
                </div>

                {batchFile && !batchStatus && (
                    <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                        <button className="btn-primary" type="button" onClick={handleBatchUpload}>
                            Execute Batch Scan
                        </button>
                    </div>
                )}

                {/* Progress Polling Card */}
                {batchStatus && (
                    <div className="batch-status-panel">
                        <div className="batch-status-header">
                            <span className="batch-status-title">
                                Job Status: <span style={{ textTransform: "uppercase", fontWeight: "700", color: batchStatus === "completed" ? "var(--success)" : "var(--primary)" }}>{batchStatus}</span>
                            </span>
                            <span className="cell-prob">{batchProgress}%</span>
                        </div>

                        <div className="progress-track">
                            <div className="progress-bar-fill" style={{ width: `${batchProgress}%` }}></div>
                        </div>

                        <div className="progress-stats">
                            <span>
                                Processed: {batchProcessedCount} / {batchTotalCount} rows
                            </span>
                            {batchStatus === "completed" && (
                                <a
                                    href={`${API_BASE_URL}/batch/download/${downloadTaskId || "last"}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-primary"
                                    style={{ padding: "6px 14px", fontSize: "12px", textDecoration: "none" }}
                                >
                                    <FileDown size={14} />
                                    <span>Download predictions (CSV)</span>
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
