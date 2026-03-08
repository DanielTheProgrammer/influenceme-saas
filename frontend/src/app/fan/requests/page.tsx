"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DISPUTE_HOURS = 48;

interface EngagementRequest {
    id: number;
    service_id: number;
    status: string;
    created_at: string;
    fulfilled_at: string | null;
    generated_image_preview_url: string | null;
    rejection_reason: string | null;
    counter_offer_price: number | null;
    counter_offer_description: string | null;
    proof_url: string | null;
    proof_screenshot_url: string | null;
    dispute_reason: string | null;
    service: {
        id: number;
        engagement_type: string;
        price: number;
        description: string | null;
        influencer_id: number;
    } | null;
}

const STATUS_STYLES: Record<string, string> = {
    pending:         "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
    approved:        "bg-lk-cyan/15 text-lk-cyan border border-lk-cyan/20",
    rejected:        "bg-rose-500/15 text-rose-400 border border-rose-500/20",
    fulfilled:       "bg-lk-amber/15 text-lk-amber border border-lk-amber/20",
    verified:        "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    disputed:        "bg-rose-500/15 text-rose-400 border border-rose-500/20",
    counter_offered: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
    cancelled:       "bg-lk-border text-lk-muted border border-lk-border",
};

function useCountdown(targetIso: string | null) {
    const getMs = () => {
        if (!targetIso) return 0;
        const deadline = new Date(targetIso).getTime() + DISPUTE_HOURS * 3600 * 1000;
        return Math.max(0, deadline - Date.now());
    };
    const [ms, setMs] = useState(getMs);
    useEffect(() => {
        if (!targetIso) return;
        const t = setInterval(() => setMs(getMs()), 1000);
        return () => clearInterval(t);
    }, [targetIso]);
    return ms;
}

function CountdownBadge({ fulfilledAt }: { fulfilledAt: string }) {
    const ms = useCountdown(fulfilledAt);
    if (ms <= 0) return <span className="text-xs text-lk-muted">Window closed — payment auto-releasing</span>;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const pct = (ms / (DISPUTE_HOURS * 3600000)) * 100;
    const color = pct > 50 ? "bg-lk-amber" : pct > 20 ? "bg-orange-400" : "bg-rose-400";
    return (
        <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-lk-muted">Dispute window closes in</span>
                <span className="font-mono font-bold text-lk-white tabular-nums">
                    {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
                </span>
            </div>
            <div className="h-1 w-full bg-lk-border rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export default function FanRequestsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [requests, setRequests] = useState<EngagementRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [disputingId, setDisputingId] = useState<number | null>(null);
    const [disputeReason, setDisputeReason] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login?redirect=/fan/requests");
    }, [status, router]);

    const token = (session as any)?.accessToken;

    const fetchRequests = useCallback(async () => {
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
    }, [token]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

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

    const handleCancel = async (requestId: number) => {
        try {
            const res = await fetch(`${API_URL}/marketplace/requests/${requestId}/cancel`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Cancel failed.");
            await fetchRequests();
            toast.success("Request cancelled.");
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
            toast.success("Payment released to creator!");
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDispute = async (requestId: number) => {
        if (!disputeReason.trim()) { toast.error("Please describe the issue."); return; }
        try {
            const res = await fetch(`${API_URL}/marketplace/requests/${requestId}/dispute`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ reason: disputeReason }),
            });
            if (!res.ok) {
                const e = await res.json();
                throw new Error(e.detail || "Dispute failed.");
            }
            await fetchRequests();
            setDisputingId(null);
            setDisputeReason("");
            toast.success("Dispute submitted — our team will review within 24h.");
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-lk-surface rounded-2xl border border-lk-border" />)}
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-10">
                <div>
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-2">Your Activity</p>
                    <h1 className="text-3xl font-bold text-lk-white" style={{ fontFamily: "var(--font-syne)" }}>
                        My Requests
                    </h1>
                </div>
                <Link
                    href="/browse"
                    className="px-5 py-2.5 bg-lk-amber text-lk-black text-sm font-bold rounded-full hover:brightness-110 transition-all whitespace-nowrap"
                >
                    Browse Creators →
                </Link>
            </div>

            {requests.length === 0 ? (
                <div className="text-center py-20 bg-lk-surface rounded-2xl border border-lk-border">
                    <p className="text-lk-muted-bright text-base mb-4">You haven&apos;t submitted any requests yet.</p>
                    <Link href="/browse" className="text-lk-amber font-semibold hover:brightness-110 transition-colors text-sm">
                        Browse creators to get started →
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <div key={req.id} className="bg-lk-surface border border-lk-border rounded-2xl p-6 flex flex-col md:flex-row gap-5 hover:border-lk-border-bright transition-colors">
                            {req.generated_image_preview_url && (
                                <Image
                                    src={req.generated_image_preview_url}
                                    alt="Preview"
                                    width={96}
                                    height={96}
                                    className="w-24 h-24 rounded-xl object-cover flex-shrink-0 border border-lk-border"
                                    unoptimized
                                />
                            )}
                            <div className="flex-1">
                                <div className="flex flex-wrap gap-2 justify-between items-start mb-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-lk-white capitalize" style={{ fontFamily: "var(--font-syne)" }}>
                                            {req.service?.engagement_type.replace(/_/g, " ") ?? `Service #${req.service_id}`}
                                        </p>
                                        {req.service && (
                                            <p className="text-lk-amber font-semibold text-sm mt-0.5">
                                                ${req.service.price.toFixed(2)}
                                                {" · "}
                                                <Link href={`/influencers/${req.service.influencer_id}`} className="text-lk-muted-bright hover:text-lk-cyan transition-colors text-sm">
                                                    View creator
                                                </Link>
                                            </p>
                                        )}
                                    </div>
                                    <span className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${STATUS_STYLES[req.status] || STATUS_STYLES.cancelled}`}>
                                        {req.status.replace(/_/g, " ")}
                                    </span>
                                </div>

                                {req.status === "rejected" && req.rejection_reason && (
                                    <p className="text-rose-400 text-sm mb-3"><strong>Reason:</strong> {req.rejection_reason}</p>
                                )}

                                {req.status === "counter_offered" && (
                                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-3">
                                        <p className="text-orange-300 text-sm font-semibold mb-1">Counter-offer received:</p>
                                        <p className="text-orange-200/70 text-sm">
                                            <strong>${req.counter_offer_price?.toFixed(2)}</strong> — {req.counter_offer_description}
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => handleCounterOffer(req.id, true)} className="px-4 py-1.5 bg-lk-cyan text-lk-black text-sm font-bold rounded-full hover:brightness-110 transition-all">Accept</button>
                                            <button onClick={() => handleCounterOffer(req.id, false)} className="px-4 py-1.5 bg-rose-500/20 text-rose-400 text-sm font-bold rounded-full hover:bg-rose-500/30 transition-all">Decline</button>
                                        </div>
                                    </div>
                                )}

                                {req.status === "fulfilled" && (
                                    <div className="bg-lk-amber/10 border border-lk-amber/20 rounded-xl p-4 mt-2">
                                        <p className="text-lk-amber text-sm font-semibold mb-3">Creator has marked this as fulfilled</p>

                                        {/* Countdown */}
                                        {req.fulfilled_at && <CountdownBadge fulfilledAt={req.fulfilled_at} />}

                                        {/* Proof links */}
                                        {(req.proof_url || req.proof_screenshot_url) && (
                                            <div className="flex flex-wrap gap-3 mb-4">
                                                {req.proof_url && (
                                                    <a href={req.proof_url} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-lk-amber/80 hover:text-lk-amber text-sm font-medium transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                        View post
                                                    </a>
                                                )}
                                                {req.proof_screenshot_url && (
                                                    <a href={req.proof_screenshot_url} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-lk-amber/80 hover:text-lk-amber text-sm font-medium transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        View screenshot
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {/* Confirm or dispute */}
                                        {disputingId === req.id ? (
                                            <div className="space-y-2">
                                                <textarea
                                                    value={disputeReason}
                                                    onChange={e => setDisputeReason(e.target.value)}
                                                    rows={3}
                                                    placeholder="Describe the issue — what wasn't delivered?"
                                                    className="w-full bg-lk-black border border-rose-500/30 text-lk-white placeholder:text-lk-muted rounded-xl px-4 py-3 text-sm outline-none focus:border-rose-400 resize-none"
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleDispute(req.id)}
                                                        className="px-4 py-1.5 bg-rose-500 text-white text-sm font-bold rounded-full hover:bg-rose-400 transition-all">
                                                        Submit Dispute
                                                    </button>
                                                    <button onClick={() => { setDisputingId(null); setDisputeReason(""); }}
                                                        className="px-4 py-1.5 text-lk-muted text-sm hover:text-lk-muted-bright transition-colors">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => handleVerify(req.id)}
                                                    className="px-4 py-1.5 bg-lk-amber text-lk-black text-sm font-bold rounded-full hover:brightness-110 transition-all">
                                                    Got it — release payment ✓
                                                </button>
                                                <button onClick={() => setDisputingId(req.id)}
                                                    className="px-4 py-1.5 bg-rose-500/15 text-rose-400 border border-rose-500/20 text-sm font-bold rounded-full hover:bg-rose-500/25 transition-all">
                                                    Dispute
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {req.status === "disputed" && (
                                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mt-2">
                                        <p className="text-rose-400 text-sm font-semibold mb-1">Dispute under review</p>
                                        <p className="text-lk-muted text-xs">Our team will reach out within 24 hours.</p>
                                        {req.dispute_reason && <p className="text-lk-muted-bright text-xs mt-2 italic">&ldquo;{req.dispute_reason}&rdquo;</p>}
                                    </div>
                                )}

                                {req.status === "verified" && (
                                    <div className="flex items-center gap-2 mt-2 text-emerald-400 text-xs font-semibold">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                                        Complete — payment released
                                    </div>
                                )}

                                {(req.status === "pending" || req.status === "counter_offered") && (
                                    <div className="mt-3">
                                        <button onClick={() => handleCancel(req.id)}
                                            className="px-3 py-1 text-xs text-lk-muted hover:text-rose-400 border border-lk-border hover:border-rose-500/30 rounded-full transition-colors">
                                            Cancel Request
                                        </button>
                                    </div>
                                )}

                                <p className="text-lk-muted text-xs mt-3">
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
