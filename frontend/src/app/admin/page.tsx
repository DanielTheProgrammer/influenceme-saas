"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

interface PendingVerification {
    profile_id: number;
    display_name: string;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    instagram_verification_status: string;
    tiktok_verification_status: string;
    verification_code: string | null;
}

interface PlatformStats {
    total_requests: number;
    pending: number;
    approved: number;
    fulfilled: number;
    verified: number;
    rejected: number;
    cancelled: number;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const token = (session as any)?.accessToken;
    const userEmail = session?.user?.email;

    const [verifications, setVerifications] = useState<PendingVerification[]>([]);
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }
        if (status === "authenticated" && ADMIN_EMAIL && userEmail !== ADMIN_EMAIL) {
            router.push("/");
        }
    }, [status, userEmail, router]);

    const fetchData = async () => {
        if (!token) return;
        try {
            const [verRes, statsRes] = await Promise.all([
                fetch(`${API_URL}/admin/verifications`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            if (verRes.ok) setVerifications(await verRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } catch (err: any) {
            toast.error("Failed to load admin data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [token]);

    const handleVerify = async (profileId: number, platform: string, approve: boolean) => {
        const endpoint = approve
            ? `/admin/verify/${profileId}/${platform}`
            : `/admin/reject-verify/${profileId}/${platform}`;
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Action failed.");
            toast.success(approve ? "Verified!" : "Rejected.");
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4" />
                    <div className="h-32 bg-gray-200 rounded-xl" />
                </div>
            </div>
        );
    }

    if (status === "unauthenticated" || (ADMIN_EMAIL && userEmail !== ADMIN_EMAIL)) {
        return null;
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
                <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-bold rounded-full">Admin</span>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: "Total Requests", value: stats.total_requests, color: "bg-gray-50 text-gray-700" },
                        { label: "Pending", value: stats.pending, color: "bg-yellow-50 text-yellow-700" },
                        { label: "Fulfilled", value: stats.fulfilled, color: "bg-blue-50 text-blue-700" },
                        { label: "Verified", value: stats.verified, color: "bg-green-50 text-green-700" },
                        { label: "Approved", value: stats.approved, color: "bg-violet-50 text-violet-700" },
                        { label: "Rejected", value: stats.rejected, color: "bg-red-50 text-red-700" },
                        { label: "Cancelled", value: stats.cancelled, color: "bg-gray-50 text-gray-500" },
                    ].map((s) => (
                        <div key={s.label} className={`${s.color} rounded-xl p-4 border border-current border-opacity-10`}>
                            <p className="text-2xl font-extrabold">{s.value}</p>
                            <p className="text-xs font-medium opacity-75 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Pending Verifications */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Pending Social Verifications</h2>
                    <p className="text-gray-500 text-sm mt-1">Influencers awaiting verification. Check their DM and approve or reject.</p>
                </div>

                {verifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        No pending verifications.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {verifications.map((v) => (
                            <div key={v.profile_id} className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{v.display_name}</h3>
                                        <p className="text-gray-500 text-sm mt-0.5">Profile ID: {v.profile_id}</p>
                                        {v.verification_code && (
                                            <p className="mt-2 font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg inline-block">
                                                Code: <strong>{v.verification_code}</strong>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 space-y-3">
                                    {v.instagram_handle && v.instagram_verification_status === "pending" && (
                                        <div className="flex items-center justify-between bg-pink-50 rounded-xl p-3 border border-pink-100">
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">Instagram: @{v.instagram_handle}</p>
                                                <a
                                                    href={`https://www.instagram.com/${v.instagram_handle}/`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-pink-600 hover:underline"
                                                >
                                                    View profile →
                                                </a>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleVerify(v.profile_id, "instagram", true)}
                                                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleVerify(v.profile_id, "instagram", false)}
                                                    className="px-3 py-1.5 bg-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-200"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {v.tiktok_handle && v.tiktok_verification_status === "pending" && (
                                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-200">
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">TikTok: @{v.tiktok_handle}</p>
                                                <a
                                                    href={`https://www.tiktok.com/@${v.tiktok_handle}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-gray-500 hover:underline"
                                                >
                                                    View profile →
                                                </a>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleVerify(v.profile_id, "tiktok", true)}
                                                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleVerify(v.profile_id, "tiktok", false)}
                                                    className="px-3 py-1.5 bg-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-200"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
