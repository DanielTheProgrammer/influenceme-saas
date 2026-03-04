"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface EngagementRequest {
    id: number;
    fan_id: number;
    service_id: number;
    status: "pending" | "approved" | "rejected" | "fulfilled" | "verified" | "disputed" | "cancelled" | "counter_offered";
    created_at: string;
    updated_at: string | null;
    payment_intent_id: string;
    generated_image_preview_url: string | null;
    generated_image_final_url: string | null;
    rejection_reason: string | null;
    counter_offer_price: number | null;
    counter_offer_description: string | null;
    service: {
        id: number;
        engagement_type: string;
        price: number;
        description: string | null;
        duration_days: number | null;
    };
}

export default function InfluencerDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [requests, setRequests] = useState<EngagementRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Auth guard — redirect to login if not authenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login?redirect=/dashboard");
        }
    }, [status, router]);

    const token = (session as any)?.accessToken;

    useEffect(() => {
        if (!token) return;

        const fetchRequests = async () => {
            try {
                const response = await fetch(`${API_URL}/influencer/requests`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Failed to fetch requests.");
                }

                const data: EngagementRequest[] = await response.json();
                setRequests(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [token]);

    // State for modals
    const [showCounterOfferForm, setShowCounterOfferForm] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [currentRequestId, setCurrentRequestId] = useState<number | null>(null);
    const [newCounterPrice, setNewCounterPrice] = useState("");
    const [newCounterDescription, setNewCounterDescription] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");

    const handleAction = async (
        id: number,
        action: "approved" | "rejected" | "counter_offered",
        payload?: { price?: number; description?: string; reason?: string }
    ) => {
        let endpoint = "";
        let body: any = {};

        switch (action) {
            case "approved":
                endpoint = `/influencer/requests/${id}/approve`;
                break;
            case "rejected":
                endpoint = `/influencer/requests/${id}/reject`;
                body = { request_id: id, rejection_reason: payload?.reason || "No reason provided." };
                break;
            case "counter_offered":
                endpoint = `/influencer/requests/${id}/counter-offer`;
                body = { request_id: id, new_price: payload?.price, new_description: payload?.description };
                break;
            default:
                return;
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Failed to ${action} request.`);
            }

            // Refresh list
            const updatedResponse = await fetch(`${API_URL}/influencer/requests`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const updatedData: EngagementRequest[] = await updatedResponse.json();
            setRequests(updatedData);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const openRejectModal = (requestId: number) => {
        setCurrentRequestId(requestId);
        setRejectionReason("");
        setShowRejectModal(true);
    };

    const submitReject = () => {
        if (currentRequestId !== null && rejectionReason) {
            handleAction(currentRequestId, "rejected", { reason: rejectionReason });
            setShowRejectModal(false);
            setCurrentRequestId(null);
        }
    };

    const openCounterOfferForm = (requestId: number) => {
        setCurrentRequestId(requestId);
        setNewCounterPrice("");
        setNewCounterDescription("");
        setShowCounterOfferForm(true);
    };

    const submitCounterOffer = () => {
        if (currentRequestId !== null && newCounterPrice && newCounterDescription) {
            handleAction(currentRequestId, "counter_offered", {
                price: parseFloat(newCounterPrice),
                description: newCounterDescription,
            });
            setShowCounterOfferForm(false);
            setCurrentRequestId(null);
        }
    };

    if (status === "loading" || loading) {
        return <div className="max-w-5xl mx-auto py-8 text-center text-gray-500">Loading...</div>;
    }

    if (status === "unauthenticated") {
        return null;
    }

    return (
        <div className="max-w-5xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Influencer Dashboard</h1>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
            )}

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold">Incoming Fan Requests</h2>
                </div>

                <div className="divide-y divide-gray-200">
                    {requests.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No requests yet!</div>
                    ) : (
                        requests.map((request) => (
                            <div key={request.id} className="p-6 flex flex-col md:flex-row gap-6 items-center hover:bg-gray-50 transition-colors">
                                {/* Preview Image */}
                                <div className="w-32 h-32 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border">
                                    {request.generated_image_preview_url ? (
                                        <img src={request.generated_image_preview_url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-gray-400 text-sm">No Image</span>
                                    )}
                                </div>

                                {/* Request Details */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold">Fan #{request.fan_id}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            request.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                            request.status === "approved" ? "bg-green-100 text-green-800" :
                                            request.status === "rejected" ? "bg-red-100 text-red-800" :
                                            request.status === "counter_offered" ? "bg-purple-100 text-purple-800" :
                                            "bg-gray-100 text-gray-800"
                                        }`}>
                                            {request.status.replace("_", " ").toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 mb-1">
                                        <strong>Service:</strong> {request.service.engagement_type.replace(/_/g, " ")}
                                    </p>
                                    <p className="text-gray-600 mb-1">
                                        <strong>Price:</strong>{" "}
                                        <span className="text-green-600 font-bold">${request.service.price.toFixed(2)}</span>
                                    </p>
                                    {request.status === "counter_offered" && request.counter_offer_price && (
                                        <p className="text-purple-600 mb-1">
                                            <strong>Your Counter:</strong> ${request.counter_offer_price.toFixed(2)} — {request.counter_offer_description}
                                        </p>
                                    )}
                                    {request.status === "rejected" && request.rejection_reason && (
                                        <p className="text-red-600 mb-1">
                                            <strong>Reason:</strong> {request.rejection_reason}
                                        </p>
                                    )}
                                    <p className="text-gray-400 text-sm">
                                        {new Date(request.created_at).toLocaleString()}
                                    </p>
                                </div>

                                {/* Actions */}
                                {request.status === "pending" && (
                                    <div className="flex flex-col gap-2 w-full md:w-auto">
                                        <button
                                            onClick={() => handleAction(request.id, "approved")}
                                            className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => openCounterOfferForm(request.id)}
                                            className="px-6 py-2 bg-blue-100 text-blue-600 font-bold rounded-lg hover:bg-blue-200 transition-colors"
                                        >
                                            Counter-Offer
                                        </button>
                                        <button
                                            onClick={() => openRejectModal(request.id)}
                                            className="px-6 py-2 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200 transition-colors"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold mb-4">Reject Request</h2>
                        <p className="text-gray-600 mb-4">Please provide a reason for rejection.</p>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none mb-4"
                            rows={4}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., 'Content does not fit my brand guidelines.'"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitReject}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
                            >
                                Reject Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Counter-Offer Modal */}
            {showCounterOfferForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold mb-4">Make a Counter-Offer</h2>
                        <p className="text-gray-600 mb-4">Propose a new price and description.</p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Price ($)</label>
                            <input
                                type="number"
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newCounterPrice}
                                onChange={(e) => setNewCounterPrice(e.target.value)}
                                step="0.01"
                                min="0"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Description</label>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                rows={4}
                                value={newCounterDescription}
                                onChange={(e) => setNewCounterDescription(e.target.value)}
                                placeholder="e.g., 'I can do this for $X, but it will include...'"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowCounterOfferForm(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitCounterOffer}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                            >
                                Submit Counter-Offer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
