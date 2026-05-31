import {
    LayoutDashboard,
    ListFilter,
    PlusCircle,
    UploadCloud,
    Menu,
    X
} from "lucide-react";

export default function Sidebar({
    activeTab,
    setActiveTab,
    sidebarOpen,
    setSidebarOpen,
    username,
    onLogout
}) {
    return (
        <>
            {/* Sidebar Overlay for Mobile */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

            {/* Mobile Header Bar */}
            <div className="mobile-header">
                <button type="button" className="btn-menu-toggle" onClick={() => setSidebarOpen(true)}>
                    <Menu size={20} strokeWidth={2} />
                </button>
                <span className="mobile-brand-name">FRAUDGUARD</span>
            </div>

            {/* Sidebar Panel */}
            <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="sidebar-mobile-header">
                    <button type="button" className="btn-menu-close" onClick={() => setSidebarOpen(false)}>
                        <X size={20} strokeWidth={2} />
                    </button>
                </div>

                <div className="brand">
                    <div className="brand-logo">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <div className="brand-text">
                        <h1 className="brand-name">FRAUDGUARD</h1>
                    </div>
                </div>

                <nav className="nav-menu">
                    <div
                        className={`nav-item ${activeTab === "new" ? "active" : ""}`}
                        onClick={() => { setActiveTab("new"); setSidebarOpen(false); }}
                    >
                        <PlusCircle className="nav-icon" size={18} strokeWidth={2} />
                        <span>New Prediction</span>
                    </div>

                    <div
                        className={`nav-item ${activeTab === "batch" ? "active" : ""}`}
                        onClick={() => { setActiveTab("batch"); setSidebarOpen(false); }}
                    >
                        <UploadCloud className="nav-icon" size={18} strokeWidth={2} />
                        <span>Batch Process</span>
                    </div>

                    <div
                        className={`nav-item ${activeTab === "queue" ? "active" : ""}`}
                        onClick={() => { setActiveTab("queue"); setSidebarOpen(false); }}
                    >
                        <ListFilter className="nav-icon" size={18} strokeWidth={2} />
                        <span>Prediction History</span>
                    </div>

                    <div
                        className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                        onClick={() => { setActiveTab("dashboard"); setSidebarOpen(false); }}
                    >
                        <LayoutDashboard className="nav-icon" size={18} strokeWidth={2} />
                        <span>Prediction Insights</span>
                    </div>
                </nav>

                <footer className="sidebar-footer">
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "8px", fontWeight: 500 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="status-indicator"></span>
                            <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>Online: {username}</span>
                        </div>
                        <button
                            type="button"
                            className="btn-logout"
                            onClick={onLogout}
                        >
                            Log Out
                        </button>
                    </div>
                </footer>
            </aside>
        </>
    );
}
