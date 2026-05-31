import {
    X
} from "lucide-react";

export default function TransactionInspector({
    selectedTx,
    setSelectedTx
}) {
    if (!selectedTx) return null;

    return (
        <div className="inspect-drawer-overlay" onClick={() => setSelectedTx(null)}>
            <div className="inspect-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="drawer-header">
                    <span className="drawer-title">Prediction Details</span>
                    <button className="btn-close" type="button" onClick={() => setSelectedTx(null)}>
                        <X size={18} />
                    </button>
                </div>

                <div className="drawer-body">
                    {/* Core Verdict Card */}
                    <div className="drawer-section">
                        <div className="drawer-meta-grid">
                            <div className="drawer-meta-item">
                                <div className="drawer-meta-label">Prediction ID</div>
                                <div className="drawer-meta-value">#{selectedTx.id || "Unsaved"}</div>
                            </div>

                            <div className="drawer-meta-item">
                                <div className="drawer-meta-label">Amount (USD)</div>
                                <div className="drawer-meta-value" style={{ fontFamily: "var(--font-mono)" }}>
                                    ${parseFloat(selectedTx.amount).toFixed(2)}
                                </div>
                            </div>

                            <div className="drawer-meta-item">
                                <div className="drawer-meta-label">Predicted Risk</div>
                                <div className="drawer-meta-value" style={{ fontFamily: "var(--font-mono)", color: selectedTx.fraud_probability > 0.5 ? "var(--error)" : "var(--success)" }}>
                                    {(selectedTx.fraud_probability * 100).toFixed(2)}%
                                </div>
                            </div>

                            <div className="drawer-meta-item">
                                <div className="drawer-meta-label">Model Verdict</div>
                                <div className="drawer-meta-value">
                                    <span className={`badge ${selectedTx.prediction === "Fraud" ? "fraud" : "legitimate"}`}>
                                        {selectedTx.prediction}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Explainable AI (XAI) perturb bar charts */}
                    {selectedTx.explanation && (
                        <div className="drawer-section">
                            <span className="drawer-section-title">Explainable AI (XAI) Attribution</span>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>
                                Perturbation analysis: Shows features contributing most to this classification (Baseline: Feature Means).
                            </p>

                            {/* Positive Drivers (Pushed Risk UP) */}
                            <div style={{ marginBottom: "14px" }}>
                                <div className="filter-label" style={{ color: "var(--error)", marginBottom: "8px" }}>
                                    🚨 Top Positive Drivers (Pushed Risk Up)
                                </div>
                                {selectedTx.explanation.positive_drivers.length === 0 ? (
                                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>No positive drivers above threshold</div>
                                ) : (
                                    <div className="xai-bar-list">
                                        {selectedTx.explanation.positive_drivers.map((driver) => {
                                            const scalePercent = Math.min((driver.score / 0.8) * 100, 100);
                                            return (
                                                <div className="xai-bar-item" key={driver.feature}>
                                                    <div className="xai-bar-label-row">
                                                        <span className="xai-feature-name">{driver.feature}</span>
                                                        <span className="xai-feature-score positive">+{driver.score.toFixed(4)}</span>
                                                    </div>
                                                    <div className="xai-bar-container">
                                                        <div className="xai-bar-fill positive" style={{ width: `${scalePercent}%` }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Negative Drivers (Pushed Risk DOWN) */}
                            <div>
                                <div className="filter-label" style={{ color: "var(--success)", marginBottom: "8px" }}>
                                    ✅ Top Negative Drivers (Pushed Risk Down)
                                </div>
                                {selectedTx.explanation.negative_drivers.length === 0 ? (
                                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>No negative drivers below threshold</div>
                                ) : (
                                    <div className="xai-bar-list">
                                        {selectedTx.explanation.negative_drivers.map((driver) => {
                                            const scalePercent = Math.min((Math.abs(driver.score) / 0.8) * 100, 100);
                                            return (
                                                <div className="xai-bar-item" key={driver.feature}>
                                                    <div className="xai-bar-label-row">
                                                        <span className="xai-feature-name">{driver.feature}</span>
                                                        <span className="xai-feature-score negative">{driver.score.toFixed(4)}</span>
                                                    </div>
                                                    <div className="xai-bar-container">
                                                        <div className="xai-bar-fill negative" style={{ width: `${scalePercent}%` }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Vector Data */}
                    <div className="drawer-section">
                        <span className="drawer-section-title">Raw Vector Features</span>
                        <div
                            style={{
                                backgroundColor: "var(--bg-card)",
                                border: "1px solid var(--border)",
                                borderRadius: "10px",
                                padding: "16px",
                                maxHeight: "180px",
                                overflowY: "auto",
                                fontFamily: "var(--font-mono)",
                                fontSize: "11px",
                                color: "var(--text-secondary)"
                            }}
                        >
                            <div style={{ gridTemplateColumns: "1fr 1fr", display: "grid", gap: "8px" }}>
                                {selectedTx.features && Object.entries(selectedTx.features).map(([k, v]) => (
                                    <div key={k} style={{ display: "flex", justifyContent: "space-between", paddingRight: "10px" }}>
                                        <span style={{ color: "var(--text-muted)" }}>{k}:</span>
                                        <span>{parseFloat(v).toFixed(4)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
