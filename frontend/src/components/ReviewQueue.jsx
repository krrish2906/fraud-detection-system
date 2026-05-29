import {
    RotateCcw,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

export default function ReviewQueue({
    transactions,
    totalCount,
    page,
    setPage,
    statusFilter,
    setStatusFilter,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    setSelectedTx,
    handleFilterReset
}) {
    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Flagged Incidents review queue</h2>
                <p className="page-subtitle">Investigate, resolve, and audit anomalies flagged by the active ML model.</p>
            </div>

            {/* Dynamic Search & Filters Row */}
            <div className="table-controls">
                <div className="filter-group">
                    <span className="filter-label">Alert Status</span>
                    <select
                        className="filter-input"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Statuses</option>
                        <option value="Pending Review">Pending Review</option>
                        <option value="Investigating">Investigating</option>
                        <option value="Approved">Approved (Legitimate)</option>
                        <option value="Blocked">Blocked (Fraud)</option>
                    </select>
                </div>

                <div className="filter-group">
                    <span className="filter-label">Min Amount</span>
                    <input
                        type="number"
                        placeholder="$0.00"
                        className="filter-input"
                        value={minAmount}
                        onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                    />
                </div>

                <div className="filter-group">
                    <span className="filter-label">Max Amount</span>
                    <input
                        type="number"
                        placeholder="$10,000"
                        className="filter-input"
                        value={maxAmount}
                        onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                    />
                </div>

                <button className="btn-reset" onClick={handleFilterReset}>
                    <RotateCcw size={14} />
                    <span>Reset Filters</span>
                </button>
            </div>

            {/* Queue Table */}
            <div className="table-container">
                {transactions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📁</div>
                        <h3>No transactions found</h3>
                        <p>Try modifying your filter parameters or logging a new transaction.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Timestamp</th>
                                <th>Amount</th>
                                <th>Model Output Risk</th>
                                <th>Classification</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx) => (
                                <tr key={tx.id} onClick={() => setSelectedTx(tx)}>
                                    <td>#{tx.id}</td>
                                    <td>
                                        {tx.created_at
                                            ? new Date(tx.created_at).toLocaleString()
                                            : "—"}
                                    </td>
                                    <td className="cell-amount">${parseFloat(tx.amount).toFixed(2)}</td>
                                    <td className="cell-prob">
                                        <span style={{ color: tx.fraud_probability > 0.5 ? "var(--error)" : "var(--success)" }}>
                                            {(tx.fraud_probability * 100).toFixed(2)}%
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${tx.prediction === "Fraud" ? "fraud" : "legitimate"}`}>
                                            {tx.prediction}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${tx.status.toLowerCase().replace(" ", "-")}`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Paging controls */}
            {transactions.length > 0 && (
                <div className="pagination">
                    <span>
                        Showing Page {page} of {Math.ceil(totalCount / 15)} ({totalCount} total alerts)
                    </span>
                    <div className="pagination-controls">
                        <button
                            className="btn-page"
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={page === 1}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            className="btn-page"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page * 15 >= totalCount}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
