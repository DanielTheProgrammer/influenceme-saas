"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface EngagementRequest {
    id: number;
    service_id: number;
    status: string;
    created_at: string;
    generated_image_preview_url: string | null;
    rejection_reason: string | null;
    counter_offer_price: number | null;
    counter_offer_description: string | null;
    service: {
        id: number;
        engagement_type: string;
        price: number;
        description: string | null;
        influencer_id: number;
    } | null;
}

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    fulfilled: "bg-blue-100 text-blue-800",
    verified: "bg-purple-100 text-purple-800",
    counter_offered: "bg-orange-100 text-orange-800",
    cancelled: "bg-gray-100 text-gray-800",
};

export default function FanRequestsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [requests, setRequests] = useState<EngagementRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login?redirect=/fan/requests");
    }, [status, router]);

    const token = (session as any)?.accessToken;

    const fetchRequests = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/marketplace/requests/my`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch requests.");
            setRequests(await res.json());
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, [token]);

    const handleCounterOffer = async (requestId: number, accept: boolean) => {
        const endpoint = accept ? "accept-counter-offer" : "reject-counter-offer";
        try {
            const res = await fetch(`${API_URL}/marketplace/requests/${requestId}/${endpoint}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Action failed.");
            await fetchRequests();
            toast.success("Done!");
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleVerify = async (requestId: number) => {
        try {
            const res = await fetch(`${API_URL}/marketplace/requests/${requestId}/verify`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Verification failed.");
            await fetchRequests();
            toast.success("Payment released!");
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="max-w-4xl mx-auto py-8">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Requests</h1>
                <Link href="/browse" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Browse Influencers
                </Link>
            </div>

            {requests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                    <p className="text-gray-500 text-lg mb-4">You haven&apos;t submitted any requests yet.</p>
                    <Link href="/browse" className="text-blue-600 font-medium hover:underline">
                        Browse influencers to get started →
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <div key={req.id} className="bg-white rounded-xl shadow-sm p-6 flex flex-col md:flex-row gap-4">
                            {req.generated_image_preview_url && (
                                <img
                                    src={req.generated_image_preview_url}
                                    alt="Preview"
                                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                                />
                            )}
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-gray-900 capitalize">
                                            {req.service?.engagement_type.replace(/_/g, " ") ?? `Service #${req.service_id}`}
                                        </p>
                                        {req.service && (
                                            <p className="text-green-600 font-semibold text-sm">
                                                ${req.service.price.toFixed(2)}
                                                {" · "}
                                                <Link href={`/influencers/${req.service.influencer_id}`} className="text-blue-500 hover:underline text-sm">
                                                    View influencer
                                                </Link>
                                            </p>
                                        )}
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[req.status] || "bg-gray-100 text-gray-800"}`}>
                                        {req.status.replace(/_/g, " ").toUpperCase()}
                                    </span>
                                </div>

                                {req.status === "rejected" && req.rejection_reason && (
                                    <p className="text-red-600 text-sm mb-2">
                                        <strong>Reason:</strong> {req.rejection_reason}
                                    </p>
                                )}

                                {req.status === "counter_offered" && (
                                    <div className="bg-orange-50 rounded-lg p-3 mb-3">
                                        <p className="text-orange-800 text-sm font-medium mb-1">Counter-offer received:</p>
                                        <p className="text-orange-700 text-sm">
                                            <strong>${req.counter_offer_price?.toFixed(2)}</strong> — {req.counter_offer_description}
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => handleCounterOffer(req.id, true)}
                                                className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleCounterOffer(req.id, false)}
                                                className="px-4 py-1.5 bg-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-200"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {req.status === "fulfilled" && (
                                    <div className="flex items-center gap-3 mt-2">
                                        <p className="text-blue-700 text-sm">The influencer has fulfilled this request!</p>
                                        <button
                                            onClick={() => handleVerify(req.id)}
                                            className="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
                                        >
                                            Confirm & Release Payment
                                        </button>
                                    </div>
                                )}

                                <p className="text-gray-400 text-xs mt-2">
                                    {new Date(req.created_at).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
