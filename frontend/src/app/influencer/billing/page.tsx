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

interface BankStatus {
    connected: boolean;
    payout_info: string | null;
    account_id: string | null;
}

const COUNTRIES = [
    { code: "FR", label: "France" },
    { code: "DE", label: "Germany" },
    { code: "GB", label: "United Kingdom" },
    { code: "ES", label: "Spain" },
    { code: "IT", label: "Italy" },
    { code: "NL", label: "Netherlands" },
    { code: "BE", label: "Belgium" },
    { code: "US", label: "United States" },
    { code: "CA", label: "Canada" },
    { code: "AU", label: "Australia" },
];

export default function InfluencerBillingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const token = (session as any)?.accessToken;

    const [earnings, setEarnings] = useState<Earnings | null>(null);
    const [bankStatus, setBankStatus] = useState<BankStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Bank form state
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dobDay, setDobDay] = useState("");
    const [dobMonth, setDobMonth] = useState("");
    const [dobYear, setDobYear] = useState("");
    const [addressLine1, setAddressLine1] = useState("");
    const [city, setCity] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [country, setCountry] = useState("FR");
    const [iban, setIban] = useState("");
    const [accountHolderName, setAccountHolderName] = useState("");
    const [currency, setCurrency] = useState("eur");

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login?redirect=/influencer/billing");
    }, [status, router]);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            fetch(`${API_URL}/influencer/earnings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
            fetch(`${API_URL}/influencer/stripe/bank-status`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
        ]).then(([e, b]) => {
            if (e) setEarnings(e);
            if (b) setBankStatus(b);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [token]);

    const handleConnectBank = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/influencer/stripe/connect-bank`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    dob_day: parseInt(dobDay),
                    dob_month: parseInt(dobMonth),
                    dob_year: parseInt(dobYear),
                    address_line1: addressLine1,
                    city,
                    postal_code: postalCode,
                    country,
                    iban: iban.replace(/\s/g, ""),
                    account_holder_name: accountHolderName,
                    currency,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Failed to connect bank.");
            setSaved(true);
            setShowForm(false);
            setBankStatus({ connected: true, payout_info: data.payout_info || `${accountHolderName} | ${iban.slice(0, 8)}•••`, account_id: data.account_id });
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
                <div className="animate-pulse h-60 bg-lk-surface rounded-2xl" />
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    const inputCls = "w-full bg-lk-black border border-lk-border text-lk-white placeholder:text-lk-muted rounded-xl px-4 py-3 text-sm focus:border-lk-amber outline-none transition-colors";
    const labelCls = "block text-[11px] font-semibold text-lk-muted uppercase tracking-widest mb-1.5";

    return (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <Link href="/dashboard" className="text-lk-muted hover:text-lk-white text-sm transition-colors">← Back</Link>
            </div>

            <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-1">Earnings</p>
                <h1 className="text-2xl font-black text-lk-white tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>
                    Billing & Payouts
                </h1>
            </div>

            {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm">{error}</div>}
            {saved && <div className="p-3 bg-lk-cyan/10 border border-lk-cyan/30 text-lk-cyan rounded-xl text-sm">Bank account connected — payouts will transfer automatically.</div>}

            {/* Earnings */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-lk-surface border border-lk-border rounded-2xl p-5">
                    <p className="text-xs font-semibold text-lk-muted uppercase tracking-widest mb-2">Pending Payout</p>
                    <p className="text-3xl font-black text-lk-amber" style={{ fontFamily: "var(--font-syne)" }}>
                        ${(earnings?.earnings_balance ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-lk-muted mt-1">Clears after next deal completes</p>
                </div>
                <div className="bg-lk-surface border border-lk-border rounded-2xl p-5">
                    <p className="text-xs font-semibold text-lk-muted uppercase tracking-widest mb-2">Lifetime Earned</p>
                    <p className="text-3xl font-black text-lk-cyan" style={{ fontFamily: "var(--font-syne)" }}>
                        ${(earnings?.total_earned ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-lk-muted mt-1">After {earnings?.platform_fee_percent ?? 20}% platform fee</p>
                </div>
            </div>

            {/* Bank connection */}
            <div className={`bg-lk-surface border rounded-2xl p-6 ${bankStatus?.connected ? "border-lk-cyan/30" : "border-lk-border"}`}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="font-bold text-lk-white">Payout Bank Account</p>
                        <p className="text-xs text-lk-muted mt-0.5">
                            {bankStatus?.connected
                                ? "Payouts transfer automatically when deals complete."
                                : "Add your bank account to receive automatic payouts."}
                        </p>
                    </div>
                    {bankStatus?.connected && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-lk-cyan/15 text-lk-cyan border border-lk-cyan/30 flex-shrink-0">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>
                            Connected
                        </span>
                    )}
                </div>

                {bankStatus?.connected && bankStatus.payout_info && (
                    <div className="bg-lk-black rounded-xl px-4 py-3 text-sm text-lk-muted-bright font-mono mb-4">
                        {bankStatus.payout_info}
                    </div>
                )}

                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-5 py-2.5 bg-lk-amber text-lk-black font-bold rounded-full text-sm hover:brightness-110 transition-all"
                        style={{ fontFamily: "var(--font-syne)" }}
                    >
                        {bankStatus?.connected ? "Update Bank Account" : "Connect Bank Account →"}
                    </button>
                )}

                {showForm && (
                    <form onSubmit={handleConnectBank} className="space-y-4 mt-4 border-t border-lk-border pt-4">
                        <p className="text-xs text-lk-muted leading-relaxed">
                            Required by our payment processor to verify your identity and send funds directly to your bank. Your data is encrypted and never stored on our servers.
                        </p>

                        {/* Name */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>First Name</label>
                                <input required className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" />
                            </div>
                            <div>
                                <label className={labelCls}>Last Name</label>
                                <input required className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" />
                            </div>
                        </div>

                        {/* DOB */}
                        <div>
                            <label className={labelCls}>Date of Birth</label>
                            <div className="grid grid-cols-3 gap-2">
                                <input required className={inputCls} value={dobDay} onChange={e => setDobDay(e.target.value)} placeholder="Day" maxLength={2} inputMode="numeric" />
                                <input required className={inputCls} value={dobMonth} onChange={e => setDobMonth(e.target.value)} placeholder="Month" maxLength={2} inputMode="numeric" />
                                <input required className={inputCls} value={dobYear} onChange={e => setDobYear(e.target.value)} placeholder="Year" maxLength={4} inputMode="numeric" />
                            </div>
                        </div>

                        {/* Country */}
                        <div>
                            <label className={labelCls}>Country</label>
                            <select
                                className={inputCls}
                                value={country}
                                onChange={e => {
                                    setCountry(e.target.value);
                                    setCurrency(e.target.value === "US" ? "usd" : e.target.value === "GB" ? "gbp" : "eur");
                                }}
                            >
                                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                            </select>
                        </div>

                        {/* Address */}
                        <div>
                            <label className={labelCls}>Street Address</label>
                            <input required className={inputCls} value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="123 Rue de la Paix" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>City</label>
                                <input required className={inputCls} value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" />
                            </div>
                            <div>
                                <label className={labelCls}>Postal Code</label>
                                <input required className={inputCls} value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="75001" />
                            </div>
                        </div>

                        {/* IBAN */}
                        <div>
                            <label className={labelCls}>IBAN / Account Number</label>
                            <input
                                required
                                className={`${inputCls} font-mono tracking-wider`}
                                value={iban}
                                onChange={e => setIban(e.target.value.toUpperCase())}
                                placeholder="FR76 3000 6000 0112 3456 7890 189"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Account Holder Name</label>
                            <input required className={inputCls} value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} placeholder="Jean Dupont" />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setError(null); }}
                                className="flex-1 py-3 border border-lk-border text-lk-muted rounded-full text-sm font-bold hover:border-lk-border-bright transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-3 bg-lk-amber text-lk-black font-bold rounded-full text-sm hover:brightness-110 disabled:opacity-50 transition-all"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >
                                {saving ? "Connecting…" : "Save & Connect →"}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* How it works */}
            <div className="bg-lk-black border border-lk-border rounded-2xl p-5 text-sm text-lk-muted space-y-2">
                <p className="font-semibold text-lk-white text-sm">How payouts work</p>
                <p>When a fan confirms a deal is done (or 48h passes), your cut transfers automatically to your bank account. No waiting, no manual requests.</p>
                <p>First transfer may take 1-3 business days. After that, usually same or next business day.</p>
            </div>
        </div>
    );
}
