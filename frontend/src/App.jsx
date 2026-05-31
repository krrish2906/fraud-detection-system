import { useState, useEffect } from "react";
import axios from "axios";
import {
    DollarSign,
    Coins,
    Banknote
} from "lucide-react";

import NewPrediction from "./components/NewPrediction";
import BatchProcess from "./components/BatchProcess";
import ReviewQueue from "./components/ReviewQueue";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import TransactionInspector from "./components/TransactionInspector";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";

import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function App() {
    const [activeTab, setActiveTab] = useState(sessionStorage.getItem("fg_active_tab") || "new");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Authentication session states
    const [token, setToken] = useState(sessionStorage.getItem("fg_token") || "");
    const [username, setUsername] = useState(sessionStorage.getItem("fg_username") || "");
    const [isRegistering, setIsRegistering] = useState(false);

    // Drawer Inspector State
    const [selectedTx, setSelectedTx] = useState(null);

    // Apply axios common auth header dynamically
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            sessionStorage.setItem("fg_token", token);
        } else {
            delete axios.defaults.headers.common["Authorization"];
            sessionStorage.removeItem("fg_token");
        }
    }, [token]);

    useEffect(() => {
        if (username) {
            sessionStorage.setItem("fg_username", username);
        } else {
            sessionStorage.removeItem("fg_username");
        }
    }, [username]);

    useEffect(() => {
        sessionStorage.setItem("fg_active_tab", activeTab);
    }, [activeTab]);

    // Ensure dark mode doesn't persist
    useEffect(() => {
        document.documentElement.classList.remove("dark");
    }, []);

    if (!token) {
        return isRegistering ? (
            <Register
                API_BASE_URL={API_BASE_URL}
                onAuthSuccess={(t, u) => {
                    setToken(t);
                    setUsername(u);
                }}
                onToggleView={() => setIsRegistering(false)}
            />
        ) : (
            <Login
                API_BASE_URL={API_BASE_URL}
                onAuthSuccess={(t, u) => {
                    setToken(t);
                    setUsername(u);
                }}
                onToggleView={() => setIsRegistering(true)}
            />
        );
    }

    return (
        <div className="app-container">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                username={username}
                onLogout={() => {
                    setToken("");
                    setUsername("");
                    setActiveTab("new");
                    sessionStorage.removeItem("fg_active_tab");
                }}
            />

            {/* Main Workspace Frame */}
            <main className="main-content">
                {/* Subtle watermark background decorations */}
                <div className="workspace-decorations">
                    <div className="watermark-item top-right">
                        <DollarSign size={160} strokeWidth={1} />
                    </div>
                    <div className="watermark-item mid-left">
                        <Banknote size={140} strokeWidth={1} />
                    </div>
                    <div className="watermark-item bottom-right">
                        <Coins size={150} strokeWidth={1} />
                    </div>
                    <div className="watermark-item top-left-decor">
                        <Coins size={110} strokeWidth={1} />
                    </div>
                    <div className="watermark-item mid-right-decor">
                        <DollarSign size={130} strokeWidth={1} />
                    </div>
                    <div className="watermark-item bottom-left-decor">
                        <Banknote size={120} strokeWidth={1} />
                    </div>
                </div>

                {/* VIEW 1: MANUAL INFERENCE FORM */}
                {activeTab === "new" && (
                    <NewPrediction
                        API_BASE_URL={API_BASE_URL}
                        onPredictionSuccess={(tx) => setSelectedTx(tx)}
                    />
                )}

                {/* VIEW 2: BATCH CSV PROCESSOR */}
                {activeTab === "batch" && (
                    <BatchProcess
                        API_BASE_URL={API_BASE_URL}
                    />
                )}

                {/* VIEW 3: INCIDENT REVIEW QUEUE */}
                {activeTab === "queue" && (
                    <ReviewQueue
                        API_BASE_URL={API_BASE_URL}
                        setSelectedTx={setSelectedTx}
                    />
                )}

                {/* VIEW 4: OPERATIONAL ANALYTICS DASHBOARD */}
                {activeTab === "dashboard" && (
                    <AnalyticsDashboard
                        API_BASE_URL={API_BASE_URL}
                    />
                )}

            </main>

            {/* SLIDING DRAWER DETAIL VIEW PANEL */}
            <TransactionInspector
                selectedTx={selectedTx}
                setSelectedTx={setSelectedTx}
            />
        </div>
    );
}