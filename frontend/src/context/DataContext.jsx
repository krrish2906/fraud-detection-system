import { createContext, useContext, useState } from "react";
import axios from "axios";

const DataContext = createContext();

export function DataProvider({ children }) {
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    
    const [historyCache, setHistoryCache] = useState({
        items: [],
        totalCount: 0,
        page: 1,
        minAmount: "",
        maxAmount: "",
        loaded: false
    });
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchStats = async (API_BASE_URL, force = false) => {
        if (stats && !force && !statsLoading) return;
        setStatsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/dashboard/stats`);
            setStats(res.data);
        } catch (err) {
            console.error("DataContext: Failed to fetch stats:", err);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchHistory = async (API_BASE_URL, params, force = false) => {
        const { page, minAmount, maxAmount } = params;
        
        // Return instantly if already cached for these search filters and page, unless forced
        if (
            historyCache.loaded &&
            !force &&
            historyCache.page === page &&
            historyCache.minAmount === minAmount &&
            historyCache.maxAmount === maxAmount
        ) {
            return;
        }

        setHistoryLoading(true);
        try {
            const queryParams = { page, limit: 15 };
            if (minAmount) queryParams.min_amount = parseFloat(minAmount);
            if (maxAmount) queryParams.max_amount = parseFloat(maxAmount);

            const res = await axios.get(`${API_BASE_URL}/transactions`, { params: queryParams });
            setHistoryCache({
                items: res.data.items,
                totalCount: res.data.total_count,
                page,
                minAmount,
                maxAmount,
                loaded: true
            });
        } catch (err) {
            console.error("DataContext: Failed to fetch history:", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const clearCache = () => {
        setStats(null);
        setHistoryCache({
            items: [],
            totalCount: 0,
            page: 1,
            minAmount: "",
            maxAmount: "",
            loaded: false
        });
    };

    return (
        <DataContext.Provider value={{
            stats,
            statsLoading,
            fetchStats,
            setStats,
            historyCache,
            historyLoading,
            fetchHistory,
            setHistoryCache,
            clearCache
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    return useContext(DataContext);
}
