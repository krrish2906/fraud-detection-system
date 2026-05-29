import {
    UploadCloud,
    AlertTriangle,
    FileDown
} from "lucide-react";

export default function BatchProcess({
    batchFile,
    batchError,
    batchStatus,
    batchProgress,
    batchProcessedCount,
    batchTotalCount,
    handleCsvSelect,
    handleBatchUpload,
    API_BASE_URL,
    batchTask
}) {
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
                                    href={`${API_BASE_URL}/batch/download/${batchTask || "last"}`}
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
