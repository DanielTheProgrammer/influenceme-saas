"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface EngagementRequest {
    id: number;
    status: string;
    created_at: string;
    service: {
        engagement_type: string;
        price: number;
    } | null;
    counter_offer_price: number | null;
}

const STATUS_COLOR: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
    fulfilled: "bg-indigo-100 text-indigo-800",
    verified: "bg-green-100 text-green-800",
    counter_offered: "bg-purple-100 text-purple-800",
    cancelled: "bg-gray-100 text-gray-600",
    disputed: "bg-orange-100 text-orange-800",
};

export default function InfluencerAnalyticsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const token = (session as any)?.accessToken;

    const [requests, setRequests] = useState<EngagementRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login?redirect=/influencer/analytics");
    }, [status, router]);

    useEffect(() => {
        if (!token) return;
        fetch(`${API_URL}/influencer/requests`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load analytics.");
                return res.json();
            })
            .then((data) => { setRequests(data); setLoading(false); })
            .catch((err) => { toast.error(err.message); setLoading(false); });
    }, [token]);

    if (status === "loading" || loading) {
        return (
            <div className="max-w-4xl mx-auto py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
                    </div>
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    // Compute stats
    const total = requests.length;
    const byStatus = requests.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const totalEarned = requests
        .filter((r) => r.status === "verified")
        .reduce((sum, r) => sum + (r.service?.price ?? 0), 0);

    const pendingEarnings = requests
        .filter((r) => ["approved", "fulfilled"].includes(r.status))
        .reduce((sum, r) => sum + (r.service?.price ?? 0), 0);

    const acceptRate = total > 0
        ? Math.round(((byStatus["approved"] || 0) + (byStatus["fulfilled"] || 0) + (byStatus["verified"] || 0)) / total * 100)
        : 0;

    const byType = requests.reduce((acc, r) => {
        const t = r.service?.engagement_type ?? "unknown";
        if (!acc[t]) acc[t] = { count: 0, revenue: 0 };
        acc[t].count += 1;
        if (r.status === "verified") acc[t].revenue += r.service?.price ?? 0;
        return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    const recentRequests = [...requests]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Analytics</h1>
                <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
                    ← Back to Dashboard
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-5 text-center">
                    <p className="text-3xl font-extrabold text-gray-900">{total}</p>
                    <p className="text-sm text-gray-500 mt-1">Total Requests</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 text-center">
                    <p className="text-3xl font-extrabold text-green-600">${totalEarned.toFixed(0)}</p>
                    <p className="text-sm text-gray-500 mt-1">Earned (verified)</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 text-center">
                    <p className="text-3xl font-extrabold text-indigo-600">${pendingEarnings.toFixed(0)}</p>
                    <p className="text-sm text-gray-500 mt-1">Pending Payout</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 text-center">
                    <p className="text-3xl font-extrabold text-blue-600">{acceptRate}%</p>
                    <p className="text-sm text-gray-500 mt-1">Accept Rate</p>
                </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">Requests by Status</h2>
                {total === 0 ? (
                    <p className="text-gray-400 text-sm">No requests yet.</p>
                ) : (
                    <div className="space-y-2">
                        {Object.entries(byStatus).map(([s, count]) => (
                            <div key={s} className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold w-28 text-center ${STATUS_COLOR[s] || "bg-gray-100 text-gray-600"}`}>
                                    {s.replace(/_/g, " ").toUpperCase()}
                                </span>
                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${Math.round((count / total) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-sm font-medium text-gray-700 w-8 text-right">{count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Revenue by Service Type */}
            {Object.keys(byType).length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold mb-4">Revenue by Service Type</h2>
                    <div className="space-y-3">
                        {Object.entries(byType)
                            .sort((a, b) => b[1].revenue - a[1].revenue)
                            .map(([type, data]) => (
                                <div key={type} className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700 capitalize w-40">
                                        {type.replace(/_/g, " ")}
                                    </span>
                                    <span className="text-xs text-gray-400">{data.count} req</span>
                                    <span className="text-sm font-bold text-green-600">${data.revenue.toFixed(0)} earned</span>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
                {recentRequests.length === 0 ? (
                    <p className="text-gray-400 text-sm">No recent activity.</p>
                ) : (
                    <div className="space-y-3">
                        {recentRequests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div>
                                    <span className="text-sm font-medium text-gray-800 capitalize">
                                        {req.service?.engagement_type.replace(/_/g, " ") ?? "Service"}
                                    </span>
                                    <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {req.service && (
                                        <span className="text-sm font-bold text-gray-700">${req.service.price.toFixed(0)}</span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLOR[req.status] || "bg-gray-100 text-gray-600"}`}>
                                        {req.status.replace(/_/g, " ").toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
