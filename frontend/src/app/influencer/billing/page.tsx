"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Earnings {
    earnings_balance: number;
    total_earned: number;
    payout_info: string | null;
    platform_fee_percent: number;
}

export default function InfluencerBillingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const token = (session as any)?.accessToken;

    const [earnings, setEarnings] = useState<Earnings | null>(null);
    const [loading, setLoading] = useState(true);
    const [payoutInfo, setPayoutInfo] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login?redirect=/influencer/billing");
    }, [status, router]);

    useEffect(() => {
        if (!token) return;
        fetch(`${API_URL}/influencer/earnings`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) {
                    setEarnings(data);
                    setPayoutInfo(data.payout_info || "");
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [token]);

    const handleSavePayoutInfo = async () => {
        if (!payoutInfo.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/influencer/earnings/payout-info`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ payout_info: payoutInfo }),
            });
            if (!res.ok) throw new Error("Failed to save.");
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4 space-y-4">
                <div className="animate-pulse h-8 bg-lk-surface rounded w-1/3" />
                <div className="animate-pulse h-40 bg-lk-surface rounded-2xl" />
                <div className="animate-pulse h-40 bg-lk-surface rounded-2xl" />
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    const PAYOUT_MIN = 50; // minimum balance before payout request
    const canRequestPayout = (earnings?.earnings_balance ?? 0) >= PAYOUT_MIN;

    return (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <Link href="/dashboard" className="text-lk-muted hover:text-lk-white text-sm transition-colors">
                    ← Back to Dashboard
                </Link>
            </div>

            <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-1">Earnings</p>
                <h1 className="text-2xl font-black text-lk-white tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>
                    Billing & Payouts
                </h1>
            </div>

            {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm">{error}</div>
            )}

            {/* Earnings cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-lk-surface border border-lk-border rounded-2xl p-5">
                    <p className="text-xs font-semibold text-lk-muted uppercase tracking-widest mb-2">Pending Payout</p>
                    <p className="text-3xl font-black text-lk-amber" style={{ fontFamily: "var(--font-syne)" }}>
                        ${(earnings?.earnings_balance ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-lk-muted mt-1">Min. ${PAYOUT_MIN} to request</p>
                </div>
                <div className="bg-lk-surface border border-lk-border rounded-2xl p-5">
                    <p className="text-xs font-semibold text-lk-muted uppercase tracking-widest mb-2">Lifetime Earned</p>
                    <p className="text-3xl font-black text-lk-cyan" style={{ fontFamily: "var(--font-syne)" }}>
                        ${(earnings?.total_earned ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-lk-muted mt-1">After {earnings?.platform_fee_percent ?? 20}% platform fee</p>
                </div>
            </div>

            {/* How payouts work */}
            <div className="bg-lk-black border border-lk-border rounded-2xl p-5 text-sm text-lk-muted-bright space-y-2">
                <p className="font-semibold text-lk-white">How payouts work</p>
                <p>Earnings accumulate when fans confirm deals are complete (or after the 48-hour auto-release window).</p>
                <p>We pay out <span className="text-lk-amber font-semibold">every Monday</span> to all creators with a balance over ${PAYOUT_MIN}. Provide your PayPal email or bank details below and we&apos;ll send it automatically.</p>
            </div>

            {/* Payout info */}
            <div className="bg-lk-surface border border-lk-border rounded-2xl p-5 space-y-4">
                <div>
                    <p className="text-sm font-semibold text-lk-white mb-1">Your payout details</p>
                    <p className="text-xs text-lk-muted">PayPal email, Venmo handle, or bank transfer info (country + IBAN/routing). Keep this up to date.</p>
                </div>
                <textarea
                    className="w-full bg-lk-black border border-lk-border text-lk-white placeholder:text-lk-muted rounded-xl px-4 py-3 text-sm focus:border-lk-amber outline-none transition-colors resize-none"
                    rows={3}
                    placeholder="e.g. PayPal: you@email.com  or  Bank: IBAN DE89... / Routing 021000021"
                    value={payoutInfo}
                    onChange={e => setPayoutInfo(e.target.value)}
                />
                <button
                    onClick={handleSavePayoutInfo}
                    disabled={saving || !payoutInfo.trim()}
                    className="px-6 py-2.5 bg-lk-amber text-lk-black font-bold rounded-full text-sm hover:brightness-110 disabled:opacity-40 transition-all"
                    style={{ fontFamily: "var(--font-syne)" }}
                >
                    {saving ? "Saving…" : saved ? "✓ Saved" : "Save Payout Details"}
                </button>
            </div>

            {/* Payout request */}
            <div className={`bg-lk-surface border rounded-2xl p-5 ${canRequestPayout ? "border-lk-cyan/40" : "border-lk-border"}`}>
                <p className="text-sm font-semibold text-lk-white mb-1">Request early payout</p>
                <p className="text-xs text-lk-muted mb-4">
                    {canRequestPayout
                        ? "You have enough balance. Email us at payouts@leaky.app and we'll process it within 24h."
                        : `Reach $${PAYOUT_MIN} in pending earnings to request an early payout.`}
                </p>
                <a
                    href={canRequestPayout ? "mailto:payouts@leaky.app" : undefined}
                    className={`inline-block px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
                        canRequestPayout
                            ? "bg-lk-cyan text-lk-black hover:brightness-110"
                            : "bg-lk-black border border-lk-border text-lk-muted cursor-not-allowed"
                    }`}
                    style={{ fontFamily: "var(--font-syne)" }}
                >
                    Email Payout Request →
                </a>
            </div>
        </div>
    );
}
