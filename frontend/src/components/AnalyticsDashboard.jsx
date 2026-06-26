import { useEffect } from "react";
import {
    ResponsiveContainer,
    AreaChart,
    XAxis,
    YAxis,
    Tooltip,
    Area,
    CartesianGrid,
    PieChart,
    Pie,
    Sector,
    Legend,
    BarChart,
    Bar
} from "recharts";
import {
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Shield,
    DollarSign,
    RefreshCw
} from "lucide-react";
import { useData } from "../context/DataContext";

const renderPieSector = (props) => {
    return <Sector {...props} fill={props.payload?.fill || "var(--primary)"} />;
};

export default function AnalyticsDashboard({ API_BASE_URL }) {
    const { stats: statsFromContext, statsLoading, fetchStats } = useData();

    useEffect(() => {
        fetchStats(API_BASE_URL);
    }, [API_BASE_URL]);

    if (!statsFromContext && statsLoading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px", color: "var(--text-secondary)" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ border: "3px solid var(--border)", borderTop: "3px solid var(--primary)", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
                    <span>Loading statistics...</span>
                </div>
            </div>
        );
    }

    // Default structure fallback if server returned empty data or was unreached
    const stats = statsFromContext || {
        total_volume: 0,
        overall_fraud_rate: 0,
        pending_reviews: 0,
        false_positive_ratio: 0,
        average_resolution_time: 0,
        total_analyzed_volume: 0,
        timeline: [],
        class_breakdown: { Normal: 0, Fraud: 0 },
        global_importances: [],
        latest_fraud_explanation: null
    };

    return (
        <div className="dashboard-content">
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
                <div>
                    <h2 className="page-title">Prediction Insights</h2>
                    <p className="page-subtitle">Real-time prediction metrics and anomaly timeline for your submissions.</p>
                </div>
                <button
                    type="button"
                    onClick={() => fetchStats(API_BASE_URL, true)}
                    disabled={statsLoading}
                    className="btn-secondary"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 16px",
                        height: "38px"
                    }}
                >
                    <RefreshCw
                        size={14}
                        style={{
                            animation: statsLoading ? "spin 1s linear infinite" : "none"
                        }}
                    />
                    <span>{statsLoading ? "Syncing..." : "Sync"}</span>
                </button>
            </div>

            {/* Summary statistics cards */}
            <div className="metrics-grid">
                <div className="metric-card primary">
                    <div className="metric-header">
                        <span className="metric-label">Predictions Classified</span>
                        <div className="metric-icon-wrap">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <div className="metric-value">{stats.total_volume}</div>
                    <div className="metric-desc">Total transactions run through the model</div>
                </div>

                <div className="metric-card error">
                    <div className="metric-header">
                        <span className="metric-label">Fraud Detected</span>
                        <div className="metric-icon-wrap">
                            <Shield size={16} />
                        </div>
                    </div>
                    <div className="metric-value">{stats.pending_reviews}</div>
                    <div className="metric-desc">Anomalies flagged as high-risk incidents</div>
                </div>

                <div className="metric-card warning">
                    <div className="metric-header">
                        <span className="metric-label">Fraud Ratio</span>
                        <div className="metric-icon-wrap">
                            <AlertTriangle size={16} />
                        </div>
                    </div>
                    <div className="metric-value">{stats.overall_fraud_rate}%</div>
                    <div className="metric-desc">Percentage of predictions flagged as fraud</div>
                </div>

                <div className="metric-card info">
                    <div className="metric-header">
                        <span className="metric-label">Average Fraud Risk</span>
                        <div className="metric-icon-wrap">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="metric-value">{stats.false_positive_ratio}%</div>
                    <div className="metric-desc">Mean probability score across submissions</div>
                </div>

                <div className="metric-card success">
                    <div className="metric-header">
                        <span className="metric-label">Total Scanned Volume</span>
                        <div className="metric-icon-wrap">
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <div className="metric-value" style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        ${parseFloat(stats.total_analyzed_volume || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="metric-desc">Sum of all transaction amounts analyzed</div>
                </div>
            </div>

            {/* Historical charts visualization */}
            <div className="charts-grid">
                <div className="chart-card">
                    <div className="chart-title">
                        <TrendingUp size={16} style={{ color: "var(--primary)" }} />
                        <span>Historical System Activity & Flags (Last 10 Days)</span>
                    </div>
                    <div style={{ width: "100%", height: 320 }}>
                        <ResponsiveContainer>
                            <AreaChart
                                data={stats.timeline}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--error)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--error)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                                <Tooltip
                                    cursor={false}
                                    contentStyle={{
                                        backgroundColor: "var(--bg-card)",
                                        borderColor: "var(--border)",
                                        borderRadius: "8px",
                                        color: "var(--text-primary)"
                                    }}
                                />
                                <Area
                                    name="Total Scanned"
                                    type="monotone"
                                    dataKey="volume"
                                    stroke="var(--primary)"
                                    fillOpacity={1}
                                    fill="url(#colorVolume)"
                                    strokeWidth={2}
                                />
                                <Area
                                    name="Fraud Flagged"
                                    type="monotone"
                                    dataKey="fraud"
                                    stroke="var(--error)"
                                    fillOpacity={1}
                                    fill="url(#colorFraud)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Fintech Operational Analytics Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px", marginBottom: "24px" }}>

                {/* Chart 1: Fraud vs Normal Pie Chart */}
                <div className="chart-card">
                    <div className="chart-title">
                        <Shield size={16} style={{ color: "var(--success)" }} />
                        <span>Fraud Overview (Normal vs Flagged)</span>
                    </div>
                    <div style={{ width: "100%", height: 260, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: "Normal", value: stats.class_breakdown?.Normal || 0, fill: "var(--success)" },
                                        { name: "Fraud", value: stats.class_breakdown?.Fraud || 0, fill: "var(--error)" }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    shape={renderPieSector}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--bg-card)",
                                        borderColor: "var(--border)",
                                        borderRadius: "8px",
                                        color: "var(--text-primary)"
                                    }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px", textAlign: "center" }}>
                            <strong>Business Value:</strong> Quick operational overview of system anomaly ratios.
                        </div>
                    </div>
                </div>

                {/* Chart 2: Latest Flagged Fraud Transaction Local SHAP */}
                <div className="chart-card">
                    <div className="chart-title">
                        <AlertTriangle size={16} style={{ color: "var(--error)" }} />
                        <span>Top Factors Behind Recent Fraud Detection</span>
                    </div>

                    {stats.latest_fraud_explanation ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px", height: 260, justifyContent: "center" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: "1px solid var(--border)", fontSize: "12px" }}>
                                <span><strong>Alert ID:</strong> #{stats.latest_fraud_explanation.id}</span>
                                <span style={{ fontFamily: "var(--font-mono)" }}><strong>Amt:</strong> ${stats.latest_fraud_explanation.amount.toFixed(2)}</span>
                                <span style={{ color: "var(--error)", fontWeight: "600" }}>Risk: {(stats.latest_fraud_explanation.fraud_probability * 100).toFixed(1)}%</span>
                            </div>

                            <div className="xai-bar-list" style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center" }}>
                                {stats.latest_fraud_explanation.positive_drivers.slice(0, 3).map((driver) => {
                                    const scalePercent = Math.min((driver.score / 0.8) * 100, 100);
                                    return (
                                        <div className="xai-bar-item" key={driver.feature}>
                                            <div className="xai-bar-label-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                                <span style={{ fontWeight: "600" }}>{driver.feature}</span>
                                                <span style={{ color: "var(--error)" }}>+{driver.score.toFixed(4)}</span>
                                            </div>
                                            <div className="xai-bar-container" style={{ height: "6px", backgroundColor: "var(--bg-app)", borderRadius: "99px", overflow: "hidden" }}>
                                                <div className="xai-bar-fill positive" style={{ width: `${scalePercent}%`, height: "100%", backgroundColor: "var(--error)" }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>
                                <strong>Why?</strong> Shows key signal factors driving the latest high-risk prediction.
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ height: 260, padding: 0, justifyContent: "center" }}>
                            <div style={{ fontSize: "24px" }}>🔍</div>
                            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>No flagged incidents to explain.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Chart 3: Global Feature Importance Dashboard */}
            <div className="chart-card" style={{ marginBottom: "32px" }}>
                <div className="chart-title">
                    <TrendingUp size={16} style={{ color: "var(--primary)" }} />
                    <span>Global Feature Importance Dashboard (XGBoost Estimations)</span>
                </div>
                <div style={{ width: "100%", height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={stats.global_importances || []}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="feature" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                            <Tooltip
                                cursor={false}
                                contentStyle={{
                                    backgroundColor: "var(--bg-card)",
                                    borderColor: "var(--border)",
                                    borderRadius: "8px",
                                    color: "var(--text-primary)"
                                }}
                            />
                            <Bar dataKey="importance" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", textAlign: "center" }}>
                    <strong>Insight:</strong> Global factor weightings representing the trained model's decision architecture.
                </div>
            </div>
        </div>
    );
}
