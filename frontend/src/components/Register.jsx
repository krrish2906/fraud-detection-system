import { useState } from "react";
import axios from "axios";
import { DollarSign, Banknote, Coins, Eye, EyeOff } from "lucide-react";

export default function Register({ API_BASE_URL, onAuthSuccess, onToggleView }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // 1. Register User
            await axios.post(`${API_BASE_URL}/auth/register`, {
                username,
                password
            });
            // 2. Automatically log in after registration
            const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
                username,
                password
            });
            onAuthSuccess(loginRes.data.token, loginRes.data.username);
        } catch (err) {
            console.error("Registration error:", err);
            setError(err.response?.data?.detail || "Registration request failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            {/* Subtle watermark background decorations */}
            <div className="workspace-decorations" style={{ display: "block" }}>
                <div className="watermark-item top-right"><DollarSign size={160} strokeWidth={1} /></div>
                <div className="watermark-item mid-left"><Banknote size={140} strokeWidth={1} /></div>
                <div className="watermark-item bottom-right"><Coins size={150} strokeWidth={1} /></div>
                <div className="watermark-item top-left-decor"><Coins size={110} strokeWidth={1} /></div>
                <div className="watermark-item mid-right-decor"><DollarSign size={130} strokeWidth={1} /></div>
                <div className="watermark-item bottom-left-decor"><Banknote size={120} strokeWidth={1} /></div>
            </div>

            <div className="auth-card" style={{ position: "relative", zIndex: 11 }}>
                <div className="brand" style={{ justifyContent: "center", marginBottom: "28px" }}>
                    <div className="brand-logo">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <h1 className="brand-name" style={{ fontSize: "20px" }}>FRAUDGUARD</h1>
                </div>

                <h2 className="auth-title">Create your account</h2>
                <p className="auth-subtitle">ML-powered instant self-service transaction classification.</p>

                {error && (
                    <div className="alert-banner" style={{ marginBottom: "20px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            className="filter-input"
                            style={{ width: "100%", height: "42px" }}
                            placeholder="Enter username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: "24px" }}>
                        <label className="form-label">Password</label>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="filter-input"
                                style={{ width: "100%", height: "42px", paddingRight: "40px" }}
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: "absolute",
                                    right: "12px",
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: 0
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: "100%", height: "44px", justifyContent: "center", marginBottom: "16px" }} disabled={loading}>
                        {loading ? "Processing..." : "Register Account"}
                    </button>

                    <div style={{ textAlign: "center", fontSize: "13px" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Already have an account? </span>
                        <button
                            type="button"
                            style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: "600", cursor: "pointer", padding: 0 }}
                            onClick={onToggleView}
                        >
                            Sign In
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
