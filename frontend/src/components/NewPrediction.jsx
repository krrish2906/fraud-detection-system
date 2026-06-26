import { useState } from "react";
import axios from "axios";
import { AlertTriangle } from "lucide-react";
import { useData } from "../context/DataContext";

const EMPTY_FORM = {
    Amount: "",
    ...Object.fromEntries(Array.from({ length: 28 }, (_, i) => [`V${i + 1}`, ""])),
};

const PCA_KEYS = Array.from({ length: 28 }, (_, i) => `V${i + 1}`);

export default function NewPrediction({ API_BASE_URL, onPredictionSuccess }) {
    const { fetchStats, fetchHistory } = useData();
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [loadingForm, setLoadingForm] = useState(false);
    const [errorBanner, setErrorBanner] = useState("");

    // Handle single transaction field change
    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value === "" ? "" : parseFloat(value)
        }));
    };

    // Autofill form with realistic test data or clear
    const handleAutofillMock = () => {
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
        // Add anomalies with higher probability
        if (Math.random() > 0.6) {
            mockData["V14"] = parseFloat((-4 - Math.random() * 6).toFixed(4));
            mockData["V17"] = parseFloat((-3 - Math.random() * 5).toFixed(4));
        }
        setFormData(mockData);
        setErrorBanner("");
    };

    const handleClear = () => {
        setFormData(EMPTY_FORM);
        setErrorBanner("");
    };

    // Submit manual transaction prediction
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
            
            // Invalidate/refresh global context caches so changes propagate immediately
            fetchStats(API_BASE_URL, true);
            fetchHistory(API_BASE_URL, { page: 1, minAmount: "", maxAmount: "" }, true);
            
            onPredictionSuccess(res.data);
            setFormData(EMPTY_FORM);
        } catch (err) {
            setErrorBanner(err.response?.data?.detail || "Server did not respond. Check your API server connection.");
        } finally {
            setLoadingForm(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Run manual prediction</h2>
                <p className="page-subtitle">Enter raw transaction components to perform instant high-fidelity model prediction.</p>
            </div>

            {errorBanner && (
                <div className="alert-banner">
                    <AlertTriangle size={16} />
                    <span>{errorBanner}</span>
                </div>
            )}

            <form className="form-container" onSubmit={handleFormSubmit}>
                <div className="form-grid-amount">
                    <div className="form-group">
                        <label className="form-label">Transaction Amount (USD)</label>
                        <div className="amount-input-container">
                            <span className="amount-prefix">$</span>
                            <input
                                name="Amount"
                                type="number"
                                step="any"
                                placeholder="0.00"
                                className="input-huge"
                                value={formData.Amount}
                                onChange={handleFieldChange}
                                required
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <span className="form-label">PCA Feature Vector (V1 - V28)</span>
                    <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                        onClick={handleAutofillMock}
                    >
                        ⚡ Autofill Mock Values
                    </button>
                </div>

                <div className="pca-grid-redesign">
                    {PCA_KEYS.map((key) => (
                        <div className="input-field-wrap" key={key}>
                            <label className="input-field-label">{key}</label>
                            <input
                                name={key}
                                type="number"
                                step="any"
                                placeholder="0.00"
                                className="input-field"
                                value={formData[key]}
                                onChange={handleFieldChange}
                            />
                        </div>
                    ))}
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleClear}
                    >
                        Clear Fields
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loadingForm}
                    >
                        {loadingForm ? "Analyzing Vector..." : "Run Classifier"}
                    </button>
                </div>
            </form>
        </div>
    );
}
