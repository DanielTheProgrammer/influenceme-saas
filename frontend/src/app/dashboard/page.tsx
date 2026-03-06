"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const COMPANY_INSTAGRAM = "influenceme.app";
const COMPANY_TIKTOK = "influenceme.app";

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

interface InfluencerProfile {
    id: number;
    verification_code: string | null;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    instagram_verification_status: string;
    tiktok_verification_status: string;
}

export default function InfluencerDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [requests, setRequests] = useState<EngagementRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [noProfile, setNoProfile] = useState(false);
    const [profile, setProfile] = useState<InfluencerProfile | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);

    // Auth guard — redirect to login if not authenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login?redirect=/dashboard");
        }
    }, [status, router]);

    const token = (session as any)?.accessToken;

    useEffect(() => {
        if (!token) return;

        const fetchData = async () => {
            try {
                const [requestsRes, profileRes] = await Promise.all([
                    fetch(`${API_URL}/influencer/requests`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${API_URL}/influencers/profile`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                if (!requestsRes.ok) {
                    const errorData = await requestsRes.json();
                    if (requestsRes.status === 404 && errorData.detail?.includes("profile")) {
                        setNoProfile(true);
                        return;
                    }
                    toast.error(errorData.detail || "Failed to fetch requests.");
                    return;
                }

                const data: EngagementRequest[] = await requestsRes.json();
                setRequests(data);

                if (profileRes.ok) {
                    const profileData: InfluencerProfile = await profileRes.json();
                    setProfile(profileData);
                }
            } catch (err: any) {
                toast.error(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const submitVerification = async (platform: "instagram" | "tiktok") => {
        try {
            const res = await fetch(`${API_URL}/influencer/verification/request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ platform }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to submit.");
            }
            toast.success("DM request submitted! We'll verify it shortly.");
            // Refresh profile
            const profileRes = await fetch(`${API_URL}/influencers/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (profileRes.ok) {
                setProfile(await profileRes.json());
            }
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    // State for modals
    const [showCounterOfferForm, setShowCounterOfferForm] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showFulfillModal, setShowFulfillModal] = useState(false);
    const [currentRequestId, setCurrentRequestId] = useState<number | null>(null);
    const [newCounterPrice, setNewCounterPrice] = useState("");
    const [newCounterDescription, setNewCounterDescription] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");
    const [proofUrl, setProofUrl] = useState("");

    const handleAction = async (
        id: number,
        action: "approved" | "rejected" | "counter_offered" | "fulfilled",
        payload?: { price?: number; description?: string; reason?: string; finalUrl?: string; proofUrl?: string }
    ) => {
        let endpoint = "";
        let body: any = {};

        switch (action) {
            case "approved":
                endpoint = `/influencer/requests/${id}/approve`;
                break;
            case "rejected":
                endpoint = `/influencer/requests/${id}/reject`;
                body = { rejection_reason: payload?.reason || "No reason provided." };
                break;
            case "counter_offered":
                endpoint = `/influencer/requests/${id}/counter-offer`;
                body = { new_price: payload?.price, new_description: payload?.description };
                break;
            case "fulfilled":
                endpoint = `/influencer/requests/${id}/fulfill`;
                body = { proof_url: payload?.proofUrl || "", final_image_url: payload?.finalUrl || null };
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
            const msgs: Record<string, string> = {
                approved: "Request approved!",
                rejected: "Request rejected.",
                counter_offered: "Counter-offer sent!",
                fulfilled: "Marked as fulfilled!",
            };
            toast.success(msgs[action] || "Done!");
        } catch (err: any) {
            toast.error(err.message);
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

    const openFulfillModal = (requestId: number) => {
        setCurrentRequestId(requestId);
        setProofUrl("");
        setShowFulfillModal(true);
    };

    const submitFulfill = () => {
        if (currentRequestId !== null && proofUrl.trim()) {
            handleAction(currentRequestId, "fulfilled", { proofUrl: proofUrl.trim() });
            setShowFulfillModal(false);
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
        return (
            <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
                <div className="h-9 w-64 bg-gray-200 rounded-lg mb-8" />
                {/* Verification panels skeleton */}
                <div className="mb-8">
                    <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
                    <div className="grid md:grid-cols-2 gap-4">
                        {[1, 2].map(i => (
                            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 bg-gray-200 rounded" />
                                        <div className="h-4 w-24 bg-gray-200 rounded" />
                                    </div>
                                    <div className="h-5 w-16 bg-gray-200 rounded-full" />
                                </div>
                                <div className="h-4 w-3/4 bg-gray-200 rounded mb-3" />
                                <div className="h-9 w-full bg-gray-200 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>
                {/* Requests skeleton */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <div className="h-6 w-48 bg-gray-200 rounded" />
                    </div>
                    <div className="divide-y divide-gray-100">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="p-6 flex gap-6">
                                <div className="w-32 h-32 bg-gray-200 rounded-lg flex-shrink-0" />
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between">
                                        <div className="h-5 w-24 bg-gray-200 rounded" />
                                        <div className="h-5 w-20 bg-gray-200 rounded-full" />
                                    </div>
                                    <div className="h-4 w-48 bg-gray-200 rounded" />
                                    <div className="h-4 w-32 bg-gray-200 rounded" />
                                    <div className="h-3 w-40 bg-gray-100 rounded" />
                                </div>
                                <div className="flex flex-col gap-2 w-28">
                                    <div className="h-9 bg-gray-200 rounded-lg" />
                                    <div className="h-9 bg-gray-100 rounded-lg" />
                                    <div className="h-9 bg-gray-100 rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return null;
    }

    if (noProfile) {
        return (
            <div className="max-w-2xl mx-auto py-16 text-center">
                <div className="text-6xl mb-4">👤</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Set up your profile first</h1>
                <p className="text-gray-500 mb-6">
                    Create your influencer profile and add services before you can receive fan requests.
                </p>
                <Link
                    href="/influencer"
                    className="inline-block px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Create Profile
                </Link>
            </div>
        );
    }

    const VerificationBadge = ({ status }: { status: string }) => {
        if (status === "verified") return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">Verified</span>;
        if (status === "pending") return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Pending Review</span>;
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">Unverified</span>;
    };

    const VerificationPanel = ({
        platform,
        handle,
        status,
        dmUrl,
        icon,
    }: {
        platform: "instagram" | "tiktok";
        handle: string | null;
        status: string;
        dmUrl: string;
        icon: React.ReactNode;
    }) => {
        if (!handle) return null;
        const code = profile?.verification_code || "";
        const dmMessage = encodeURIComponent(`Verification: ${code}`);

        return (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {icon}
                        <span className="font-bold text-gray-900 capitalize">{platform}</span>
                        <span className="text-gray-500 text-sm">@{handle}</span>
                    </div>
                    <VerificationBadge status={status} />
                </div>

                {status === "verified" ? (
                    <p className="text-green-600 text-sm">Your {platform} account is verified.</p>
                ) : status === "pending" ? (
                    <p className="text-yellow-700 text-sm">We received your DM request and will verify it shortly. Check back later.</p>
                ) : (
                    <>
                        <p className="text-gray-600 text-sm mb-4">
                            To verify your {platform} account, send a DM to our official {platform} profile with the code below.
                        </p>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 font-mono text-sm font-bold tracking-widest text-gray-800">
                                {code || "Loading..."}
                            </div>
                            <button
                                onClick={() => copyCode(code)}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                {copiedCode ? "Copied!" : "Copy"}
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <a
                                href={`${dmUrl}?text=${dmMessage}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-center px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                                Open DM
                            </a>
                            <button
                                onClick={() => submitVerification(platform)}
                                className="flex-1 px-4 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors text-sm"
                            >
                                I&apos;ve sent the DM
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Influencer Dashboard</h1>

            {/* Social Verification Panels */}
            {profile && (profile.instagram_handle || profile.tiktok_handle) && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4">Social Verification</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <VerificationPanel
                            platform="instagram"
                            handle={profile.instagram_handle}
                            status={profile.instagram_verification_status}
                            dmUrl={`https://ig.me/m/${COMPANY_INSTAGRAM}`}
                            icon={
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                                    <circle cx="12" cy="12" r="4"/>
                                    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                                </svg>
                            }
                        />
                        <VerificationPanel
                            platform="tiktok"
                            handle={profile.tiktok_handle}
                            status={profile.tiktok_verification_status}
                            dmUrl={`https://www.tiktok.com/@${COMPANY_TIKTOK}`}
                            icon={
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.83 1.56V6.79a4.85 4.85 0 01-1.06-.1z"/>
                                </svg>
                            }
                        />
                    </div>
                </div>
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
                                        <Image src={request.generated_image_preview_url} alt="Preview" width={128} height={128} className="w-full h-full object-cover" unoptimized />
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
                                            {request.status.replace(/_/g, " ").toUpperCase()}
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
                                {request.status === "approved" && (
                                    <div className="flex flex-col gap-2 w-full md:w-auto">
                                        <p className="text-green-700 text-sm font-medium text-center">Ready to fulfill</p>
                                        <button
                                            onClick={() => openFulfillModal(request.id)}
                                            className="px-6 py-2 bg-violet-600 text-white font-bold rounded-lg hover:bg-violet-700 transition-colors"
                                        >
                                            Mark as Fulfilled
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

            {/* Fulfill Modal */}
            {showFulfillModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold mb-2">Mark as Fulfilled</h2>
                        <p className="text-gray-600 mb-4 text-sm">
                            Provide a link to proof of fulfillment (screenshot, post URL, story URL). The fan will review this before releasing payment.
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Proof URL *</label>
                            <input
                                type="url"
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-violet-500 outline-none"
                                value={proofUrl}
                                onChange={(e) => setProofUrl(e.target.value)}
                                placeholder="https://www.instagram.com/p/... or screenshot link"
                            />
                            <p className="text-xs text-gray-400 mt-1">Link to the post, story, or screenshot showing you completed the engagement.</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowFulfillModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitFulfill}
                                disabled={!proofUrl.trim()}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg font-bold hover:bg-violet-700 transition-colors disabled:opacity-50"
                            >
                                Submit Proof & Fulfill
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
