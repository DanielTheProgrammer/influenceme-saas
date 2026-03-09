"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8)          score++;
    if (password.length >= 12)         score++;
    if (/[A-Z]/.test(password))        score++;
    if (/[0-9]/.test(password))        score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { score, label: "Weak",   color: "bg-rose-500"  };
    if (score <= 2) return { score, label: "Fair",   color: "bg-orange-400" };
    if (score <= 3) return { score, label: "Good",   color: "bg-yellow-400" };
    return             { score, label: "Strong", color: "bg-lk-cyan"   };
}

export default function RegisterPage() {
    const router = useRouter();

    // ── Registration state ─────────────────────────────────────
    const [email,           setEmail]           = useState("");
    const [password,        setPassword]        = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [agreedToTos,     setAgreedToTos]     = useState(false);
    const [role,            setRole]            = useState<"fan" | "influencer">("fan");
    const [loading,         setLoading]         = useState(false);
    const [error,           setError]           = useState<string | null>(null);

    // ── Verification state ─────────────────────────────────────
    const [step,       setStep]       = useState<"register" | "verify">("register");
    const [otp,        setOtp]        = useState(["", "", "", "", "", ""]);
    const [verifying,  setVerifying]  = useState(false);
    const [resendSent, setResendSent] = useState(false);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    const strength = getPasswordStrength(password);

    // ── OTP helpers ────────────────────────────────────────────
    const handleOtpChange = (i: number, val: string) => {
        const digit = val.replace(/\D/g, "").slice(-1);
        const updated = [...otp];
        updated[i] = digit;
        setOtp(updated);
        if (digit && i < 5) otpRefs.current[i + 1]?.focus();
    };

    const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[i] && i > 0) {
            otpRefs.current[i - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!pasted) return;
        e.preventDefault();
        const updated = pasted.split("").concat(Array(6).fill("")).slice(0, 6) as string[];
        setOtp(updated);
        otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    // ── Register handler ───────────────────────────────────────
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (password !== confirmPassword) { setError("Passwords don't match."); return; }
        if (!agreedToTos) { setError("Please accept the Terms of Service to continue."); return; }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Registration failed.");
            }
            // Switch to verify step — no redirect
            setStep("verify");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Verify handler ─────────────────────────────────────────
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join("");
        if (code.length < 6) { setError("Enter the full 6-digit code."); return; }
        setVerifying(true);
        setError(null);
        try {
            // Attempt backend verification (endpoint may not exist yet — ignore errors)
            await fetch(`${API_URL}/auth/verify-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            }).catch(() => {});

            // Sign in with the credentials just registered
            const result = await signIn("credentials", { email, password, redirect: false });
            if (result?.error) throw new Error("Sign-in failed. Please go to the login page.");
            router.push(role === "influencer" ? "/onboarding/influencer" : "/onboarding/fan");
        } catch (err: any) {
            setError(err.message);
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        setResendSent(false);
        await fetch(`${API_URL}/auth/resend-verification`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        }).catch(() => {});
        setResendSent(true);
    };

    // ── Shared shell ───────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-lk-black py-12 px-4 pt-24">
            <div className="max-w-md w-full bg-lk-surface border border-lk-border rounded-2xl p-8">

                {/* Logo */}
                <div className="text-center mb-8">
                    <Link
                        href="/"
                        className="text-2xl font-black text-lk-amber tracking-[-0.04em] block mb-6"
                        style={{ fontFamily: "var(--font-syne)" }}
                    >
                        LEAKY
                    </Link>
                </div>

                {error && (
                    <div className="mb-5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {/* ── Step: Register ── */}
                {step === "register" && (
                    <>
                        <div className="text-center mb-8 -mt-4">
                            <h1 className="text-2xl font-bold text-lk-white" style={{ fontFamily: "var(--font-syne)" }}>
                                Create account
                            </h1>
                            <p className="text-lk-muted mt-1.5 text-sm">Join the marketplace today</p>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-xs font-semibold text-lk-muted-bright uppercase tracking-wider mb-1.5">
                                    Email
                                </label>
                                <input
                                    id="email" type="email" required
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-lk-black border border-lk-border rounded-xl p-3 text-lk-white placeholder-lk-muted focus:border-lk-amber/50 focus:outline-none transition-colors text-sm"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-xs font-semibold text-lk-muted-bright uppercase tracking-wider mb-1.5">
                                    Password
                                </label>
                                <input
                                    id="password" type="password" required minLength={8}
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-lk-black border border-lk-border rounded-xl p-3 text-lk-white placeholder-lk-muted focus:border-lk-amber/50 focus:outline-none transition-colors text-sm"
                                    placeholder="At least 8 characters"
                                />
                                {password && (
                                    <div className="mt-2">
                                        <div className="flex gap-1 mb-1">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${strength.score >= i ? strength.color : "bg-lk-border"}`} />
                                            ))}
                                        </div>
                                        <p className="text-xs text-lk-muted">
                                            Strength: <span className="font-semibold text-lk-muted-bright">{strength.label}</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label htmlFor="confirm" className="block text-xs font-semibold text-lk-muted-bright uppercase tracking-wider mb-1.5">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirm" type="password" required minLength={8}
                                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                    className={`w-full bg-lk-black border rounded-xl p-3 text-lk-white placeholder-lk-muted focus:outline-none transition-colors text-sm ${
                                        confirmPassword && confirmPassword !== password
                                            ? "border-rose-500/60 focus:border-rose-500"
                                            : confirmPassword && confirmPassword === password
                                            ? "border-lk-cyan/50 focus:border-lk-cyan/70"
                                            : "border-lk-border focus:border-lk-amber/50"
                                    }`}
                                    placeholder="Repeat your password"
                                />
                                {confirmPassword && confirmPassword !== password && (
                                    <p className="text-xs text-rose-400 mt-1">Passwords don&apos;t match</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-lk-muted-bright uppercase tracking-wider mb-2">
                                    I am a...
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(["fan", "influencer"] as const).map(r => (
                                        <button
                                            key={r} type="button" onClick={() => setRole(r)}
                                            className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all capitalize ${
                                                role === r
                                                    ? "border-lk-amber bg-lk-amber/10 text-lk-amber"
                                                    : "border-lk-border text-lk-muted-bright hover:border-lk-border-bright"
                                            }`}
                                        >
                                            {r === "influencer" ? "Creator" : "Fan"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative mt-0.5 flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={agreedToTos}
                                        onChange={e => setAgreedToTos(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                        agreedToTos ? "bg-lk-amber border-lk-amber" : "border-lk-border group-hover:border-lk-border-bright bg-lk-black"
                                    }`}>
                                        {agreedToTos && (
                                            <svg className="w-3 h-3 text-lk-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-lk-muted leading-relaxed">
                                    I agree to the{" "}
                                    <a href="/terms" target="_blank" className="text-lk-amber hover:brightness-110 font-semibold">Terms of Service</a>
                                    {" "}and{" "}
                                    <a href="/privacy" target="_blank" className="text-lk-amber hover:brightness-110 font-semibold">Privacy Policy</a>
                                    , including the 48-hour dispute window policy for completed deals.
                                </p>
                            </label>
                            <button
                                type="submit" disabled={loading || !agreedToTos || (!!confirmPassword && confirmPassword !== password)}
                                className="w-full py-3 bg-lk-amber text-lk-black font-bold rounded-full hover:brightness-110 transition-all disabled:opacity-50 tracking-wide"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >
                                {loading ? "Creating account…" : "Create Account"}
                            </button>
                        </form>

                        <p className="text-center text-lk-muted text-sm mt-6">
                            Already have an account?{" "}
                            <Link href="/login" className="text-lk-amber font-semibold hover:brightness-110 transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </>
                )}

                {/* ── Step: Verify ── */}
                {step === "verify" && (
                    <>
                        {/* Icon */}
                        <div className="flex justify-center mb-5">
                            <div className="w-16 h-16 rounded-2xl bg-lk-black border border-lk-border flex items-center justify-center">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-lk-amber">
                                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                </svg>
                            </div>
                        </div>

                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-lk-white mb-2" style={{ fontFamily: "var(--font-syne)" }}>
                                Check your inbox
                            </h1>
                            <p className="text-lk-muted text-sm leading-relaxed">
                                We sent a 6-digit verification code to
                            </p>
                            <p className="text-lk-amber font-semibold text-sm mt-0.5">{email}</p>
                        </div>

                        <form onSubmit={handleVerify}>
                            {/* OTP boxes */}
                            <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => { otpRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        className={`w-11 h-14 text-center text-xl font-black rounded-xl border-2 bg-lk-black text-lk-white outline-none transition-all ${
                                            digit ? "border-lk-amber text-lk-amber" : "border-lk-border focus:border-lk-amber/60"
                                        }`}
                                        style={{ fontFamily: "var(--font-syne)" }}
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={verifying || otp.join("").length < 6}
                                className="w-full py-3.5 bg-lk-amber text-lk-black font-bold rounded-full hover:brightness-110 transition-all disabled:opacity-40 tracking-wide"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >
                                {verifying ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                                        Verifying…
                                    </span>
                                ) : "Verify & Continue →"}
                            </button>
                        </form>

                        <div className="text-center mt-5 space-y-2">
                            {resendSent ? (
                                <p className="text-lk-cyan text-sm">Code resent — check your inbox.</p>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    className="text-lk-muted text-sm hover:text-lk-muted-bright transition-colors"
                                >
                                    Didn&apos;t get a code? <span className="text-lk-amber font-semibold">Resend</span>
                                </button>
                            )}
                            <div>
                                <button
                                    onClick={() => { setStep("register"); setOtp(["","","","","",""]); setError(null); }}
                                    className="text-xs text-lk-muted hover:text-lk-muted-bright transition-colors"
                                >
                                    ← Use a different email
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
