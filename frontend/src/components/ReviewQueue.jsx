import { useState, useEffect } from "react";
import {
    RotateCcw,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { useData } from "../context/DataContext";

export default function ReviewQueue({ API_BASE_URL, setSelectedTx }) {
    const { historyCache, historyLoading, fetchHistory } = useData();
    const [page, setPage] = useState(historyCache.page);
    const [minAmount, setMinAmount] = useState(historyCache.minAmount);
    const [maxAmount, setMaxAmount] = useState(historyCache.maxAmount);

    const transactions = historyCache.items;
    const totalCount = historyCache.totalCount;

    // Refetch/cache-lookup when filters or page changes
    useEffect(() => {
        fetchHistory(API_BASE_URL, { page, minAmount, maxAmount });
    }, [page, minAmount, maxAmount, API_BASE_URL]);

    // Handle transaction queue filter submissions
    const handleFilterReset = () => {
        setMinAmount("");
        setMaxAmount("");
        setPage(1);
    };

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Prediction History</h2>
                <p className="page-subtitle">Review all past classifications run on this platform.</p>
            </div>

            {/* Dynamic Search & Filters Row */}
            <div className="table-controls">
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
                        Showing Page {page} of {Math.ceil(totalCount / 15)} ({totalCount} total predictions)
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
