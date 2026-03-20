import { useState, useRef } from "react";
import axios from "axios";
import "./App.css";

const EMPTY_FORM = {
    Amount: "",
    ...Object.fromEntries(Array.from({ length: 28 }, (_, i) => [`V${i + 1}`, ""])),
};

const PCA_KEYS = Array.from({ length: 28 }, (_, i) => `V${i + 1}`);

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");

    const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());

    // validate expected columns exist
    const missing = ["Amount", ...PCA_KEYS].filter((k) => !headers.includes(k));
    if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);

    const dataRows = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(",").map((v) => v.replace(/^"|"$/g, "").trim());
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });

        dataRows.push({
            Amount: row.Amount === "" ? "" : parseFloat(row.Amount),
            ...Object.fromEntries(PCA_KEYS.map((k) => [k, row[k] === "" ? "" : parseFloat(row[k])])),
        });
    }

    return dataRows;
}

function Header() {
    return (
        <div className="header">
            <div className="header-icon">🛡</div>
            <div className="header-text">
                <h1>FRAUD DETECTION</h1>
                <p>Credit card transaction analysis · ML model v1.0</p>
            </div>
            <div className="status-dot">MODEL ACTIVE</div>
        </div>
    );
}

function SectionLabel({ children }) {
    return <div className="section-label">{children}</div>;
}

function AmountInput({ value, onChange }) {
    return (
        <div className="amount-section">
            <SectionLabel>Transaction Amount</SectionLabel>
            <div className="amount-input-wrap">
                <span className="amount-symbol">$</span>
                <input
                    className="amount-input"
                    name="Amount"
                    type="number"
                    placeholder="0.00"
                    value={value}
                    onChange={onChange}
                />
            </div>
        </div>
    );
}

function CsvUpload({ onLoad }) {
    const inputRef = useRef(null);
    const [filename, setFilename] = useState(null);
    const [csvError, setCsvError] = useState(null);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = parseCSV(ev.target.result);
                setFilename(file.name);
                setCsvError(null);
                onLoad(parsed);
            } catch (err) {
                setCsvError(err.message);
                setFilename(null);
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    return (
        <div className="csv-section">
            <SectionLabel>Import from CSV</SectionLabel>
            <div className="csv-row">
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={handleFile}
                />
                <button className="btn-csv" onClick={() => inputRef.current?.click()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    UPLOAD CSV
                </button>
                {filename && <span className="csv-filename">✓ {filename}</span>}
                {csvError && <span className="csv-error">⚠ {csvError}</span>}
            </div>
        </div>
    );
}

function PcaGrid({ values, onChange }) {
    return (
        <>
            <SectionLabel>PCA Feature Vector · V1 – V28</SectionLabel>
            <div className="pca-grid">
                {PCA_KEYS.map((key) => (
                    <div className={`pca-field${values[key] !== "" ? " prefilled" : ""}`} key={key}>
                        <span className="pca-label">{key}</span>
                        <input
                            className="pca-input"
                            name={key}
                            type="number"
                            placeholder="0.000"
                            value={values[key]}
                            onChange={onChange}
                        />
                    </div>
                ))}
            </div>
        </>
    );
}

function Actions({ loading, onPredict, onClear }) {
    return (
        <div className="actions">
            <button
                className={`btn-predict${loading ? " loading" : ""}`}
                onClick={onPredict}
                disabled={loading}
            >
                {loading ? "ANALYZING..." : "RUN PREDICTION"}
            </button>
            <button className="btn-clear" onClick={onClear}>CLEAR</button>
        </div>
    );
}

function ErrorBanner({ message }) {
    if (!message) return null;
    return (
        <div className="error-card">
            <span>⚠</span> {message}
        </div>
    );
}

function ResultCard({ result, amount }) {
    if (!result) return null;

    const isFraud = result.prediction === 1 || result.prediction === "fraud";
    const prob = parseFloat(result.fraud_probability);
    const probPct = (prob * 100).toFixed(2);
    const barWidth = `${Math.min(prob * 100, 100)}%`;
    const cls = isFraud ? "fraud" : "legit";

    return (
        <div className={`result-card ${cls}`}>
            <div className="result-top">
                <div className="result-verdict">
                    <div className="verdict-icon">{isFraud ? "🚨" : "✅"}</div>
                    <div>
                        <div className="verdict-title">{isFraud ? "FRAUDULENT" : "LEGITIMATE"}</div>
                        <div className="verdict-sub">
                            {isFraud ? "Transaction flagged as suspicious" : "Transaction appears genuine"}
                        </div>
                    </div>
                </div>
                <div className="prob-badge">{probPct}%</div>
            </div>

            <div className="prob-bar-wrap">
                <div className="prob-bar" style={{ width: barWidth }} />
            </div>
            <div className="prob-labels">
                <span>LOW RISK</span>
                <span>FRAUD PROBABILITY</span>
                <span>HIGH RISK</span>
            </div>

            <div className="result-meta">
                <div className="meta-item">
                    <div className="meta-item-label">Raw Probability</div>
                    <div className="meta-item-value">{result.fraud_probability}</div>
                </div>
                <div className="meta-item">
                    <div className="meta-item-label">Prediction Class</div>
                    <div className="meta-item-value">{result.prediction}</div>
                </div>
                <div className="meta-item">
                    <div className="meta-item-label">Amount</div>
                    <div className="meta-item-value">${amount || "—"}</div>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [batchData, setBatchData] = useState(null);
    const [batchResults, setBatchResults] = useState(null);
    const [batchMode, setBatchMode] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value === "" ? "" : parseFloat(value),
        }));
    };

    const handleCsvLoad = (parsed) => {
        if (Array.isArray(parsed) && parsed.length > 1) {
            setBatchData(parsed);
            setBatchMode(true);
            setBatchResults(null);
        } else {
            const single = Array.isArray(parsed) ? parsed[0] : parsed;
            setFormData(single);
            setBatchMode(false);
            setBatchData(null);
            setBatchResults(null);
        }
        setResult(null);
        setError(null);
    };

    const handleClear = () => {
        setFormData(EMPTY_FORM);
        setResult(null);
        setError(null);
        setBatchData(null);
        setBatchResults(null);
        setBatchMode(false);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/predict`, formData);
            setResult(res.data);
        } catch (err) {
            setError("Could not connect to prediction server. Ensure the API is running.");
        } finally {
            setLoading(false);
        }
    };

    const handleBatchSubmit = async () => {
        setLoading(true);
        setError(null);
        setBatchResults(null);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/predict_batch`, batchData);
            setBatchResults(res.data);
        } catch (err) {
            setError("Batch prediction failed! Server not responding.");
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        if (!batchData || !batchResults) return;

        let csvContent = "";
        const headers = ["fraud_probability", "prediction"];
        csvContent += headers.join(",") + "\n";

        batchResults.forEach((res) => {
            const values = [
                res.fraud_probability,
                res.prediction
            ];
            csvContent += values.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "predictions_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="app">
            <Header />
            <CsvUpload onLoad={handleCsvLoad} />

            {batchMode ? (
                <div className="batch-mode">
                    <SectionLabel>Batch Processing Mode</SectionLabel>
                    <div className="batch-card">
                        <div className="batch-info">
                            <div className="batch-icon">📂</div>
                            <div>
                                <div className="batch-title">Ready for Batch Prediction</div>
                                <div className="batch-subtitle">{batchData.length} transactions loaded from CSV</div>
                            </div>
                        </div>

                        <div className="actions batch-actions">
                            <button
                                className={`btn-predict${loading ? " loading" : ""}`}
                                onClick={handleBatchSubmit}
                                disabled={loading || batchResults}
                            >
                                {loading ? "ANALYZING BATCH..." : "RUN BATCH PREDICTION"}
                            </button>
                            <button className="btn-clear" onClick={handleClear} disabled={loading}>CANCEL</button>
                        </div>

                        <ErrorBanner message={error} />

                        {batchResults && (
                            <div className="batch-success">
                                <div className="batch-success-message">✅ Successfully predicted {batchResults.length} transactions!</div>
                                <button className="btn-download" onClick={downloadCSV}>
                                    DOWNLOAD PREDICTIONS (CSV)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <AmountInput value={formData.Amount} onChange={handleChange} />
                    <PcaGrid values={formData} onChange={handleChange} />
                    <Actions loading={loading} onPredict={handleSubmit} onClear={handleClear} />
                    <ErrorBanner message={error} />
                    <ResultCard result={result} amount={formData.Amount} />
                </>
            )}
        </div>
    );
}