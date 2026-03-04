"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface BillingStatus {
    stripe_account_id: string | null;
    stripe_onboarding_complete: boolean;
    subscription_status: string | null;
    subscription_tier: string | null;
}

export default function InfluencerBillingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const token = (session as any)?.accessToken;

    const [billing, setBilling] = useState<BillingStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login?redirect=/influencer/billing");
    }, [status, router]);

    useEffect(() => {
        if (!token) return;
        fetch(`${API_URL}/influencer/billing/status`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) setBilling(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [token]);

    const handleStripeOnboard = async () => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/influencer/stripe/onboard`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to start Stripe onboarding.");
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSubscribe = async (tier: "pro") => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/influencer/subscription/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ tier }),
            });
            if (!res.ok) throw new Error("Failed to start subscription.");
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setSuccess("Subscription activated!");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="max-w-3xl mx-auto py-8 space-y-4">
                <div className="animate-pulse h-10 bg-gray-200 rounded w-1/3" />
                <div className="animate-pulse h-48 bg-gray-200 rounded-xl" />
                <div className="animate-pulse h-48 bg-gray-200 rounded-xl" />
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    const isPro = billing?.subscription_tier === "pro";
    const hasStripe = billing?.stripe_onboarding_complete;

    return (
        <div className="max-w-3xl mx-auto py-8 space-y-8">
            <div className="flex items-center gap-4 mb-2">
                <Link href="/influencer" className="text-blue-600 hover:underline text-sm">← Back to Profile</Link>
            </div>
            <h1 className="text-3xl font-bold">Billing & Payouts</h1>

            {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
            {success && <div className="p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>}

            {/* Stripe Connect */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold mb-2">Payout Account</h2>
                <p className="text-gray-500 text-sm mb-4">
                    Connect your bank account via Stripe to receive payouts when fans release payment.
                </p>
                {hasStripe ? (
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ Connected</span>
                        <span className="text-gray-400 text-sm">Account: {billing?.stripe_account_id}</span>
                    </div>
                ) : (
                    <button
                        onClick={handleStripeOnboard}
                        disabled={actionLoading}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
                    >
                        {actionLoading ? "Redirecting..." : "Connect with Stripe →"}
                    </button>
                )}
            </div>

            {/* Subscription */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold mb-2">Subscription Plan</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* Basic */}
                    <div className={`border rounded-xl p-5 ${!isPro ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                        <h3 className="font-bold text-lg mb-1">Basic</h3>
                        <div className="text-3xl font-extrabold mb-1 text-blue-600">Free</div>
                        <p className="text-gray-400 text-sm mb-3">20% platform fee per transaction</p>
                        <ul className="text-sm text-gray-600 space-y-1 mb-4">
                            <li>✓ Up to 3 services</li>
                            <li>✓ Accept / reject requests</li>
                            <li>✓ Counter-offers</li>
                        </ul>
                        {!isPro && (
                            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">Current Plan</span>
                        )}
                    </div>

                    {/* Pro */}
                    <div className={`border-2 rounded-xl p-5 ${isPro ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}>
                        <h3 className="font-bold text-lg mb-1">Pro</h3>
                        <div className="text-3xl font-extrabold mb-1 text-blue-600">$29<span className="text-base font-medium text-gray-400">/mo</span></div>
                        <p className="text-gray-400 text-sm mb-3">10% platform fee per transaction</p>
                        <ul className="text-sm text-gray-600 space-y-1 mb-4">
                            <li>✓ Unlimited services</li>
                            <li>✓ Reduced 10% platform fee</li>
                            <li>✓ Priority listing</li>
                            <li>✓ Advanced analytics</li>
                        </ul>
                        {isPro ? (
                            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">Current Plan</span>
                        ) : (
                            <button
                                onClick={() => handleSubscribe("pro")}
                                disabled={actionLoading}
                                className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-sm"
                            >
                                {actionLoading ? "Loading..." : "Upgrade to Pro"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
