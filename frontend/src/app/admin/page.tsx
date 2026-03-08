"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
const LEAKY_IG = "leakyapp";
const LEAKY_TT = "leakyapp";

type Tab = "stats" | "verifications" | "registrations" | "disputes";

interface PendingVerification {
    profile_id: number;
    display_name: string;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    instagram_verification_status: string;
    tiktok_verification_status: string;
    verification_code: string | null;
}

interface PendingRegistration {
    profile_id: number;
    user_id: number;
    display_name: string;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    profile_picture_url: string | null;
    followers_count: number | null;
    bio: string | null;
    registered_at: string | null;
}

interface DisputedRequest {
    request_id: number;
    fan_id: number;
    influencer_name: string;
    engagement_type: string;
    price: number;
    dispute_reason: string | null;
    proof_url: string | null;
    proof_screenshot_url: string | null;
    fulfilled_at: string | null;
}

interface PlatformStats {
    total_requests: number;
    pending: number;
    approved: number;
    fulfilled: number;
    verified: number;
    rejected: number;
    cancelled: number;
    disputed: number;
    pending_registrations: number;
    pending_verifications: number;
}

const CARD = "bg-lk-surface border border-lk-border rounded-2xl";
const BTN_APPROVE = "px-4 py-1.5 bg-lk-cyan text-lk-black text-xs font-bold rounded-full hover:brightness-110 transition-all";
const BTN_REJECT = "px-4 py-1.5 bg-rose-500/15 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-full hover:bg-rose-500/25 transition-all";

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const token = (session as any)?.accessToken;
    const userEmail = session?.user?.email;

    const [tab, setTab] = useState<Tab>("stats");
    const [verifications, setVerifications] = useState<PendingVerification[]>([]);
    const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
    const [disputes, setDisputes] = useState<DisputedRequest[]>([]);
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") { router.push("/login"); return; }
        if (status === "authenticated" && ADMIN_EMAIL && userEmail !== ADMIN_EMAIL) router.push("/");
    }, [status, userEmail, router]);

    const fetchAll = useCallback(async () => {
        if (!token) return;
        try {
            const [verRes, regRes, dispRes, statsRes] = await Promise.all([
                fetch(`${API_URL}/admin/verifications`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/admin/registrations`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/admin/disputes`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            if (verRes.ok) setVerifications(await verRes.json());
            if (regRes.ok) setRegistrations(await regRes.json());
            if (dispRes.ok) setDisputes(await dispRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } catch { toast.error("Failed to load admin data."); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleVerify = async (profileId: number, platform: string, approve: boolean) => {
        const endpoint = approve ? `/admin/verify/${profileId}/${platform}` : `/admin/reject-verify/${profileId}/${platform}`;
        const res = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { toast.success(approve ? "Verified!" : "Rejected."); fetchAll(); }
        else toast.error("Action failed.");
    };

    const handleRegistration = async (profileId: number, approve: boolean) => {
        const endpoint = approve ? `/admin/registrations/${profileId}/approve` : `/admin/registrations/${profileId}/reject`;
        const res = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { toast.success(approve ? "Approved — now visible in marketplace." : "Rejected."); fetchAll(); }
        else toast.error("Action failed.");
    };

    const handleDispute = async (requestId: number, action: "approve_payout" | "refund") => {
        const res = await fetch(`${API_URL}/admin/disputes/${requestId}/resolve`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action }),
        });
        if (res.ok) {
            toast.success(action === "approve_payout" ? "Payout approved." : "Refund issued.");
            fetchAll();
        } else toast.error("Action failed.");
    };

    if (status === "loading" || loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-8 pt-24 animate-pulse space-y-4">
                <div className="h-8 w-48 bg-lk-surface rounded-lg" />
                <div className="h-40 bg-lk-surface rounded-2xl border border-lk-border" />
            </div>
        );
    }

    if (status === "unauthenticated" || (ADMIN_EMAIL && userEmail !== ADMIN_EMAIL)) return null;

    const TABS: { id: Tab; label: string; count?: number }[] = [
        { id: "stats", label: "Stats" },
        { id: "verifications", label: "Verifications", count: verifications.length },
        { id: "registrations", label: "Registrations", count: registrations.length },
        { id: "disputes", label: "Disputes", count: disputes.length },
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 pt-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-1">Internal</p>
                    <h1 className="text-3xl font-black text-lk-white" style={{ fontFamily: "var(--font-syne)" }}>Admin Panel</h1>
                </div>
                <span className="px-3 py-1 bg-lk-amber/15 text-lk-amber border border-lk-amber/20 text-xs font-bold rounded-full tracking-wider">
                    ADMIN
                </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 flex-wrap">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                            tab === t.id
                                ? "bg-lk-amber text-lk-black"
                                : "bg-lk-surface border border-lk-border text-lk-muted-bright hover:border-lk-border-bright"
                        }`}
                        style={{ fontFamily: "var(--font-syne)" }}
                    >
                        {t.label}
                        {t.count !== undefined && t.count > 0 && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-lk-black/20" : "bg-rose-500 text-white"}`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Stats ── */}
            {tab === "stats" && stats && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total Requests", value: stats.total_requests, color: "text-lk-white" },
                            { label: "Pending Requests", value: stats.pending, color: "text-yellow-400" },
                            { label: "Fulfilled", value: stats.fulfilled, color: "text-lk-amber" },
                            { label: "Verified / Paid", value: stats.verified, color: "text-lk-cyan" },
                            { label: "Disputed", value: stats.disputed, color: "text-rose-400" },
                            { label: "Rejected", value: stats.rejected, color: "text-rose-300" },
                            { label: "Pending Registrations", value: stats.pending_registrations, color: "text-lk-amber" },
                            { label: "Pending Verifications", value: stats.pending_verifications, color: "text-lk-amber" },
                        ].map(s => (
                            <div key={s.label} className={`${CARD} p-5`}>
                                <p className={`text-3xl font-black ${s.color}`} style={{ fontFamily: "var(--font-syne)" }}>{s.value}</p>
                                <p className="text-xs text-lk-muted mt-1 font-medium">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Verifications ── */}
            {tab === "verifications" && (
                <div className={CARD}>
                    <div className="p-6 border-b border-lk-border">
                        <h2 className="font-black text-lk-white text-lg" style={{ fontFamily: "var(--font-syne)" }}>Pending Social Verifications</h2>
                        <p className="text-lk-muted text-sm mt-1">
                            Check the DM inbox of <span className="text-lk-amber font-semibold">@{LEAKY_IG}</span> on Instagram and <span className="text-lk-amber font-semibold">@{LEAKY_TT}</span> on TikTok. Confirm the code matches, then approve.
                        </p>
                    </div>

                    {verifications.length === 0 ? (
                        <div className="p-12 text-center text-lk-muted">No pending verifications.</div>
                    ) : (
                        <div className="divide-y divide-lk-border">
                            {verifications.map(v => (
                                <div key={v.profile_id} className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="font-bold text-lk-white">{v.display_name}</p>
                                            {v.verification_code && (
                                                <span className="mt-1 inline-block font-mono text-sm bg-lk-black border border-lk-border px-3 py-1 rounded-lg text-lk-amber font-bold tracking-widest">
                                                    {v.verification_code}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {v.instagram_handle && v.instagram_verification_status === "pending" && (
                                            <div className="flex items-center justify-between bg-lk-black border border-lk-border rounded-xl p-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-lk-white">Instagram: @{v.instagram_handle}</p>
                                                    <div className="flex gap-3 mt-1">
                                                        <a href={`https://www.instagram.com/${v.instagram_handle}/`} target="_blank" rel="noopener noreferrer" className="text-xs text-lk-cyan hover:underline">View profile →</a>
                                                        <a href={`https://ig.me/m/${LEAKY_IG}`} target="_blank" rel="noopener noreferrer" className="text-xs text-lk-amber hover:underline">Open @{LEAKY_IG} DMs →</a>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleVerify(v.profile_id, "instagram", true)} className={BTN_APPROVE}>Approve</button>
                                                    <button onClick={() => handleVerify(v.profile_id, "instagram", false)} className={BTN_REJECT}>Reject</button>
                                                </div>
                                            </div>
                                        )}

                                        {v.tiktok_handle && v.tiktok_verification_status === "pending" && (
                                            <div className="flex items-center justify-between bg-lk-black border border-lk-border rounded-xl p-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-lk-white">TikTok: @{v.tiktok_handle}</p>
                                                    <div className="flex gap-3 mt-1">
                                                        <a href={`https://www.tiktok.com/@${v.tiktok_handle}`} target="_blank" rel="noopener noreferrer" className="text-xs text-lk-cyan hover:underline">View profile →</a>
                                                        <a href={`https://www.tiktok.com/@${LEAKY_TT}`} target="_blank" rel="noopener noreferrer" className="text-xs text-lk-amber hover:underline">Open @{LEAKY_TT} DMs →</a>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleVerify(v.profile_id, "tiktok", true)} className={BTN_APPROVE}>Approve</button>
                                                    <button onClick={() => handleVerify(v.profile_id, "tiktok", false)} className={BTN_REJECT}>Reject</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Registrations ── */}
            {tab === "registrations" && (
                <div className={CARD}>
                    <div className="p-6 border-b border-lk-border">
                        <h2 className="font-black text-lk-white text-lg" style={{ fontFamily: "var(--font-syne)" }}>New Influencer Registrations</h2>
                        <p className="text-lk-muted text-sm mt-1">Review new influencer sign-ups before they appear in the marketplace.</p>
                    </div>

                    {registrations.length === 0 ? (
                        <div className="p-12 text-center text-lk-muted">No pending registrations.</div>
                    ) : (
                        <div className="divide-y divide-lk-border">
                            {registrations.map(r => (
                                <div key={r.profile_id} className="p-6 flex gap-4 items-start">
                                    {r.profile_picture_url ? (
                                        <Image src={r.profile_picture_url} alt={r.display_name} width={52} height={52}
                                            className="w-14 h-14 rounded-full object-cover border border-lk-border flex-shrink-0" unoptimized />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-lk-black border border-lk-border flex items-center justify-center flex-shrink-0">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-lk-muted"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-bold text-lk-white">{r.display_name}</p>
                                                <div className="flex flex-wrap gap-3 mt-1">
                                                    {r.instagram_handle && <a href={`https://www.instagram.com/${r.instagram_handle}/`} target="_blank" rel="noopener noreferrer" className="text-xs text-lk-cyan hover:underline">@{r.instagram_handle} (IG) →</a>}
                                                    {r.tiktok_handle && <a href={`https://www.tiktok.com/@${r.tiktok_handle}`} target="_blank" rel="noopener noreferrer" className="text-xs text-lk-cyan hover:underline">@{r.tiktok_handle} (TT) →</a>}
                                                </div>
                                                {r.followers_count && <p className="text-xs text-lk-muted mt-1">{r.followers_count.toLocaleString()} followers</p>}
                                                {r.bio && <p className="text-xs text-lk-muted mt-1 line-clamp-2">{r.bio}</p>}
                                                {r.registered_at && <p className="text-xs text-lk-muted mt-2">{new Date(r.registered_at).toLocaleString()}</p>}
                                            </div>
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button onClick={() => handleRegistration(r.profile_id, true)} className={BTN_APPROVE}>Approve</button>
                                                <button onClick={() => handleRegistration(r.profile_id, false)} className={BTN_REJECT}>Reject</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Disputes ── */}
            {tab === "disputes" && (
                <div className={CARD}>
                    <div className="p-6 border-b border-lk-border">
                        <h2 className="font-black text-lk-white text-lg" style={{ fontFamily: "var(--font-syne)" }}>Disputed Requests</h2>
                        <p className="text-lk-muted text-sm mt-1">Review fan disputes. Approve the payout to the influencer, or issue a refund to the fan.</p>
                    </div>

                    {disputes.length === 0 ? (
                        <div className="p-12 text-center text-lk-muted">No disputes — all clear.</div>
                    ) : (
                        <div className="divide-y divide-lk-border">
                            {disputes.map(d => (
                                <div key={d.request_id} className="p-6">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div>
                                            <p className="font-bold text-lk-white capitalize">{d.engagement_type.replace(/_/g, " ")} — <span className="text-lk-amber">${d.price.toFixed(2)}</span></p>
                                            <p className="text-lk-muted text-sm">Influencer: {d.influencer_name} · Fan ID: {d.fan_id}</p>
                                            {d.fulfilled_at && <p className="text-xs text-lk-muted mt-0.5">Fulfilled: {new Date(d.fulfilled_at).toLocaleString()}</p>}
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button onClick={() => handleDispute(d.request_id, "approve_payout")} className={BTN_APPROVE}>Approve Payout</button>
                                            <button onClick={() => handleDispute(d.request_id, "refund")} className={BTN_REJECT}>Refund Fan</button>
                                        </div>
                                    </div>

                                    {d.dispute_reason && (
                                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 mb-3">
                                            <p className="text-xs text-lk-muted-bright font-semibold mb-1">Fan&apos;s dispute reason</p>
                                            <p className="text-sm text-lk-white">{d.dispute_reason}</p>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-3">
                                        {d.proof_url && (
                                            <a href={d.proof_url} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-lk-amber text-sm hover:underline">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                View post proof
                                            </a>
                                        )}
                                        {d.proof_screenshot_url && (
                                            <a href={d.proof_screenshot_url} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-lk-amber text-sm hover:underline">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                View screenshot
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
