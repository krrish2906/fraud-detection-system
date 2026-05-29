import { AlertTriangle } from "lucide-react";

export default function NewPrediction({
    formData,
    handleFieldChange,
    handleAutofillMock,
    handleFormSubmit,
    onClear,
    loadingForm,
    errorBanner,
    PCA_KEYS
}) {
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
                        onClick={onClear}
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
